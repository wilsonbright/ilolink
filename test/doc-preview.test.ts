// Pins what a link preview may reveal, per visibility tier.
//
// This is a policy, not an algorithm — the value of the test is that each tier's
// answer is written down, so changing one is a visible decision rather than a
// side effect of editing a ternary in the worker.
import { describe, expect, it } from "vitest";
import type { Visibility } from "@/lib/types";
import {
  GENERIC_PREVIEW_DESCRIPTION,
  GENERIC_PREVIEW_TITLE,
  mayQuoteBody,
  mayShowTitle,
} from "@/lib/seo/doc-preview";

const ALL_TIERS: Visibility[] = ["public", "unlisted", "password", "expiring"];

describe("mayQuoteBody", () => {
  it("quotes the body for public documents only", () => {
    expect(ALL_TIERS.filter(mayQuoteBody)).toEqual(["public"]);
  });

  it("refuses the tiers whose content outlives or hides behind the link", () => {
    // expiring: an unfurl cache does not expire when the document does.
    // password: the unfurler never had the password.
    // unlisted: nobody chose to quote 180 characters of the body in a channel.
    expect(mayQuoteBody("expiring")).toBe(false);
    expect(mayQuoteBody("password")).toBe(false);
    expect(mayQuoteBody("unlisted")).toBe(false);
  });
});

describe("mayShowTitle", () => {
  it("keeps a title for public and unlisted, drops it for password and expiring", () => {
    // Unlisted deliberately keeps its title: the link IS the audience, and a
    // card reading "A document shared on ilolink" would read as broken in the
    // ordinary paste-into-Slack flow. If this ever needs tightening, this is the
    // line that says so.
    expect(ALL_TIERS.filter(mayShowTitle)).toEqual(["public", "unlisted"]);
  });

  it("is never stricter than the body rule", () => {
    // A tier that may quote the body but not show its title would be incoherent.
    for (const tier of ALL_TIERS) {
      if (mayQuoteBody(tier)) expect(mayShowTitle(tier)).toBe(true);
    }
  });
});

describe("the generic replacements", () => {
  it("do not hint that something was withheld", () => {
    // Deliberately the same fallback the worker already served for documents
    // with no derivable description, so a suppressed card is indistinguishable
    // from an ordinary one rather than an invitation to go looking.
    expect(GENERIC_PREVIEW_DESCRIPTION).not.toMatch(
      /private|hidden|unlisted|protected|password|restricted/i,
    );
    expect(GENERIC_PREVIEW_TITLE).not.toMatch(
      /private|hidden|unlisted|protected|password|restricted/i,
    );
  });

  it("are non-empty, so a card never renders blank", () => {
    expect(GENERIC_PREVIEW_TITLE.trim().length).toBeGreaterThan(0);
    expect(GENERIC_PREVIEW_DESCRIPTION.trim().length).toBeGreaterThan(0);
  });
});
