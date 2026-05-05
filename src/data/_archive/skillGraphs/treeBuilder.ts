// ============================================================
// Compact Skill-Tree Builder
// Generates 16-node graphs (CL-style) from shared branch
// templates + per-skill notable/keystone overrides.
// ============================================================

import type { SkillGraph, SkillGraphNode, SkillModifier } from '../../types';

// ─── Public config types ───────────────────────────────────

export interface BranchTemplate {
  name: string;           // e.g. "Brutality"
  root: { name: string; desc: string; modifier: SkillModifier };
  minor: { name: string; desc: string; modifier: SkillModifier };
}

export interface BridgeTemplate {
  name: string; desc: string; modifier: SkillModifier;
}

export interface SkillNodeOverride {
  notable: { name: string; desc: string; modifier: SkillModifier };
  keystone: { name: string; desc: string; modifier: SkillModifier };
}

export interface CompactTreeConfig {
  skillId: string;
  prefix: string;                                                 // node-ID prefix (e.g. "sl" for Slash)
  branches: [BranchTemplate, BranchTemplate, BranchTemplate];     // shared per weapon
  bridges: [BridgeTemplate, BridgeTemplate, BridgeTemplate];      // shared per weapon
  overrides: [SkillNodeOverride, SkillNodeOverride, SkillNodeOverride]; // unique per skill
  startName?: string;                                              // optional start-node label
}

// ─── Helpers ───────────────────────────────────────────────

function mkNode(
  id: string, name: string, desc: string,
  nodeType: SkillGraphNode['nodeType'],
  tier: number, connections: string[],
  modifier?: SkillModifier,
): SkillGraphNode {
  return { id, name, description: desc, nodeType, tier, connections, modifier };
}

// ─── Builder ───────────────────────────────────────────────

/**
 * Build a 16-node compact skill graph (CL-style).
 *
 * Layout:
 *   [start]  (tier 0)
 *    / | \
 *  b1  b2  b3  roots   (tier 1)
 *  |   |   |
 *  m1  m2  m3  minors  (tier 2)
 *  |   |   |
 *  n1  n2  n3  notables (tier 3) ★ unique
 *  |   |   |
 *  k1  k2  k3  keystones (tier 4) ★ unique
 *
 *  x12 x23 x31          bridges (tier 2)
 *
 * Bridge connections mirror CL exactly:
 *   x12 ↔ b1_root, b1_m1, b2_root, b2_m1
 *   x23 ↔ b2_root, b2_m1, b3_root, b3_m1
 *   x31 ↔ b3_root, b3_m1, b1_root, b1_m1
 */
export function createCompactTree(cfg: CompactTreeConfig): SkillGraph {
  const p = cfg.prefix;
  const [b1, b2, b3] = cfg.branches;
  const [br12, br23, br31] = cfg.bridges;
  const [o1, o2, o3] = cfg.overrides;

  // IDs
  const ids = {
    start:   `${p}_start`,
    b1_root: `${p}_b1_root`, b1_m1: `${p}_b1_m1`, b1_n1: `${p}_b1_n1`, b1_k: `${p}_b1_k`,
    b2_root: `${p}_b2_root`, b2_m1: `${p}_b2_m1`, b2_n1: `${p}_b2_n1`, b2_k: `${p}_b2_k`,
    b3_root: `${p}_b3_root`, b3_m1: `${p}_b3_m1`, b3_n1: `${p}_b3_n1`, b3_k: `${p}_b3_k`,
    x12: `${p}_x12`, x23: `${p}_x23`, x31: `${p}_x31`,
  };

  const nodes: SkillGraphNode[] = [
    // ─── Start ───
    mkNode(ids.start, cfg.startName ?? 'Origin', 'Starting node.',
      'start', 0, [ids.b1_root, ids.b2_root, ids.b3_root]),

    // ─── Branch 1 ───
    mkNode(ids.b1_root, b1.root.name, b1.root.desc,
      'minor', 1, [ids.start, ids.b1_m1, ids.x12, ids.x31], b1.root.modifier),
    mkNode(ids.b1_m1, b1.minor.name, b1.minor.desc,
      'minor', 2, [ids.b1_root, ids.b1_n1, ids.x12, ids.x31], b1.minor.modifier),
    mkNode(ids.b1_n1, o1.notable.name, o1.notable.desc,
      'notable', 3, [ids.b1_m1, ids.b1_k], o1.notable.modifier),
    mkNode(ids.b1_k, o1.keystone.name, o1.keystone.desc,
      'keystone', 4, [ids.b1_n1], o1.keystone.modifier),

    // ─── Branch 2 ───
    mkNode(ids.b2_root, b2.root.name, b2.root.desc,
      'minor', 1, [ids.start, ids.b2_m1, ids.x12, ids.x23], b2.root.modifier),
    mkNode(ids.b2_m1, b2.minor.name, b2.minor.desc,
      'minor', 2, [ids.b2_root, ids.b2_n1, ids.x12, ids.x23], b2.minor.modifier),
    mkNode(ids.b2_n1, o2.notable.name, o2.notable.desc,
      'notable', 3, [ids.b2_m1, ids.b2_k], o2.notable.modifier),
    mkNode(ids.b2_k, o2.keystone.name, o2.keystone.desc,
      'keystone', 4, [ids.b2_n1], o2.keystone.modifier),

    // ─── Branch 3 ───
    mkNode(ids.b3_root, b3.root.name, b3.root.desc,
      'minor', 1, [ids.start, ids.b3_m1, ids.x23, ids.x31], b3.root.modifier),
    mkNode(ids.b3_m1, b3.minor.name, b3.minor.desc,
      'minor', 2, [ids.b3_root, ids.b3_n1, ids.x23, ids.x31], b3.minor.modifier),
    mkNode(ids.b3_n1, o3.notable.name, o3.notable.desc,
      'notable', 3, [ids.b3_m1, ids.b3_k], o3.notable.modifier),
    mkNode(ids.b3_k, o3.keystone.name, o3.keystone.desc,
      'keystone', 4, [ids.b3_n1], o3.keystone.modifier),

    // ─── Bridges ───
    mkNode(ids.x12, br12.name, br12.desc,
      'minor', 2, [ids.b1_root, ids.b1_m1, ids.b2_root, ids.b2_m1], br12.modifier),
    mkNode(ids.x23, br23.name, br23.desc,
      'minor', 2, [ids.b2_root, ids.b2_m1, ids.b3_root, ids.b3_m1], br23.modifier),
    mkNode(ids.x31, br31.name, br31.desc,
      'minor', 2, [ids.b3_root, ids.b3_m1, ids.b1_root, ids.b1_m1], br31.modifier),
  ];

  return { skillId: cfg.skillId, nodes, maxPoints: 10 };
}
