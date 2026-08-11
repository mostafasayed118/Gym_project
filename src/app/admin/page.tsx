import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function AdminPage() {
  await auth.protect();
  redirect("/admin/dashboard");
}
