/**
 * Standard slugify function to create SEO-friendly URLs from strings.
 * Handles accents, special characters, and multiple spaces.
 * 
 * Example: "Design & Intérieur" -> "design-interieur"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')                   // split accented characters into their base characters and diacritical marks
    .replace(/[\u0300-\u036f]/g, '')    // remove all the accents
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')               // replace spaces with -
    .replace(/[^\w-]+/g, '')             // remove all non-word chars
    .replace(/--+/g, '-');              // replace multiple - with single -
}
