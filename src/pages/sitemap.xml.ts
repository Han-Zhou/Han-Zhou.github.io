import { getCollection } from 'astro:content';
import { visualizations } from '../viz/registry';

export async function GET({ site }: { site: URL }) {
  const notes = await getCollection('notes', ({ data }) => data.status === 'published');
  const writing = await getCollection('writing', ({ data }) => data.status === 'published');
  const paths = [
    '/',
    '/gig/',
    '/scribbles/',
    '/scribbles/reading-list/',
    '/resume/',
    '/about/',
    ...notes.map((entry) => `/gig/notes/${entry.id}/`),
    ...writing.map((entry) => `/scribbles/${entry.id}/`),
    '/visualizations/',
    ...visualizations.map((v) => `/visualizations/${v.slug}/`),
  ];

  const urls = paths
    .map((path) => `<url><loc>${new URL(path, site).href}</loc></url>`)
    .join('');

  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
