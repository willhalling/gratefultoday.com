import { getNewsletterGifUrl } from "./newsletterVideo";

export async function findNewsletterGifUrl(
  date: string,
): Promise<string | null> {
  const url = getNewsletterGifUrl(date);
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok ? url : null;
  } catch {
    return null;
  }
}
