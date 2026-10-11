export type ActionState = { error?: string; ok?: string } | undefined;

export function fail(error: string): ActionState {
  return { error };
}

export function str(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}
