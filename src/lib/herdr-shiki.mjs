// Code highlighting built from herdr's "graphite" (dark) and "paper" (light) terminal palettes.
function theme(name, type, c) {
  return {
    name,
    type,
    colors: {
      'editor.background': c.bg,
      'editor.foreground': c.fg,
    },
    tokenColors: [
      { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: c.comment, fontStyle: 'italic' } },
      { scope: ['keyword', 'storage', 'storage.type', 'storage.modifier'], settings: { foreground: c.magenta } },
      { scope: ['keyword.operator'], settings: { foreground: c.cyan } },
      { scope: ['string', 'string.template', 'markup.inline.raw'], settings: { foreground: c.green } },
      { scope: ['constant.numeric', 'constant.language', 'constant.character'], settings: { foreground: c.yellow } },
      { scope: ['entity.name.function', 'support.function', 'meta.function-call'], settings: { foreground: c.blue } },
      { scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class'], settings: { foreground: c.cyan } },
      { scope: ['variable.parameter', 'variable.other.property', 'meta.object-literal.key'], settings: { foreground: c.fg } },
      { scope: ['entity.name.tag', 'invalid', 'markup.deleted'], settings: { foreground: c.red } },
      { scope: ['entity.other.attribute-name', 'markup.inserted'], settings: { foreground: c.yellow } },
      { scope: ['markup.heading'], settings: { foreground: c.blue } },
    ],
  };
}

export const graphite = theme('graphite', 'dark', {
  bg: '#1e2126',
  fg: '#d2d4d9',
  comment: '#818793',
  red: '#dc8c95',
  green: '#a6bd91',
  yellow: '#d8be87',
  blue: '#96b2d7',
  magenta: '#b5a2ce',
  cyan: '#8cbdc3',
});

export const paper = theme('paper', 'light', {
  bg: '#f6f7f9',
  fg: '#25272c',
  comment: '#5f6068',
  red: '#c62a2a',
  green: '#1a7f37',
  yellow: '#8f5d00',
  blue: '#1f62d0',
  magenta: '#7a45c8',
  cyan: '#0f6f74',
});
