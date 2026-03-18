import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionId, getSessionUser, isAdmin } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  if (!sessionCookie) {
    redirect("/");
  }

  const sessionId = verifySessionId(sessionCookie);
  if (!sessionId) {
    redirect("/");
  }

  const user = await getSessionUser(sessionId);
  if (!user) {
    redirect("/");
  }

  if (
    user.subscription_status !== "active" &&
    user.subscription_status !== "trialing" &&
    !isAdmin(user.email)
  ) {
    redirect("/");
  }

  return <AppShell>{children}</AppShell>;
}
