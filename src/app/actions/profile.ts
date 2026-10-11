"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { deletePrivateFile, savePrivateFile, UploadError } from "@/lib/storage";
import { fail, str, type ActionState } from "@/lib/action-state";

const profileSchema = z.object({
  name: z.string().min(2, "Enter your name.").max(80),
  faculty: z.string().max(80),
  bio: z.string().max(400, "Keep your bio under 400 characters."),
  availability: z.string().max(200),
  skills: z.string().max(300),
});

export async function updateProfile(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/profile/edit");
  const parsed = profileSchema.safeParse({
    name: str(form, "name"),
    faculty: str(form, "faculty"),
    bio: str(form, "bio"),
    availability: str(form, "availability"),
    skills: str(form, "skills"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const skills = Array.from(
    new Set(
      parsed.data.skills
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  )
    .slice(0, 12)
    .join(",");

  let photoUrl = user.photoUrl;
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (!photo.type.startsWith("image/")) return fail("Profile photo must be an image.");
    try {
      const key = await savePrivateFile("avatars", photo);
      if (user.photoUrl?.startsWith("/media/")) await deletePrivateFile(user.photoUrl.replace("/media/", ""));
      photoUrl = `/media/${key}`;
    } catch (err) {
      if (err instanceof UploadError) return fail(err.message);
      throw err;
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      faculty: parsed.data.faculty || null,
      bio: parsed.data.bio || null,
      availability: parsed.data.availability || null,
      skills,
      photoUrl,
    },
  });
  revalidatePath("/", "layout");
  return { ok: "Profile saved." };
}
