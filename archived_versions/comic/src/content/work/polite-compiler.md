---
title: "A Compiler That Complains Politely"
summary: "A long-title specimen about parsing small programs and turning opaque failures into precise, useful diagnostics."
date: 2026-06-04
order: 2
placeholder: true
---

> This is realistic placeholder copy used to test code, headings, and narrow-screen behavior. It is not a claim about completed work.

## Parse first, apologize later

The imagined compiler accepts a tiny expression language. Its error messages identify the failed expectation, preserve the surrounding source, and suggest only fixes that the parser can justify.

```ts
type Expression =
  | { kind: 'number'; value: number }
  | { kind: 'add'; left: Expression; right: Expression };

function evaluate(node: Expression): number {
  return node.kind === 'number'
    ? node.value
    : evaluate(node.left) + evaluate(node.right);
}
```

## Failure is part of the interface

A diagnostic is useful when it helps a person construct the next valid state. “Unexpected token” reports an event. A good message explains the local grammar, points to the smallest relevant range, and admits when several interpretations remain possible.

This specimen intentionally includes a code block long enough to verify horizontal overflow, contrast, and syntax highlighting.
