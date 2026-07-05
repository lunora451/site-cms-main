import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { atelierSchema } from './libs/admin/schemas';

const atelier = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/data/atelier' }),
  schema: atelierSchema,
});


export const collections = { atelier };