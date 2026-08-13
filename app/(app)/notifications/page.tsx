// /notifications — where @mentions land.
//
// The shell is a server component so it can gate on the session like its
// siblings; the feed itself is a client island (./notifications-list) because
// marking-read is an action taken in the browser, not a render input.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { NotificationsList } from "./notifications-list";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notifications — ilolink",
  robots: { index: false, follow: false },
};

export default async function NotificationsPage() {
  const user = await currentUser();
  if (!user) redirect("/signin?next=%2Fnotifications");

  return (
    <div className="mx-auto w-full max-w-[1160px]">
      <div className="pb-5">
        <h1 className="ml-[-0.058em] text-[clamp(32px,3.6vw,44px)] leading-none text-ink">
          Notifications
        </h1>
      </div>
      <NotificationsList />
    </div>
  );
}
