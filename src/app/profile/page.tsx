import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export default async function MyProfile() {
  const user = await requireUser("/profile");
  redirect(`/profile/${user.id}`);
}
