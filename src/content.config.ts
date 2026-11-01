import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    type: z.string(),
    date: z.coerce.date(),
    description: z.string(),
    status: z.enum(['published', 'unpublished']),
    placeholder: z.boolean().default(false),
  }),
});

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string(),
    status: z.enum(['published', 'unpublished']).default('published'),
    placeholder: z.boolean().default(false),
  }),
});

export const collections = { writing, notes };
