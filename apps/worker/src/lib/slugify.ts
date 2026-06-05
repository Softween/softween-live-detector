const TR_MAP: Record<string, string> = {
  ç: "c", Ç: "c",
  ğ: "g", Ğ: "g",
  ı: "i", İ: "i",
  ö: "o", Ö: "o",
  ş: "s", Ş: "s",
  ü: "u", Ü: "u",
};

/**
 * URL-safe slug from Turkish or English text.
 * Replaces Turkish characters, lowercases, strips non-alphanumeric, trims to maxLength.
 */
export function slugify(text: string, maxLength = 80): string {
  let slug = text.toLowerCase();
  for (const [from, to] of Object.entries(TR_MAP)) {
    slug = slug.split(from).join(to);
  }
  return slug
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLength);
}
