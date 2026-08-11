import { requireRole, getUserProfile } from "@/lib/auth-server";
import { AdminHeader } from "./admin-header";
import { SidebarNav } from "@/components/sidebar-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Closes BUG-072: previously `<SidebarNav />` was rendered without the
  // `user` prop in the admin layout, so admin users saw the user-role
  // sidebar (no Admin link, no Coach Hub). Passing `user` lets the nav
  // surface the role-scoped items the requireRole call already verified.
  const { session, role } = await requireRole(["admin"]);
  const user = await getUserProfile(session.userId);

  return (
    <div className="flex min-h-screen flex-col bg-[#111508]">
      <SidebarNav
        user={
          user
            ? {
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl,
                role,
              }
            : null
        }
      />
      <AdminHeader />

      <main className="flex-1 md:pl-[240px]">{children}</main>
    </div>
  );
}
