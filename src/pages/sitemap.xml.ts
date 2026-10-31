import { getCollection } from 'astro:content';

export async function GET({ site }: { site: URL }) {
  const work = await getCollection('work');
  const writing = await getCollection('writing', ({ data }) => data.status === 'published');
  const paths = [
    '/',
    '/work/',
    '/writing/',
    '/about/',
    ...work.map((entry) => `/work/${entry.id}/`),
    ...writing.map((entry) => `/writing/${entry.id}/`),
  ];

  const urls = paths
    .map((path) => `<url><loc>${new URL(path, site).href}</loc></url>`)
    .join('');

  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
