// Back-compat shim. The registry now stores ten artifact kinds, not just
// skills — see lib/artifacts/store-core.ts, which is where the logic lives.
//
// This file survives as a pure re-export bound to kind='skill' so the MCP
// `skills_*` tools, the plugin bundle, and the existing browser pages keep
// working unchanged. It holds NO logic of its own; there is nothing here that
// can drift from the real store.

import {
  archiveArtifact,
  getArtifact,
  listArtifacts,
  provenancePreamble as artifactPreamble,
  putArtifact,
  type ArtifactBindings,
  type ArtifactRow,
  type ArtifactWithBody,
  type PutArtifactResult,
} from "@/lib/artifacts/store-core";

export {
  ArtifactError as SkillError,
  isValidArtifactName as isValidSkillName,
  MAX_ARTIFACT_BYTES as MAX_SKILL_BYTES,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from "@/lib/artifacts/store-core";

export type SkillBindings = ArtifactBindings;
export type SkillRow = ArtifactRow;
export type SkillWithBody = ArtifactWithBody;

export interface PutSkillInput {
  name: string;
  description: string;
  body: string;
  changelog?: string | null;
  tags?: string[] | null;
  ifVersion?: number | null;
  // REQUIRED, and required on purpose.
  //
  // This used to be hardcoded `true` here, which made the whole review step
  // bypassable by calling the older `skills_put` tool instead of
  // `artifacts_put` — both write to the same store, so a gate on only one of
  // them was decoration. Callers must pass the answer from
  // canPublishArtifact(role, teamspace.review_member_writes).
  publish: boolean;
}

export type PutSkillResult = PutArtifactResult;

export function listSkills(
  b: SkillBindings,
  teamspaceId: string,
  query?: string,
  limit = 50,
  publishedOnly = false,
): Promise<ArtifactRow[]> {
  return listArtifacts(b, teamspaceId, { kind: "skill", query, limit, publishedOnly });
}

export function getSkill(
  b: SkillBindings,
  teamspaceId: string,
  name: string,
  version?: number,
): Promise<SkillWithBody | null> {
  return getArtifact(b, teamspaceId, "skill", name, version);
}

export function putSkill(
  b: SkillBindings,
  teamspaceId: string,
  userId: string,
  input: PutSkillInput,
): Promise<PutSkillResult> {
  return putArtifact(b, teamspaceId, userId, { ...input, kind: "skill" });
}

export function archiveSkill(
  b: SkillBindings,
  teamspaceId: string,
  name: string,
): Promise<boolean> {
  return archiveArtifact(b, teamspaceId, "skill", name);
}

export function provenancePreamble(
  name: string,
  teamspaceName: string,
  authorEmail: string | null,
  version: number,
  updatedAt: number,
): string {
  return artifactPreamble(
    "skill",
    name,
    teamspaceName,
    authorEmail,
    version,
    updatedAt,
  );
}
