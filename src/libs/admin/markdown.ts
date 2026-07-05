/**
 * Markdown utilities — frontmatter parser/generator, slug/filename generation
 */

export interface Frontmatter {
    [key: string]: string | boolean | number;
}

export interface ParsedMarkdown {
    frontmatter: Frontmatter;
    content: string;
}

/**
 * Parse YAML frontmatter from a markdown string
 */
export function parseFrontmatter(markdown: string): ParsedMarkdown {
    const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    if (!match) {
        return { frontmatter: {}, content: markdown };
    }

    const frontmatter: Frontmatter = {};
    const lines = match[1].trim().split("\n");

    for (const line of lines) {
        const colonIndex = line.indexOf(":");
        if (colonIndex === -1) continue;

        const key = line.substring(0, colonIndex).trim();
        let value: string | boolean = line
            .substring(colonIndex + 1)
            .trim()
            .replace(/^["']|["']$/g, "");

        // Convert boolean strings
        if (value === "true") {
            frontmatter[key] = true;
        } else if (value === "false") {
            frontmatter[key] = false;
        } else {
            frontmatter[key] = value;
        }
    }

    return { frontmatter, content: match[2].trim() };
}

/**
 * Generate markdown string with YAML frontmatter
 */
export function generateMarkdown(
    frontmatter: Frontmatter,
    content: string
): string {
    let md = "---\n";

    for (const [key, value] of Object.entries(frontmatter)) {
        if (typeof value === "boolean") {
            md += `${key}: ${value}\n`;
        } else {
            md += `${key}: "${value}"\n`;
        }
    }

    md += `---\n\n${content}`;
    return md;
}

/**
 * Generate a URL-friendly slug from a title
 */
export function generateSlug(title: string): string {
    return removeAccents(title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 100);
}

/**
 * Generate a filename from form data
 */
export function generateFilename(
    formData: Record<string, any>,
    existingFilename?: string
): string {
    if (existingFilename) return existingFilename;

    const slug = formData.slug || generateSlug(formData.title || "untitled");
    return `${slug}.md`;
}

/**
 * Remove accents from a string for slug generation
 */
function removeAccents(str: string): string {
    const accents: Record<string, string> = {
        à: "a", â: "a", ä: "a", á: "a", ã: "a",
        è: "e", ê: "e", ë: "e", é: "e",
        ì: "i", î: "i", ï: "i", í: "i",
        ò: "o", ô: "o", ö: "o", ó: "o", õ: "o",
        ù: "u", û: "u", ü: "u", ú: "u",
        ñ: "n", ç: "c",
        À: "A", Â: "A", Ä: "A", Á: "A", Ã: "A",
        È: "E", Ê: "E", Ë: "E", É: "E",
        Ì: "I", Î: "I", Ï: "I", Í: "I",
        Ò: "O", Ô: "O", Ö: "O", Ó: "O", Õ: "O",
        Ù: "U", Û: "U", Ü: "U", Ú: "U",
        Ñ: "N", Ç: "C",
    };

    return str.replace(/[àâäáãèêëéìîïíòôöóõùûüúñçÀÂÄÁÃÈÊËÉÌÎÏÍÒÔÖÓÕÙÛÜÚÑÇ]/g, (char) => accents[char] || char);
}
