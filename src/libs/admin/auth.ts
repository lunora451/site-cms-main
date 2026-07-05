/**
 * Auth utilities — cookie-based session management with HMAC signing
 */

const COOKIE_NAME = "admin_session";
const SESSION_DURATION = 60 * 60 * 24; // 24 hours in seconds

/**
 * Simple HMAC-like signing using Web Crypto API (available in Cloudflare Workers)
 */
async function sign(value: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(value)
    );
    const sigHex = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return `${value}.${sigHex}`;
}

async function verify(
    signedValue: string,
    secret: string
): Promise<string | null> {
    const lastDot = signedValue.lastIndexOf(".");
    if (lastDot === -1) return null;

    const value = signedValue.substring(0, lastDot);
    const expected = await sign(value, secret);

    if (expected === signedValue) {
        return value;
    }
    return null;
}

export function getSecret(env: Record<string, any> = {}): string {
    const secret = env.ADMIN_SECRET || import.meta.env.ADMIN_SECRET;
    if (!secret) throw new Error("ADMIN_SECRET environment variable is required");
    return secret;
}

export async function createSessionCookie(username: string, env: Record<string, any> = {}): Promise<string> {
    const secret = getSecret(env);
    const expires = Date.now() + SESSION_DURATION * 1000;
    const payload = JSON.stringify({ username, expires });
    const signed = await sign(payload, secret);

    return `${COOKIE_NAME}=${encodeURIComponent(signed)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION}`;
}

export async function verifySession(
    cookieHeader: string | null,
    env: Record<string, any> = {}
): Promise<{ username: string } | null> {
    if (!cookieHeader) return null;

    const cookies = parseCookies(cookieHeader);
    const sessionCookie = cookies[COOKIE_NAME];
    if (!sessionCookie) return null;

    try {
        const secret = getSecret(env);
        const payload = await verify(decodeURIComponent(sessionCookie), secret);
        if (!payload) return null;

        const data = JSON.parse(payload);
        if (data.expires < Date.now()) return null;

        return { username: data.username };
    } catch {
        return null;
    }
}

export function destroySessionCookie(): string {
    return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function checkCredentials(username: string, password: string, env: Record<string, any> = {}): boolean {
    const validUser = env.ADMIN_USERNAME || import.meta.env.ADMIN_USERNAME;
    const validPass = env.ADMIN_PASSWORD || import.meta.env.ADMIN_PASSWORD;
    return username === validUser && password === validPass;
}

function parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    cookieHeader.split(";").forEach((cookie) => {
        const [name, ...rest] = cookie.trim().split("=");
        if (name) {
            cookies[name.trim()] = rest.join("=").trim();
        }
    });
    return cookies;
}
