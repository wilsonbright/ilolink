// App shell for the signed-in creator surface. Nests inside the root layout,
// so no <html>/<body> here — just a quiet header over the routed content.
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, destroySession } from "@/lib/auth/session";

// Server action: drop the KV session and clear the cookie, then bounce to signin.
async function signOut(): Promise<void> {
  "use server";
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await destroySession(token);
  jar.delete(SESSION_COOKIE);
  redirect("/signin");
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium tracking-wide text-accent transition-colors duration-150"
          >
            ilolink
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-ink-faint transition-colors duration-150 hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">{children}</main>
    </div>
  );
}
