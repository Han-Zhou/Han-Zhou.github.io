# Portfolio authoring guide

This is a static Astro site deployed to the root of `https://han-zhou.github.io/`.

## Local commands

```sh
npm install
npm run dev
npm run verify
```

`npm run verify` runs Astro’s type/content checks, creates the production build in `dist/`, and verifies every generated internal link and asset.

## Add work

Create a Markdown file in `src/content/work/`:

```yaml
---
title: "Project title"
summary: "One clear sentence."
date: 2026-09-12
order: 1
placeholder: false
---
```

Only `title`, `summary`, and `date` are required content fields. `order` controls the manually curated index order. The Markdown body can use any structure.

## Add writing

Create a Markdown file in `src/content/writing/`:

```yaml
---
title: "Article title"
type: "Article"
date: 2026-09-12
description: "One clear sentence."
status: "published"
placeholder: false
---
```

Use `status: "unpublished"` to omit a document from the generated site. The repository is public, so unpublished source is not private.

Markdown supports syntax-highlighted code, KaTeX mathematics, footnotes, tables, images, captions written as HTML figures, and ordinary links to files placed in `public/`.

## Replace before launch

- Replace the eight specimen Markdown entries.
- Fill the bracketed fields and contact links in `src/pages/about.astro`.
- Add the real résumé PDF to `public/` and replace the coming-soon page in `src/pages/resume.astro` with a link to it.
- Revisit the system-monospace font choice if desired.
- Keep `placeholder: true` on any specimen material that remains.

## GitHub Pages

The workflow at `.github/workflows/deploy.yml` builds and deploys on pushes to `main`. In the repository’s GitHub settings, set **Pages → Build and deployment → Source** to **GitHub Actions** before the first deployment.

The old terminal prototype remains in `archived_versions/` as repository history and is not copied into the Astro build.
