// What a brand-new teamspace starts life with.
//
// Before this, creating a teamspace inserted exactly two rows — the teamspace
// and its owner — so a new org was an empty room: no folders, and skills_list
// returned nothing. Skills are hard-scoped by teamspace (UNIQUE(teamspace_id,
// name), and every read binds teamspace_id), so nothing carries over from your
// personal teamspace by default. That is the correct isolation, but it makes
// "I made a team and my assistant lost all its skills" the default experience.
//
// Two ways to fill the room, and the caller picks:
//   - copy the skills from a teamspace you already belong to, or
//   - seed one starter skill that explains what the registry is for.
//
// Bootstrapping is BEST-EFFORT by design. A teamspace that exists with no
// starter content is a minor annoyance; a create request that 500s after the
// teamspace row is already committed leaves the user with an org they cannot
// see and will try to create again. So every step here swallows its own
// failure and reports what actually landed.

import { nanoid } from "nanoid";
import {
  getSkill,
  listSkills,
  putSkill,
  type SkillBindings,
} from "@/lib/skills/store-core";

// Named so it reads as a place to put work in progress, not a status.
export const STARTER_FOLDER = "Drafts";

export const STARTER_SKILL_NAME = "house-style";

const STARTER_SKILL_DESCRIPTION =
  "How this team wants documents written and published. Read before drafting anything that will be shared.";

// Deliberately a template with the blanks visible rather than opinions we
// invented: a seeded skill full of confident advice nobody wrote would get
// followed by agents and blamed on the team.
const STARTER_SKILL_BODY = `# House style

This skill was created automatically when the teamspace was made. Edit it —
it is a starting point, not a rule set anyone here agreed to.

Anything written here is read by AI assistants connected to this teamspace
before they draft or publish on your behalf.

## Voice

- Replace this with how your team actually writes.
- Say what to do, not only what to avoid.

## Publishing

- Default visibility for shared documents: _decide and write it here_.
- Who should be able to comment: _decide and write it here_.

## What not to publish here

- Say plainly what must never leave your systems: credentials, customer data,
  anything under NDA.

## Editing this skill

Ask a connected assistant to update \`${STARTER_SKILL_NAME}\`, or edit it from
the teamspace's Skills page. Every change keeps a version and records who made
it.
`;

export interface BootstrapResult {
  folderCreated: boolean;
  skillsCopied: number;
  starterSkillCreated: boolean;
  // Non-fatal problems worth surfacing rather than hiding.
  warnings: string[];
}

export interface BootstrapOptions {
  // A teamspace id to copy skills from. The CALLER MUST have already verified
  // that the acting user is a member of it — this module does no membership
  // check, and passing an unverified id here would read another org's skills.
  copySkillsFrom?: string | null;
}

export async function bootstrapTeamspace(
  b: SkillBindings,
  teamspaceId: string,
  userId: string,
  opts: BootstrapOptions = {},
): Promise<BootstrapResult> {
  const result: BootstrapResult = {
    folderCreated: false,
    skillsCopied: 0,
    starterSkillCreated: false,
    warnings: [],
  };

  // Inserted through the passed binding rather than lib/teamspace/folders,
  // which resolves its D1 handle from the global OpenNext env(). Everything
  // this module touches goes through `b`, so it stays importable outside a
  // request context and testable with an in-memory fake.
  try {
    const now = Date.now();
    await b.DB.prepare(
      `INSERT INTO folders (id, teamspace_id, parent_id, name, created_by, created_at, updated_at)
       VALUES (?, ?, NULL, ?, ?, ?, ?)`,
    )
      .bind(`f_${nanoid(16)}`, teamspaceId, STARTER_FOLDER, userId, now, now)
      .run();
    result.folderCreated = true;
  } catch {
    result.warnings.push("Could not create the starter folder.");
  }

  if (opts.copySkillsFrom) {
    result.skillsCopied = await copySkills(
      b,
      opts.copySkillsFrom,
      teamspaceId,
      userId,
      result.warnings,
    );
    // Only fall back to the starter skill if the copy produced nothing at all —
    // otherwise a team that deliberately copied two skills also gets a
    // placeholder telling them to write some.
    if (result.skillsCopied > 0) return result;
  }

  try {
    await putSkill(b, teamspaceId, userId, {
      name: STARTER_SKILL_NAME,
      description: STARTER_SKILL_DESCRIPTION,
      body: STARTER_SKILL_BODY,
      changelog: "Created with the teamspace.",
    });
    result.starterSkillCreated = true;
  } catch {
    result.warnings.push("Could not create the starter skill.");
  }

  return result;
}

// Copies the CURRENT version of each skill, not its history.
//
// Version numbering restarts at 1 in the destination on purpose: the new
// teamspace's audit trail is its own, and `created_by` on every copied version
// is the person who made the teamspace — because that is who is responsible for
// these instructions being here. Carrying the original author across would
// attribute the copy to someone who never chose to put it in this org.
async function copySkills(
  b: SkillBindings,
  sourceTeamspaceId: string,
  targetTeamspaceId: string,
  userId: string,
  warnings: string[],
): Promise<number> {
  let source;
  try {
    source = await listSkills(b, sourceTeamspaceId, undefined, 200);
  } catch {
    warnings.push("Could not read the skills to copy.");
    return 0;
  }

  let copied = 0;
  for (const skill of source) {
    try {
      const full = await getSkill(b, sourceTeamspaceId, skill.name);
      if (!full || !full.body.trim()) continue;
      await putSkill(b, targetTeamspaceId, userId, {
        name: skill.name,
        description: skill.description,
        body: full.body,
        tags: skill.tags ? (JSON.parse(skill.tags) as string[]) : null,
        changelog: "Copied when this teamspace was created.",
      });
      copied++;
    } catch {
      // One unreadable skill must not abort the rest of the copy.
      warnings.push(`Could not copy the skill "${skill.name}".`);
    }
  }
  return copied;
}
