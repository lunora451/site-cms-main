export const prerender = false;
import type { APIRoute } from "astro";
import { getAllCollections } from "../../../libs/admin/collections";
import { listFiles } from "../../../libs/admin/github";
import { env } from "cloudflare:workers";

export const GET: APIRoute = async ({ locals }) => {
    try {
        const collections = getAllCollections();
        const result: Record<string, any> = {};

        for (const [name, config] of Object.entries(collections)) {
            const files = await listFiles(name, env);
            const totalSize = files.reduce((sum, f) => sum + f.size, 0);

            result[name] = {
                title: config.title,
                description: config.description,
                count: files.length,
                totalSize,
                fields: config.fields?.length || 0,
                settings: config.settings,
            };
        }

        return new Response(JSON.stringify(result), {
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
