/**
 * Pure Zod schemas for content collections.
 * 
 * Separating these from content.config.ts avoids importing 'astro:content' 
 * in regular source files, preventing circular dependencies and 500 errors 
 * in production environments like Cloudflare Workers.
 */

import { z } from 'astro/zod';

export const atelierSchema = ({ image }: any) => z.object({
  title: z.string(),
  date: z.coerce.date(),
  horaire: z.string(),
  lieu: z.string(),
  lieuUrl: z.string(),
  description: z.string(),
  prix: z.coerce.number(),
  pictureHeader: image(),
  alt: z.string()
});

/**
 * Metadata about collections (names and schemas) without Astro loaders.
 */
export const collectionSchemas: Record<string, any> = {
  atelier: atelierSchema,
};

/**
 * 💡 EXEMPLE COMPLET DE CHAMPS ZOD (Commenté)
 * Voici comment chaque type Zod est converti en champ CMS :
 * 
 * exampleSchema: ({ image }: any) => z.object({
 *   // 1. TEXTE (Default)
 *   title: z.string(),                             // Input texte simple
 *   
 *   // 2. TEXTAREA (Défini via cms.config.ts ou inféré si long)
 *   description: z.string(),                       // Textarea si spécifié dans cms.config
 *   
 *   // 3. NOMBRE
 *   prix: z.number(),                              // Input texte (valeur numérique)
 *   
 *   // 4. DATE
 *   date: z.date(),                                // Sélecteur de date
 *   
 *   // 5. BOOLEAN (Case à cocher)
 *   published: z.boolean().default(true),          // Case à cocher
 *   
 *   // 6. SELECT (Enum)
 *   tags: z.array(z.enum(["Cat1", "Cat2"])),       // Multi-select ou select simple
 *   
 *   // 7. IMAGE (Astro image helper)
 *   picture: image(),                              // Sélecteur d'image CMS
 *   
 *   // 8. OPTIONNEL
 *   optionalField: z.string().optional(),          // Champ non requis dans l'UI
 *   
 *   // 9. VALEUR PAR DÉFAUT
 *   status: z.string().default("draft"),           // Champ avec valeur initiale
 * })
 */
