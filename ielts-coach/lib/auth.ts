export const AUTH_COOKIE = "ielts_auth";

/** SHA-256 of the password (Web Crypto works in both edge middleware and Node). */
export async function tokenFor(password: string): Promise<string> {
  const data = new TextEncoder().encode(`ielts-coach:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
