import { DurableObject } from "cloudflare:workers";

// Exact per-doc view counter (spec §Phase 4 / §5.2). Analytics Engine counts are
// exact at low volume but sampled at high volume; this Durable Object gives an
// always-exact headline "views" number. One instance per doc (idFromName(docId)).
// Increments are atomic (single-threaded per instance) — no read-then-write race.
export class ViewCounter extends DurableObject {
  async increment(): Promise<number> {
    const n = ((await this.ctx.storage.get<number>("n")) ?? 0) + 1;
    await this.ctx.storage.put("n", n);
    return n;
  }

  async get(): Promise<number> {
    return (await this.ctx.storage.get<number>("n")) ?? 0;
  }
}
