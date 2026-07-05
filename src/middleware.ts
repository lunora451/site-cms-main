import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import { verifySession } from "./libs/admin/auth";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // =====================================================================
  // 1. PROTECTION GLOBALE CONTRE LES BOTS/CSRF (Actions & APIs)
  // =====================================================================
  if (pathname.startsWith('/_actions/') || pathname.startsWith('/api/')) {
    const request = context.request;

    // Vérification de l'origine : on compare à l'hôte réel de la requête
    // (l'admin tourne sur admin.lunorastart.eu, pas sur le `site` configuré).
    const origin = request.headers.get("origin");
    const requestOrigin = url.origin;

    if (origin && origin !== requestOrigin) {
      return new Response(JSON.stringify({ error: "Unauthorized Origin" }), { status: 403 });
    }

    // Protection "Fetch Metadata" : bloque les requêtes initiées cross-site
    // depuis un autre onglet/site (anti-CSRF). En-tête posé par le navigateur,
    const secFetchSite = request.headers.get("sec-fetch-site");
    if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "none") {
      return new Response(JSON.stringify({ error: "Forbidden cross-site request" }), { status: 403 });
    }
  }

  // =====================================================================
  // 2. PROTECTION DES ROUTES ADMIN (Authentification)
  // =====================================================================
  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (isAdminRoute) {
    // Exclure les pages de connexion pour éviter une boucle de redirection.
    // trailingSlash: "always" => le chemin réel est "/admin/login/", on normalise.
    const normalized = pathname.replace(/\/+$/, "");
    if (normalized === "/admin/login" || normalized === "/api/admin/login") {
      return next();
    }

    // Vérification de l'authentification via le système de session existant
    const cookieHeader = context.request.headers.get("cookie");
    const session = await verifySession(cookieHeader, env);

    if (!session) {
      // Pour les API, on retourne du JSON
      if (pathname.startsWith("/api/")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      // Pour les vues HTML, on redirige vers le login
      // (chemin "propre" côté navigateur : la règle Cloudflare réécrit admin.ndd.tld/login/ -> /admin/login/)
      return context.redirect("/login/");
    }

    // Stocker les informations de l'utilisateur pour y accéder dans vos pages Astro
    // (Nécessite d'ajouter `adminUser: string` dans src/env.d.ts pour le typage)
    context.locals.adminUser = session.username;
  }

  // Si tout est bon, on passe à la suite
  return next();
});
