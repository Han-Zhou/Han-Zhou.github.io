---
title: "Topology of a Broken Build"
summary: "A specimen research project that treats a dependency graph as a geometric object and asks where failure propagates."
date: 2026-02-11
order: 3
placeholder: true
---

> Placeholder project. The terminology is here to exercise technical typography, not to represent finished research.

## Start with the graph

Suppose each build target is a vertex and each dependency is a directed edge. A failed target removes a region of reachable work. The first useful question is not merely *what failed?* but *which boundary separated the surviving graph from the unavailable one?*

| Layer | Question | Possible display |
| --- | --- | --- |
| Target | What failed directly? | A marked vertex |
| Dependency | What became unreachable? | A cut through the graph |
| Build | What remains valid? | Connected surviving regions |

## What the page would contain

Real material could include a graph diagram, a short definition of the failure model, a comparison with an ordinary build log, and a downloadable paper or poster. Images remain in their native color on detail pages; only index thumbnails are forced into the monochrome system.
