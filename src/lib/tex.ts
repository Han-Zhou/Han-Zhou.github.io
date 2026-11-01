import katex from 'katex';

/** Renders TeX to HTML at build time. Use with <Fragment set:html={tex('...')} />. */
export const tex = (src: string, display = false) => katex.renderToString(src, { displayMode: display, throwOnError: false });
