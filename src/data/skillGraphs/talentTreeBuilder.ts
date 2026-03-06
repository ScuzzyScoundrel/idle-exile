// ============================================================
// Talent Tree Builder
// Converts config objects into TalentTree instances.
// Auto-fills id, tier, branchIndex, position from config structure.
// Auto-wires T5 exclusiveWith between t5a and t5b.
// ============================================================

import type { TalentNode, TalentBranch, TalentTree } from '../../types';

// ─── Omit helper ──────────────────────────────────────────

type TalentNodeConfig = Omit<TalentNode, 'id' | 'tier' | 'branchIndex' | 'position'>;
type T5NodeConfig = Omit<TalentNode, 'id' | 'tier' | 'branchIndex' | 'position' | 'exclusiveWith'>;

// ─── Public config types ──────────────────────────────────

export interface TalentBranchConfig {
  name: string;
  description: string;
  t2Notable: TalentNodeConfig;
  t4Notable: TalentNodeConfig;
  // Skill-specific behavior nodes (7 per branch)
  behaviorNodes: {
    t1a: TalentNodeConfig;
    t1b: TalentNodeConfig;
    t2b: TalentNodeConfig;
    t3a: TalentNodeConfig;
    t3b: TalentNodeConfig;
    t3c: TalentNodeConfig;
    t4b: TalentNodeConfig;
  };
  // T5 keystone choices (auto-wired exclusiveWith)
  t5a: T5NodeConfig;
  t5b: T5NodeConfig;
  // T6-T7
  t6Notable: TalentNodeConfig;
  t7Keystone: TalentNodeConfig;
}

export interface TalentTreeConfig {
  skillId: string;
  prefix: string;  // Short prefix for IDs (e.g., 'st' for Stab)
  branches: [TalentBranchConfig, TalentBranchConfig, TalentBranchConfig];
}

// ─── Builder ──────────────────────────────────────────────

function mkNode(
  id: string, tier: number, branchIndex: number, position: number,
  cfg: TalentNodeConfig,
): TalentNode {
  return { id, tier, branchIndex, position, ...cfg };
}

/**
 * Build a talent tree from config.
 *
 * Node layout per branch:
 *   T1: [t1a (pos 0), t1b (pos 1)]
 *   T2: [t2Notable (pos 0), t2b (pos 1)]
 *   T3: [t3a (pos 0), t3b (pos 1), t3c (pos 2)]
 *   T4: [t4Notable (pos 0), t4b (pos 1)]
 *   T5: [t5a (pos 0), t5b (pos 1)]
 *   T6: [t6Notable (pos 0)]
 *   T7: [t7Keystone (pos 0)]
 *
 * ID format: {prefix}_{branchIndex}_{tier}_{position}
 */
export function createTalentTree(cfg: TalentTreeConfig): TalentTree {
  const { prefix, skillId } = cfg;

  const branches = cfg.branches.map((bc, bi): TalentBranch => {
    const id = (tier: number, pos: number) => `${prefix}_${bi}_${tier}_${pos}`;
    const b = bc.behaviorNodes;

    // T5 exclusive pair IDs
    const t5aId = id(5, 0);
    const t5bId = id(5, 1);

    const nodes: TalentNode[] = [
      // T1
      mkNode(id(1, 0), 1, bi, 0, b.t1a),
      mkNode(id(1, 1), 1, bi, 1, b.t1b),
      // T2
      mkNode(id(2, 0), 2, bi, 0, bc.t2Notable),
      mkNode(id(2, 1), 2, bi, 1, b.t2b),
      // T3
      mkNode(id(3, 0), 3, bi, 0, b.t3a),
      mkNode(id(3, 1), 3, bi, 1, b.t3b),
      mkNode(id(3, 2), 3, bi, 2, b.t3c),
      // T4
      mkNode(id(4, 0), 4, bi, 0, bc.t4Notable),
      mkNode(id(4, 1), 4, bi, 1, b.t4b),
      // T5 (auto-wire exclusiveWith)
      mkNode(t5aId, 5, bi, 0, { ...bc.t5a, exclusiveWith: [t5bId] }),
      mkNode(t5bId, 5, bi, 1, { ...bc.t5b, exclusiveWith: [t5aId] }),
      // T6
      mkNode(id(6, 0), 6, bi, 0, bc.t6Notable),
      // T7
      mkNode(id(7, 0), 7, bi, 0, bc.t7Keystone),
    ];

    return {
      id: `${prefix}_branch_${bi}`,
      name: bc.name,
      description: bc.description,
      nodes,
    };
  }) as [TalentBranch, TalentBranch, TalentBranch];

  return { skillId, branches, maxPoints: 30 };
}
