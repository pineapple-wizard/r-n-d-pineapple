export function getSupabaseEnv() {
  const url = process.env.PROJECT_URL;
  const key = process.env.PROJECT_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing PROJECT_URL or PROJECT_PUBLISHABLE_KEY in .env",
    );
  }

  return { url, key };
}
