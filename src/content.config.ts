import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.coerce.date(),
    order: z.number().optional(),
    placeholder: z.boolean().default(false),
  }),
});

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

export const collections = { work, writing };
