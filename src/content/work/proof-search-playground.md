---
title: "Proof Search Playground"
summary: "A specimen interface for exploring how a tiny automated prover chooses, postpones, and abandons possible steps."
date: 2026-08-18
order: 1
placeholder: true
---

> This is realistic placeholder copy used to test the project layout. It does not describe a completed project.

## The object

Imagine a small proof-search engine with one job: make its uncertainty visible. Instead of returning only success or failure, it exposes the queue of goals, the rule selected at each step, and the branches it chose not to follow.

For a toy recurrence such as

$$
a_n = a_{n-1} + 2n, \qquad a_0 = 0,
$$

the interface could place the symbolic state beside a compact trace of the rules that transformed it.

## A possible shape

The system would have three deliberately small pieces:

1. a parser for a restricted language of propositions;
2. a search procedure with an explicit frontier;
3. a browser view that renders the trace without hiding failed branches.

The page is intentionally freeform. Replace every section with the real project’s structure, images, mathematics, and links when those materials exist.

## Attachment slots

Repository, live demo, paper, and PDF links may be added as ordinary Markdown links. Missing links are not rendered as disabled controls.
