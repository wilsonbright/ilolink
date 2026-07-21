import { nanoid } from "nanoid";
import { queryFirst, execute } from "@/lib/db/client";
import type { User } from "@/lib/types";

// Look up a creator by email; null if none.
export function findUserByEmail(email: string): Promise<User | null> {
  return queryFirst<User>("SELECT * FROM users WHERE email = ?", email);
}

// Insert a new creator and return the row.
export async function createUser(
  email: string,
  name?: string,
): Promise<User> {
  const user: User = {
    id: nanoid(),
    email,
    name: name ?? null,
    created_at: Date.now(),
  };
  await execute(
    "INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)",
    user.id,
    user.email,
    user.name,
    user.created_at,
  );
  return user;
}

// Idempotent by email: return the existing creator or create one.
export async function getOrCreateUser(
  email: string,
  name?: string,
): Promise<User> {
  const existing = await findUserByEmail(email);
  if (existing) return existing;
  return createUser(email, name);
}
