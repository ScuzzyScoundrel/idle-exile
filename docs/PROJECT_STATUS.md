# Idle Exile — Project Status

> **Read this file first at the start of every conversation.**
> Last updated: 2026-02-23

## Current Phase
**Phase 0: Planning & Architecture** — Not yet started coding.

## Current Sprint
**Sprint 0: Foundation** — Project setup, tech stack, core data models.

## What Was Last Completed
- [x] Game Design Document v1.0 finalized
- [x] Project directory structure created
- [x] Development process & sprint plan documented
- [x] Architecture decisions documented

## What Is In Progress
- [ ] Nothing yet — awaiting tech stack decisions and Sprint 0 kickoff

## What Is Blocked
- Nothing currently blocked

## Key Decisions Made
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-23 | Project structure created | Clean development process |

## Key Decisions Pending
- [ ] Tech stack: React + TypeScript + Vite (proposed, not confirmed)
- [ ] State management: Zustand vs Redux vs other
- [ ] Data format: JSON data files vs TypeScript const objects for game data
- [ ] Mobile strategy: PWA vs React Native vs both
- [ ] Art style / UI framework (CSS framework, component library)

## File Index (What Lives Where)
```
idle-exile/
  docs/
    PROJECT_STATUS.md      ← THIS FILE (read first every session)
    SPRINT_PLAN.md         ← Development roadmap & sprint breakdown
    ARCHITECTURE.md        ← Tech stack, patterns, system design
    AGENT_STRATEGY.md      ← How we use Claude agents for tasks
    idle-exile-gdd.docx    ← Game Design Document (source of truth)
  src/                     ← Source code (created per sprint)
  tests/                   ← Test files
```

## Quick Reference: MVP Scope (from GDD Section 15)
1. Class selection + basic ability system
2. Zone auto-clearing with loot drops
3. Item anatomy with full affix system
4. Currency crafting (Track A)
5. Profession crafting (Track B) — 3-4 professions
6. Specialization system — 2-3 specs per profession
7. 10-15 zones across 3-4 regions with difficulty tiers
8. Talent tree
9. Save system with offline progression
