# Portfolio authoring guide

This is a static Astro site deployed to the root of `https://han-zhou.github.io/`.

## Local commands

```sh
npm install
npm run dev
npm run verify
```

`npm run verify` runs Astro’s type/content checks, creates the production build in `dist/`, and verifies every generated internal link and asset.

## Add notes

Notes appear under **Gig** at `/gig/notes/<file-name>/`. Create a Markdown file in `src/content/notes/`:

```yaml
---
title: "Note title"
date: 2026-10-31
description: "One clear sentence."
status: "published"
placeholder: false
---
```

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
- To update the résumé, replace `public/Han_Zhou_resume.pdf` (the Résumé page embeds it).
- Keep `placeholder: true` on any specimen material that remains.

## GitHub Pages

The workflow at `.github/workflows/deploy.yml` builds and deploys on pushes to `main`. In the repository’s GitHub settings, set **Pages → Build and deployment → Source** to **GitHub Actions** before the first deployment.

Earlier designs are kept in `archived_versions/` (`terminal/` — the original static prototype; `comic/` — the comic-style Astro version) as repository history. They are not copied into the build.
