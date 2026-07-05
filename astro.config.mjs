// @ts-check
import { defineConfig, svgoOptimizer } from "astro/config";

import sitemap from "@astrojs/sitemap";
import cloudflare from "@astrojs/cloudflare";
import svelte from "@astrojs/svelte";

export default defineConfig({
  adapter: cloudflare({
    imageService: { build: "compile", runtime: "cloudflare-binding" },
  }),
  trailingSlash: "always",
  site: "https://lunorastart.eu",
  prefetch: {
    prefetchAll: true,
  },
  output: "static",

  build: {
    inlineStylesheets: `always`,
  },
  experimental: {
    svgOptimizer: svgoOptimizer(),
  },

  image: {
    responsiveStyles: true,
    layout: "constrained",
  },

  integrations: [
    sitemap({
      filter: (page) => {
        const url = new URL(page);
        const excludedPathnames = ["/admin", "/api", "/404"];
        return !excludedPathnames.some(
          (path) =>
            url.pathname === path || url.pathname.startsWith(`${path}/`),
        );
      },
    }),
    svelte(),
  ],
});
