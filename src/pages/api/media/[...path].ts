export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from "cloudflare:workers";

export const GET: APIRoute = async ({ params, request }) => {
  const filePath = params.path; // ex: "uploads/2024/mon-image.jpg"

  // Utilise env de Cloudflare si disponible, sinon fallback sur import.meta.env pour le dev local
  const owner = env?.GITHUB_OWNER || import.meta.env.GITHUB_OWNER;
  const repo = env?.GITHUB_REPO || import.meta.env.GITHUB_REPO;
  const branch = env?.GITHUB_BRANCH || import.meta.env.GITHUB_BRANCH || 'main';
  const token = env?.GITHUB_TOKEN || import.meta.env.GITHUB_TOKEN;

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;

  // 1. Récupère d'abord le contenu (fichier direct ou pointeur LFS)
  const rawRes = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.raw+json', // retourne le binaire brut
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Astro-CMS'
    },
  });

  if (!rawRes.ok) {
    return new Response('Not found from GitHub', { status: 404 });
  }

  // On récupère le buffer brut pour ne pas corrompre un vrai fichier binaire
  const buffer = await rawRes.arrayBuffer();
  const textDecoder = new TextDecoder('utf-8');
  // On décode juste le début pour voir si c'est un pointeur LFS
  const headerText = textDecoder.decode(buffer.slice(0, 100));

  // 2. Si c'est un pointeur LFS, on parse l'OID et la taille
  if (headerText.startsWith('version https://git-lfs.github.com')) {
    const rawText = textDecoder.decode(buffer);
    const oid = rawText.match(/oid sha256:([a-f0-9]+)/)?.[1];
    const size = Number(rawText.match(/size (\d+)/)?.[1]);

    if (oid && size) {
      // 3. Batch API LFS pour obtenir l'URL de téléchargement
      const lfsRes = await fetch(
        `https://github.com/${owner}/${repo}.git/info/lfs/objects/batch`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.git-lfs+json',
            'Content-Type': 'application/vnd.git-lfs+json',
            'User-Agent': 'Astro-CMS'
          },
          body: JSON.stringify({
            operation: 'download',
            transfers: ['basic'],
            objects: [{ oid, size }],
          }),
        }
      );

      if (lfsRes.ok) {
        const lfsData = await lfsRes.json();
        const downloadUrl = lfsData.objects?.[0]?.actions?.download?.href;
        const downloadHeaders = lfsData.objects?.[0]?.actions?.download?.header ?? {};

        if (downloadUrl) {
          // 4. Télécharge le vrai fichier depuis le storage LFS
          const fileRes = await fetch(downloadUrl, { headers: downloadHeaders });
          if (fileRes.ok) {
            const blob = await fileRes.blob();
            return new Response(blob, {
              headers: {
                'Content-Type': fileRes.headers.get('Content-Type') ?? 'image/webp',
                'Cache-Control': 'public, max-age=86400',
              },
            });
          }
        }
      }
    }
  }

  // Fichier normal (pas LFS)
  return new Response(buffer, {
    headers: {
      'Content-Type': rawRes.headers.get('Content-Type') ?? 'image/webp',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
