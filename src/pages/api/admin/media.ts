export const prerender = false;
import type { APIRoute } from "astro";
import { listContentImages, uploadContentImage, deleteContentImage, renameContentImage } from "../../../libs/admin/github";
import { env } from "cloudflare:workers";

/**
 * GET: List media from R2 bucket
 * Query params:
 * - search: string (optional)
 */
export const GET: APIRoute = async ({ url }) => {
    const search = url.searchParams.get("search") || undefined;

    try {
        const r2 = (env as any)["site-simple-contact-cms"];
        const listed = await r2.list();
        
        let media = listed.objects.map((obj: any) => {
            const isVideo = obj.key.match(/\.(mp4|webm|ogg|mov)$/i);
            return {
                name: obj.key,
                key: obj.key,
                url: `${(env as any).R2_PUBLIC_URL}/${obj.key}`,
                type: isVideo ? 'video' : 'image',
                uploaded: obj.uploaded
            };
        });

        if (search) {
            media = media.filter((m: any) => m.name.toLowerCase().includes(search.toLowerCase()));
        }
        
        // Sort by newest first
        media.sort((a: any, b: any) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime());

        return new Response(JSON.stringify(media), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

/**
 * POST: Upload media to R2 (and Git if it's an image)
 * Form data:
 * - file: File object
 * - collection: string
 */
export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const collection = formData.get("collection") as string;

        if (!file) {
            return new Response(JSON.stringify({ error: "Aucun fichier" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        if (!collection) {
            return new Response(JSON.stringify({ error: "Paramètre collection requis" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Max limit (e.g. 50MB for video support)
        const MAX_SIZE = 50 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return new Response(JSON.stringify({ error: `Fichier trop volumineux (max ${MAX_SIZE / 1024 / 1024}MB)` }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_").toLowerCase();
        const buffer = await file.arrayBuffer();

        // 1. Upload to R2 Bucket
        const r2 = (env as any)["site-simple-contact-cms"];
        await r2.put(sanitizedName, buffer, {
            httpMetadata: { contentType: file.type }
        });

        // 2. Upload to Git only if it's an image
        if (file.type.startsWith("image/")) {
            const bytes = new Uint8Array(buffer);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);

            const result = await uploadContentImage(collection, sanitizedName, base64, env);
            if (!result.success) {
                console.error("Failed to commit image to Github: ", result.message);
            }
        }

        return new Response(JSON.stringify({
            success: true,
            key: sanitizedName,
            url: `${(env as any).R2_PUBLIC_URL}/${sanitizedName}`,
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

/**
 * DELETE: Delete media from R2 (and Git if image)
 * Query params:
 * - key: string (filename)
 * - collection: string
 */
export const DELETE: APIRoute = async ({ url }) => {
    const key = url.searchParams.get("key");
    const collection = url.searchParams.get("collection") || "blog";
    if (!key) {
        return new Response(JSON.stringify({ error: "Paramètre key requis" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    const filename = key; // key is just the filename now

    try {
        const r2 = (env as any)["the-real-cms-r2"];
        await r2.delete(filename);

        if (filename.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
            await deleteContentImage(collection, filename, env);
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

/**
 * PATCH: Rename media in R2 (and Git if image)
 */
export const PATCH: APIRoute = async ({ request }) => {
    try {
        const data = await request.json();
        const { oldKey, newName, collection = "blog" } = data;

        if (!oldKey || !newName) {
            return new Response(JSON.stringify({ error: "Paramètres oldKey et newName requis" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const oldName = oldKey; // now it's just the filename
        const sanitizedNewName = newName.replace(/[^a-zA-Z0-9.\-_]/g, "_").toLowerCase();

        const r2 = (env as any)["the-real-cms-r2"];
        const object = await r2.get(oldName);
        
        if (!object) {
            return new Response(JSON.stringify({ error: "Fichier introuvable dans R2" }), { status: 404 });
        }

        // Rename in R2 (put + delete)
        await r2.put(sanitizedNewName, object.body, {
            httpMetadata: object.httpMetadata
        });
        await r2.delete(oldName);

        if (oldName.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
            await renameContentImage(collection, oldName, sanitizedNewName, env);
        }

        return new Response(JSON.stringify({ success: true, key: sanitizedNewName }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};
