import type { AffixCategory } from '../types';

export interface AffixCatalystDef {
  id: string;
  name: string;
  icon: string;
  guaranteedAffix: AffixCategory;
  affixSlot: 'prefix' | 'suffix';
}

export const AFFIX_CATALYST_DEFS: AffixCatalystDef[] = [
  { id: 'whetstone',         name: 'Whetstone',         icon: '\u{1F5E1}\uFE0F', guaranteedAffix: 'flat_damage',    affixSlot: 'prefix' },
  { id: 'destruction_lens',  name: 'Destruction Lens',  icon: '\uD83D\uDCA5', guaranteedAffix: 'percent_damage', affixSlot: 'prefix' },
  { id: 'speed_rune',        name: 'Speed Rune',        icon: '\u26A1',       guaranteedAffix: 'attack_speed',   affixSlot: 'prefix' },
  { id: 'precision_lens',    name: 'Precision Lens',    icon: '\uD83C\uDFAF', guaranteedAffix: 'crit_chance',    affixSlot: 'suffix' },
  { id: 'brutality_shard',   name: 'Brutality Shard',   icon: '\uD83D\uDCA2', guaranteedAffix: 'crit_damage',    affixSlot: 'suffix' },
  { id: 'vitality_essence',  name: 'Vitality Essence',  icon: '\u2764\uFE0F', guaranteedAffix: 'flat_life',      affixSlot: 'prefix' },
  { id: 'fortification_kit', name: 'Fortification Kit', icon: '\uD83D\uDEE1\uFE0F', guaranteedAffix: 'flat_armor',     affixSlot: 'prefix' },
  { id: 'evasion_charm',     name: 'Evasion Charm',     icon: '\uD83D\uDCA8', guaranteedAffix: 'dodge_chance',    affixSlot: 'suffix' },
  { id: 'haste_crystal',     name: 'Haste Crystal',     icon: '\u23F0',       guaranteedAffix: 'ability_haste',  affixSlot: 'prefix' },
];

const byId = new Map<string, AffixCatalystDef>();
for (const d of AFFIX_CATALYST_DEFS) byId.set(d.id, d);

export function getAffixCatalystDef(id: string): AffixCatalystDef | undefined {
  return byId.get(id);
}
