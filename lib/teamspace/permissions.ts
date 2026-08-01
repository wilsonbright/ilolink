// Who may do what to a document. Pure — every input is a fact the caller has
// already fetched, so the whole permission matrix is unit-testable with no
// Cloudflare bindings.
//
// This is deliberately THE ONLY place that answers the question. Before
// teamspaces, ownership was checked ad hoc in seven API routes plus three
// mcp-worker queries, each re-deriving "is this mine?" from either a manage
// token or a workspace id. Adding a third model (teamspaces) to nine call
// sites would leave forked logic nobody could ever finish deleting.

// Three roles. 'admin' was added when the artifact registry gained a review
// step: members PROPOSE changes to the instructions other people's agents
// execute, and someone has to be able to approve them. Without a role between
// owner and member, every proposal would be self-approved and the review step
// would be ceremony.
//
//   owner  — everything, including deleting the teamspace and making owners
//   admin  — invite, remove members, approve proposals, manage folders
//   member — create and propose; comment; delete what they created
//
// SQLite cannot add a CHECK by ALTER, so this union is the only guard on the
// column — exactly as it always was for owner/member.
export type TeamRole = "owner" | "admin" | "member";
export type ShareRole = "viewer" | "commenter" | "editor";

// Rank, so comparisons read as "at least an admin" rather than a growing list
// of string equality checks that someone will forget to widen next time.
const RANK: Record<TeamRole, number> = { owner: 3, admin: 2, member: 1 };

export function atLeast(role: TeamRole | null, min: TeamRole): boolean {
  if (!role) return false;
  return RANK[role] >= RANK[min];
}

export interface DocFacts {
  teamspaceId: string | null;
  createdBy: string | null;
}

export interface AccessInput {
  userId: string | null;
  doc: DocFacts;
  // The user's role in doc.teamspaceId, or null if they are not a member.
  membership: TeamRole | null;
  // A direct share/assignment on this document, if any.
  share: ShareRole | null;
  // TRANSITION ONLY: the caller presented a valid pre-accounts manage token.
  // Deleted in Phase 9 along with lib/manage-token.ts.
  legacyManageToken?: boolean;
}

export interface DocCapabilities {
  // Private owner surfaces: analytics, heatmaps, reader notes, raw HTML.
  canRead: boolean;
  canComment: boolean;
  canEdit: boolean;
  canDelete: boolean;
  // Share, assign, and revoke access.
  canManageShares: boolean;
  // Hide/flag comments on this document.
  canModerate: boolean;
}

const NONE: DocCapabilities = {
  canRead: false,
  canComment: false,
  canEdit: false,
  canDelete: false,
  canManageShares: false,
  canModerate: false,
};

const FULL: DocCapabilities = {
  canRead: true,
  canComment: true,
  canEdit: true,
  canDelete: true,
  canManageShares: true,
  canModerate: true,
};

export function resolveDocAccess(input: AccessInput): DocCapabilities {
  // Legacy first: a valid manage token is the only proof of ownership that
  // pre-accounts publishers have, and it must keep working until Phase 9 or we
  // strand every document published from a browser we can't identify.
  if (input.legacyManageToken) return { ...FULL };

  const { userId, doc, membership, share } = input;
  if (!userId) return { ...NONE };

  // An admin has full authority over the teamspace's documents. The line
  // between admin and owner is drawn at the teamspace itself — renaming it,
  // deleting it, and making other owners — not at its contents.
  if (membership === "owner" || membership === "admin") return { ...FULL };

  if (membership === "member") {
    return {
      canRead: true,
      canComment: true,
      canEdit: true,
      // A member may delete only what they created. Deletion is irreversible
      // (deleteDocumentCascade drops the R2 bodies), so the blast radius of one
      // compromised member account stays bounded.
      canDelete: doc.createdBy != null && doc.createdBy === userId,
      canManageShares: false,
      canModerate: true,
    };
  }

  // Not a member — a direct share is the only remaining route in.
  switch (share) {
    case "editor":
      return {
        canRead: true,
        canComment: true,
        canEdit: true,
        canDelete: false,
        canManageShares: false,
        canModerate: false,
      };
    case "commenter":
      return { ...NONE, canRead: true, canComment: true };
    case "viewer":
      return { ...NONE, canRead: true };
    default:
      return { ...NONE };
  }
}

// Teamspace-level actions, separate from any document.
export function canInvite(role: TeamRole | null): boolean {
  return atLeast(role, "admin");
}

export function canRemoveMember(
  actorRole: TeamRole | null,
  actorUserId: string,
  targetUserId: string,
  // The target's role. An admin must not be able to remove an owner — without
  // this, "admin" would be a quiet path to taking over the teamspace.
  targetRole: TeamRole | null = null,
): boolean {
  // Must actually be in the teamspace first: a non-member has nothing to leave,
  // and returning true for them would let an unrelated caller's "remove myself"
  // reach the delete path.
  if (!actorRole) return false;
  // Anyone may remove themselves (leave), whatever their role.
  if (actorUserId === targetUserId) return true;
  if (actorRole === "owner") return true;
  // An admin may not remove an owner — otherwise "admin" is a quiet path to
  // taking over the teamspace.
  if (actorRole === "admin") return targetRole !== "owner";
  return false;
}

export function canPublishInto(role: TeamRole | null): boolean {
  return atLeast(role, "member");
}

// ── Roles ───────────────────────────────────────────────────────────────────

// Only an owner changes roles, and only an owner can mint another owner.
// An admin promoting someone to owner would be the same takeover path as
// removing one.
// Demoting yourself is permitted here and refused by the last-owner check at
// the route, which is the only place that can count the remaining owners.
export function canChangeRole(actorRole: TeamRole | null): boolean {
  return actorRole === "owner";
}

// Renaming, archiving, or otherwise altering the teamspace itself.
export function canManageTeamspace(role: TeamRole | null): boolean {
  return role === "owner";
}

// Create, rename and archive folders. This wires the `ownerOnly` branch of
// guardTeamspace that has existed unused since folders shipped — until now any
// member could delete a teamspace's folder structure.
export function canManageFolders(role: TeamRole | null): boolean {
  return atLeast(role, "admin");
}

// ── Artifact registry ───────────────────────────────────────────────────────

// Everyone in the teamspace may write. Whether that write goes live or becomes
// a proposal is canPublishArtifact's job, not this one.
export function canWriteArtifact(role: TeamRole | null): boolean {
  return atLeast(role, "member");
}

// Whether this role's write lands as `published` immediately, or as `proposed`
// awaiting review.
//
// This is the rule that makes the registry safe to open up: an artifact is
// instructions every teammate's agent will later read and act on, so a member
// pushing from a repo produces a proposal, not team policy. Teams that do not
// want the ceremony turn it off per teamspace (teamspaces.review_member_writes).
export function canPublishArtifact(
  role: TeamRole | null,
  reviewMemberWrites: boolean,
): boolean {
  if (atLeast(role, "admin")) return true;
  return role === "member" && !reviewMemberWrites;
}

// Approve or reject someone else's proposal.
export function canReviewArtifact(role: TeamRole | null): boolean {
  return atLeast(role, "admin");
}

// Archiving hides an artifact from every agent in the teamspace, so it is a
// destructive act on shared state. Bounded the same way document deletion is
// (resolveDocAccess): admins and owners may archive anything, a member only
// what they created. Otherwise one member could silently disable the team's
// whole registry.
export function canArchiveArtifact(
  role: TeamRole | null,
  createdBy: string | null,
  userId: string,
): boolean {
  if (atLeast(role, "admin")) return true;
  return role === "member" && createdBy != null && createdBy === userId;
}

// Unarchiving is NOT the mirror of archiving. An admin archives an artifact
// precisely when it is wrong or malicious, so letting the member who wrote it
// put it back would undo the only remedy an admin has.
export function canUnarchiveArtifact(role: TeamRole | null): boolean {
  return atLeast(role, "admin");
}
