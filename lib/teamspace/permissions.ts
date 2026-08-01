// Who may do what to a document. Pure — every input is a fact the caller has
// already fetched, so the whole permission matrix is unit-testable with no
// Cloudflare bindings.
//
// This is deliberately THE ONLY place that answers the question. Before
// teamspaces, ownership was checked ad hoc in seven API routes plus three
// mcp-worker queries, each re-deriving "is this mine?" from either a manage
// token or a workspace id. Adding a third model (teamspaces) to nine call
// sites would leave forked logic nobody could ever finish deleting.

export type TeamRole = "owner" | "member";
export type ShareRole = "viewer" | "commenter" | "editor";

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

  if (membership === "owner") return { ...FULL };

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
  return role === "owner";
}

export function canRemoveMember(
  actorRole: TeamRole | null,
  actorUserId: string,
  targetUserId: string,
): boolean {
  // Owners remove anyone; anyone may remove themselves (leave).
  if (actorRole === "owner") return true;
  return actorRole === "member" && actorUserId === targetUserId;
}

export function canPublishInto(role: TeamRole | null): boolean {
  return role === "owner" || role === "member";
}
