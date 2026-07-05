export const prerender = false;
import type { APIRoute } from "astro";
import { checkCredentials, createSessionCookie } from "../../../libs/admin/auth";
import { env } from "cloudflare:workers";

export const POST: APIRoute = async ({ request }) => {
    try {
        const runtimeEnv = env;
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return new Response(
                JSON.stringify({ error: "Identifiants requis" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        if (!checkCredentials(username, password, runtimeEnv)) {
            return new Response(
                JSON.stringify({ error: "Identifiants incorrects" }),
                { status: 401, headers: { "Content-Type": "application/json" } }
            );
        }

        const cookie = await createSessionCookie(username, runtimeEnv);

        return new Response(
            JSON.stringify({ success: true }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Set-Cookie": cookie,
                },
            }
        );
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
};
