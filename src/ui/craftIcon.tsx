import { useState } from 'react';
import { AFFIX_CATALYST_DEFS } from '../data/affixCatalysts';
import { RARE_MATERIAL_DEFS } from '../data/rareMaterials';
import { REFINEMENT_RECIPES } from '../data/refinement';
import type { RareMaterialRarity } from '../types';

/**
 * Icon categories map to subdirectories under /icons/.
 * File convention: /icons/{category}/{id}.webp
 */
type IconCategory = 'currency' | 'material' | 'catalyst';

const broken = new Set<string>();

// Build lookup sets once
const CATALYST_IDS = new Set(AFFIX_CATALYST_DEFS.map(d => d.id));
const RARE_MAT_IDS = new Set(RARE_MATERIAL_DEFS.map(d => d.id));

// Refinement raw + refined material IDs all go to /icons/material/
const REFINEMENT_IDS = new Set<string>();
for (const r of REFINEMENT_RECIPES) {
  REFINEMENT_IDS.add(r.rawMaterialId);
  REFINEMENT_IDS.add(r.outputId);
}
// Also misc essences
REFINEMENT_IDS.add('enchanting_essence');
REFINEMENT_IDS.add('magic_essence');

const CATALYST_EMOJI = new Map(AFFIX_CATALYST_DEFS.map(d => [d.id, d.icon]));
const RARE_MAT_EMOJI = new Map(RARE_MATERIAL_DEFS.map(d => [d.id, d.icon]));

// Name + rarity lookups
const CATALYST_NAME = new Map(AFFIX_CATALYST_DEFS.map(d => [d.id, d.name]));
const RARE_MAT_NAME = new Map(RARE_MATERIAL_DEFS.map(d => [d.id, d.name]));
const RARE_MAT_RARITY = new Map(RARE_MATERIAL_DEFS.map(d => [d.id, d.rarity]));
const REFINEMENT_NAME = new Map<string, string>();
for (const r of REFINEMENT_RECIPES) {
  REFINEMENT_NAME.set(r.rawMaterialId, r.rawMaterialId.replace(/_/g, ' '));
  REFINEMENT_NAME.set(r.outputId, r.outputName);
}
REFINEMENT_NAME.set('enchanting_essence', 'Enchanting Essence');
REFINEMENT_NAME.set('magic_essence', 'Magic Essence');

export interface MaterialMeta {
  name: string;
  rarity: RareMaterialRarity | null;
  category: IconCategory;
  emoji: string;
}

/** Resolve display metadata for any material-bag key. */
export function resolveMaterialMeta(id: string): MaterialMeta | null {
  if (RARE_MAT_IDS.has(id)) {
    return {
      name: RARE_MAT_NAME.get(id) ?? id.replace(/_/g, ' '),
      rarity: RARE_MAT_RARITY.get(id) ?? null,
      category: 'material',
      emoji: RARE_MAT_EMOJI.get(id) ?? '',
    };
  }
  if (CATALYST_IDS.has(id)) {
    return {
      name: CATALYST_NAME.get(id) ?? id.replace(/_/g, ' '),
      rarity: null,
      category: 'catalyst',
      emoji: CATALYST_EMOJI.get(id) ?? '',
    };
  }
  if (REFINEMENT_IDS.has(id)) {
    return {
      name: REFINEMENT_NAME.get(id) ?? id.replace(/_/g, ' '),
      rarity: null,
      category: 'material',
      emoji: '\uD83E\uDEA8',
    };
  }
  return null;
}

/**
 * Resolve a flat material-bag key to its icon category and emoji fallback.
 * Falls back to emoji (via onError) if the icon file doesn't exist yet.
 */
export function resolveMaterialIcon(id: string): { category: IconCategory; emoji: string } | null {
  if (CATALYST_IDS.has(id)) return { category: 'catalyst', emoji: CATALYST_EMOJI.get(id) ?? '' };
  if (RARE_MAT_IDS.has(id)) return { category: 'material', emoji: RARE_MAT_EMOJI.get(id) ?? '' };
  if (REFINEMENT_IDS.has(id)) return { category: 'material', emoji: '\uD83E\uDEA8' };
  return null;
}

export function CraftIcon({
  category,
  id,
  fallback,
  size = 'md',
  className = '',
}: {
  category: IconCategory;
  id: string;
  fallback: string;        // emoji to show if image missing
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const key = `${category}/${id}`;
  const [isBroken, setIsBroken] = useState(broken.has(key));

  if (isBroken) {
    return <span className={`${EMOJI_SIZE[size]} leading-none ${className}`}>{fallback}</span>;
  }

  return (
    <img
      src={`/icons/${category}/${id}.webp`}
      alt={id}
      loading="lazy"
      className={`${SIZE_CLASS[size]} object-contain ${className}`}
      onLoad={() => { broken.delete(key); }}
      onError={() => { broken.add(key); setIsBroken(true); }}
    />
  );
}

const SIZE_CLASS = {
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-10 h-10',
  xl: 'w-12 h-12',
} as const;

const EMOJI_SIZE = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
  xl: 'text-3xl',
} as const;
