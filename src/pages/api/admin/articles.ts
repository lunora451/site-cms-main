export const prerender = false;
import type { APIRoute } from "astro";
import {
    listFiles,
    getFile,
    saveFile,
    deleteFile,
} from "../../../libs/admin/github";
import { parseFrontmatter, generateMarkdown, generateFilename, generateSlug } from "../../../libs/admin/markdown";
import { getCollection } from "../../../libs/admin/collections";
import { env } from "cloudflare:workers";

export const GET: APIRoute = async ({ url, locals }) => {

    const runtimeEnv = env;
    const collection = url.searchParams.get("collection");
    const file = url.searchParams.get("file");

    if (!collection) {
        return new Response(
            JSON.stringify({ error: "Collection parameter required" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    try {
        // Single file request
        if (file) {
            const fileData = await getFile(collection, file, env);
            if (!fileData) {
                return new Response(
                    JSON.stringify({ error: "File not found" }),
                    { status: 404, headers: { "Content-Type": "application/json" } }
                );
            }

            const parsed = parseFrontmatter(fileData.content);
            return new Response(
                JSON.stringify({
                    filename: file,
                    sha: fileData.sha,
                    path: fileData.path,
                    frontmatter: parsed.frontmatter,
                    content: parsed.content,
                }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }

        // List all files
        const files = await listFiles(collection, env);

        // Enrich with frontmatter for display
        const enrichedFiles = await Promise.all(
            files.map(async (f) => {
                try {
                    const fd = await getFile(collection, f.name, env);
                    if (fd) {
                        const parsed = parseFrontmatter(fd.content);
                        return {
                            ...f,
                            title: parsed.frontmatter.title || f.name,
                            slug: parsed.frontmatter.slug || "",
                            published: parsed.frontmatter.published !== false,
                        };
                    }
                } catch { }
                return { ...f, title: f.name, slug: "", published: true };
            })
        );

        return new Response(JSON.stringify(enrichedFiles), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
};

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const body = await request.json();
        const { collection, filename: existingFilename, sha, fields, content } = body;

        if (!collection) {
            return new Response(
                JSON.stringify({ error: "Collection required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Get collection config for field types
        const config = getCollection(collection);
        if (!config) {
            return new Response(
                JSON.stringify({ error: "Collection not found" }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        // Build frontmatter from fields
        const frontmatter: Record<string, any> = {};
        for (const [key, value] of Object.entries(fields || {})) {
            frontmatter[key] = value;
        }

        // Auto-generate slug if not provided
        if (!frontmatter.slug && frontmatter.title) {
            frontmatter.slug = generateSlug(frontmatter.title as string);
        }

        // Generate filename
        const filename = generateFilename(frontmatter, existingFilename);

        // Generate markdown
        const markdownContent = generateMarkdown(frontmatter, content || "");

        // Save to GitHub
        const result = await saveFile(collection, filename, markdownContent, sha, env);

        if (result.success) {
            return new Response(
                JSON.stringify({
                    success: true,
                    filename,
                    sha: result.data?.content?.sha,
                }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ error: result.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
};

export const DELETE: APIRoute = async ({ url, locals }) => {
    const collection = url.searchParams.get("collection");
    const file = url.searchParams.get("file");

    if (!collection || !file) {
        return new Response(
            JSON.stringify({ error: "Collection and file parameters required" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    try {
        const result = await deleteFile(collection, file, env);
        if (result.success) {
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }
        return new Response(
            JSON.stringify({ error: result.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
};

export const PATCH: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { collection, filename, published } = body;

        if (!collection || !filename) {
            return new Response(
                JSON.stringify({ error: "Collection and filename required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // 1. Fetch current file
        const fileData = await getFile(collection, filename, env);
        if (!fileData) {
            return new Response(
                JSON.stringify({ error: "File not found" }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        // 2. Parse frontmatter
        const { frontmatter, content } = parseFrontmatter(fileData.content);

        // 3. Update published state
        frontmatter.published = published === true;

        // 4. Generate new content
        const newContent = generateMarkdown(frontmatter, content);

        // 5. Save back to GitHub
        const result = await saveFile(collection, filename, newContent, fileData.sha, env);

        if (result.success) {
            return new Response(
                JSON.stringify({ 
                    success: true, 
                    published: frontmatter.published,
                    sha: result.data?.content?.sha
                }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ error: result.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
};
