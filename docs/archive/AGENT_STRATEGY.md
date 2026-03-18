# Idle Exile — Agent Strategy

> How we use Claude Code agents efficiently during development.

## Guiding Principles
1. **Agents for parallelizable work** — Launch multiple agents when tasks are independent
2. **Agents for deep research** — Use Explore agents to investigate libraries, patterns, prior art
3. **Agents for isolated implementation** — Each engine module can be built by an agent with clear inputs/outputs
4. **Main context for orchestration** — The main conversation coordinates, reviews, and integrates

## Agent Types & When to Use Them

### Explore Agent
**Use for:**
- Researching libraries (e.g., "find the best seeded PRNG for TypeScript")
- Searching the codebase for patterns (e.g., "how is X used across the project")
- Investigating bugs across multiple files
- Understanding existing code before modifying it

**Example prompts:**
- "Search for all places where `Item` type is used and how affixes are accessed"
- "Find all zone data files and summarize the material table structure"

### Plan Agent
**Use for:**
- Designing implementation approach for a complex system before coding
- Identifying critical files and architectural trade-offs
- Sprint planning refinement

**Example prompts:**
- "Design the affix rolling algorithm considering tier weights, iLvl gating, and prefix/suffix balance"
- "Plan how the offline progression calculator should work"

### Bash Agent
**Use for:**
- Running tests (`vitest run`)
- Running builds (`npm run build`)
- Installing dependencies (`npm install`)
- Git operations

### General-Purpose Agent
**Use for:**
- Implementing a complete, self-contained module with tests
- Complex multi-step tasks that need reading + writing + testing

**Example prompts:**
- "Implement the full affix database in `src/data/affixes/` with all affix types, 5 tiers each, weight tables, and slot restrictions. Include a Vitest test file."
- "Build the clear speed calculator in `src/engine/zones/clearSpeed.ts` based on the formulas in ARCHITECTURE.md"

## Parallel Agent Patterns

### Pattern: Data + Engine in Parallel
When starting a new system, the data definitions and engine logic can often be built simultaneously:
```
Agent A: "Create the zone data files with all regions, materials, and tier scaling"
Agent B: "Implement the clear speed calculator engine (it will consume zone data)"
```
Then integrate after both complete.

### Pattern: Engine + Tests in Sequence
Build the engine first, then write tests (or have the agent include tests):
```
Agent: "Implement applyCurrency() for all 9 core currencies, with Vitest tests for each"
```

### Pattern: Multiple Independent UI Components
UI components that don't depend on each other can be built in parallel:
```
Agent A: "Build the ItemTooltip component"
Agent B: "Build the InventoryGrid component"
Agent C: "Build the CurrencySelector component"
```

## Context Management
- **Always read PROJECT_STATUS.md** at conversation start
- **Update PROJECT_STATUS.md** after completing work
- **Agent prompts should be self-contained**: include relevant type definitions, data structures, and acceptance criteria so the agent doesn't need to search
- **Review agent output before integrating**: agents can make mistakes; always verify

## What NOT to Use Agents For
- Quick single-file edits (just do them directly)
- Reading a specific file (use Read tool)
- Simple grep/glob searches (use Grep/Glob directly)
- Decisions that need user input (use the main conversation)
