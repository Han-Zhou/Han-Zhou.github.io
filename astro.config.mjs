import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { graphite, paper } from './src/lib/herdr-shiki.mjs';

export default defineConfig({
  site: 'https://han-zhou.github.io',
  output: 'static',
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { strict: false }]],
    }),
    shikiConfig: {
      themes: { light: paper, dark: graphite },
      defaultColor: 'light-dark()',
      wrap: true,
    },
  },
});
