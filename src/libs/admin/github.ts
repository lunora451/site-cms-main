import { Octokit } from "@octokit/rest";

/**
 * GitHub API client — CRUD operations on markdown files and images
 */

function getConfig(env: Record<string, any> = {}) {
    return {
        token: env.GITHUB_TOKEN || import.meta.env.GITHUB_TOKEN,
        owner: env.GITHUB_OWNER || import.meta.env.GITHUB_OWNER,
        repo: env.GITHUB_REPO || import.meta.env.GITHUB_REPO,
    };
}

function getOctokit(env: Record<string, any> = {}) {
    const { token } = getConfig(env);
    return new Octokit({
        auth: token,
        userAgent: "Astro-CMS",
    });
}

// ─── Collection files ────────────────────────────────────────────

export async function listFiles(
    collection: string,
    env: Record<string, any> = {}
): Promise<Array<{ name: string; sha: string; size: number }>> {
    const { owner, repo } = getConfig(env);
    const octokit = getOctokit(env);

    try {
        const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: `src/data/${collection}`,
        });

        if (Array.isArray(data)) {
            return data
                .filter(
                    (f: any) =>
                        f.type === "file" && (f.name.endsWith(".md") || f.name.endsWith(".mdx"))
                )
                .map((f: any) => ({ name: f.name, sha: f.sha, size: f.size }));
        }
    } catch (error) {
        console.error("Error listing files:", error);
    }
    return [];
}

export async function getFile(
    collection: string,
    filename: string,
    env: Record<string, any> = {}
): Promise<{ content: string; sha: string; path: string } | null> {
    const { owner, repo } = getConfig(env);
    const octokit = getOctokit(env);

    try {
        const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: `src/data/${collection}/${filename}`,
        });

        if (!Array.isArray(data) && data.type === "file") {
            // Correctly decode UTF-8 from Base64
            const binString = atob(data.content.replace(/\n/g, ""));
            const bytes = Uint8Array.from(binString, (m) => m.charCodeAt(0));
            const content = new TextDecoder().decode(bytes);

            return {
                content,
                sha: data.sha,
                path: data.path,
            };
        }
    } catch (error) {
        console.error("Error getting file:", error);
    }
    return null;
}

export async function saveFile(
    collection: string,
    filename: string,
    content: string,
    sha?: string,
    env: Record<string, any> = {}
): Promise<{ success: boolean; data?: any; message?: string }> {
    const { owner, repo } = getConfig(env);
    const octokit = getOctokit(env);

    try {
        const { data } = await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: `src/data/${collection}/${filename}`,
            message: sha ? `Update ${filename}` : `Create ${filename}`,
            // Correctly encode UTF-8 to Base64
            content: btoa(Array.from(new TextEncoder().encode(content), (b) => String.fromCharCode(b)).join("")),
            sha,
            branch: "main",
        });

        return { success: true, data };
    } catch (error: any) {
        return {
            success: false,
            message: error.message || "Failed to save file",
        };
    }
}

export async function deleteFile(
    collection: string,
    filename: string,
    env: Record<string, any> = {}
): Promise<{ success: boolean; message?: string }> {
    const { owner, repo } = getConfig(env);
    const octokit = getOctokit(env);

    try {
        // First get the SHA
        const file = await getFile(collection, filename, env);
        if (!file) return { success: false, message: "File not found" };

        await octokit.rest.repos.deleteFile({
            owner,
            repo,
            path: `src/data/${collection}/${filename}`,
            message: `Delete ${filename}`,
            sha: file.sha,
            branch: "main",
        });

        return { success: true };
    } catch (error: any) {
        return {
            success: false,
            message: error.message || "Failed to delete file",
        };
    }
}

// ─── Raw files (Generic) ──────────────────────────────────────────

export async function getRawFile(
    path: string,
    env: Record<string, any> = {}
): Promise<{ content: string; sha: string; path: string } | null> {
    const { owner, repo } = getConfig(env);
    const octokit = getOctokit(env);

    try {
        const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path,
        });

        if (!Array.isArray(data) && data.type === "file") {
            const binString = atob(data.content.replace(/\n/g, ""));
            const bytes = Uint8Array.from(binString, (m) => m.charCodeAt(0));
            const content = new TextDecoder().decode(bytes);

            return {
                content,
                sha: data.sha,
                path: data.path,
            };
        }
    } catch (error) {
        console.error(`Error getting raw file (${path}):`, error);
    }
    return null;
}

export async function saveRawFile(
    path: string,
    content: string,
    message: string = "Update file",
    sha?: string,
    env: Record<string, any> = {}
): Promise<{ success: boolean; data?: any; message?: string }> {
    const { owner, repo } = getConfig(env);
    const octokit = getOctokit(env);

    try {
        const { data } = await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message,
            content: btoa(Array.from(new TextEncoder().encode(content), (b) => String.fromCharCode(b)).join("")),
            sha,
            branch: "main",
        });

        return { success: true, data };
    } catch (error: any) {
        return {
            success: false,
            message: error.message || "Failed to save file",
        };
    }
}

// ─── Content Images (GitHub) ─────────────────────────────────────

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif", "bmp"];

/**
 * List images in src/data/{collection}/images/
 */
export async function listContentImages(
    collection: string,
    env: Record<string, any> = {}
): Promise<Array<{ name: string; key: string; sha: string; size: number; url: string; type: string }>> {
    const { owner, repo } = getConfig(env);
    const octokit = getOctokit(env);

    try {
        const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: `src/assets/img`,
        });

        if (Array.isArray(data)) {
            return data
                .filter((f: any) => {
                    if (f.type !== "file") return false;
                    const ext = f.name.split(".").pop()?.toLowerCase() || "";
                    return IMAGE_EXTS.includes(ext);
                })
                .map((f: any) => ({
                    name: f.name,
                    key: `src/assets/img/${f.name}`,
                    sha: f.sha,
                    size: f.size,
                    url: `/api/media/${f.path}`,
                    type: "image",
                }));
        }
    } catch (error) {
        console.error("Error listing images:", error);
    }
    return [];
}

/**
 * Upload an image to src/data/{collection}/images/{filename}
 * Returns the relative path for use in frontmatter: ./images/{filename}
 */
export async function uploadContentImage(
    collection: string,
    filename: string,
    contentBase64: string,
    env: Record<string, any> = {}
): Promise<{ success: boolean; key?: string; relativePath?: string; message?: string }> {
    const { owner, repo } = getConfig(env);
    const octokit = getOctokit(env);
    const filePath = `src/assets/img/${filename}`;

    try {
        // Check if file already exists to get SHA
        let existingSha: string | undefined;
        try {
            const { data } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: filePath,
            });
            if (!Array.isArray(data) && data.type === "file") {
                existingSha = data.sha;
            }
        } catch (e) {
            // Ignore "Not Found" errors
        }

        const { data } = await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: filePath,
            message: existingSha ? `Update image ${filename}` : `Add image ${filename}`,
            content: contentBase64,
            sha: existingSha,
            branch: "main",
        });

        return {
            success: true,
            key: `src/assets/img/${filename}`,
            relativePath: `/src/assets/img/${filename}`,
        };
    } catch (error: any) {
        return {
            success: false,
            message: error.message || "Failed to upload image",
        };
    }
}

/**
 * Delete an image from src/data/{collection}/images/{filename}
 */
export async function deleteContentImage(
    collection: string,
    filename: string,
    env: Record<string, any> = {}
): Promise<{ success: boolean; message?: string }> {
    const { owner, repo } = getConfig(env);
    const octokit = getOctokit(env);
    const filePath = `src/assets/img/${filename}`;

    try {
        // Get SHA first
        const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: filePath,
        });

        if (Array.isArray(data) || data.type !== "file") {
            return { success: false, message: "Image not found" };
        }

        await octokit.rest.repos.deleteFile({
            owner,
            repo,
            path: filePath,
            message: `Delete image ${filename}`,
            sha: data.sha,
            branch: "main",
        });

        return { success: true };
    } catch (error: any) {
        return {
            success: false,
            message: error.message || "Failed to delete image",
        };
    }
}

/**
 * Rename an image: copy to new name, delete old
 */
export async function renameContentImage(
    collection: string,
    oldName: string,
    newName: string,
    env: Record<string, any> = {}
): Promise<{ success: boolean; key?: string; message?: string }> {
    const { owner, repo } = getConfig(env);
    const octokit = getOctokit(env);
    const oldPath = `src/assets/img/${oldName}`;

    try {
        // Get old file content
        const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: oldPath,
        });

        if (Array.isArray(data) || data.type !== "file") {
            return { success: false, message: "Original image not found" };
        }

        // Upload with new name
        const uploadResult = await uploadContentImage(
            collection,
            newName,
            data.content.replace(/\n/g, ""),
            env
        );

        if (!uploadResult.success) {
            return { success: false, message: uploadResult.message || "Failed to create renamed copy" };
        }

        // Delete old file
        await deleteContentImage(collection, oldName, env);

        return {
            success: true,
            key: `src/assets/img/${newName}`,
        };
    } catch (error: any) {
        return {
            success: false,
            message: error.message || "Failed to rename image",
        };
    }
}

