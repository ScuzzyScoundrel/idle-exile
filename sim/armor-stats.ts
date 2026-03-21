import { ITEM_BASE_DEFS } from '../src/data/items';

const byType: Record<string, { iLvl: number; stats: Record<string, number>; slot: string }[]> = { plate: [], leather: [], cloth: [] };

for (const item of ITEM_BASE_DEFS) {
  if (!item.armorType || !byType[item.armorType]) continue;
  byType[item.armorType].push({ iLvl: item.iLvl, stats: item.baseStats as Record<string, number>, slot: item.slot });
}

for (const type of ['plate', 'leather', 'cloth']) {
  console.log(`=== ${type.toUpperCase()} ===`);
  for (const ilvl of [1, 30, 60]) {
    const items = byType[type].filter(i => i.iLvl === ilvl);
    if (items.length === 0) continue;
    const allKeys = new Set<string>();
    items.forEach(i => Object.keys(i.stats).forEach(k => allKeys.add(k)));
    const avgStats: Record<string, number> = {};
    for (const key of allKeys) {
      const total = items.reduce((s, i) => s + (i.stats[key] || 0), 0);
      avgStats[key] = total / items.length;
    }
    const statStr = Object.entries(avgStats)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}=${v.toFixed(1)}`)
      .join(', ');
    console.log(`  iLvl ${ilvl} (${items.length} pieces): ${statStr}`);
  }
  console.log('');
}

// Also check for resist-related stats
console.log('=== CHECKING FOR RESIST BASE STATS ===');
for (const item of ITEM_BASE_DEFS) {
  if (!item.armorType) continue;
  const stats = item.baseStats as Record<string, number>;
  const resistKeys = Object.keys(stats).filter(k => k.toLowerCase().includes('resist') || k.toLowerCase().includes('res'));
  if (resistKeys.length > 0) {
    console.log(`  ${item.armorType} ${item.name} (iLvl ${item.iLvl}): ${resistKeys.map(k => `${k}=${stats[k]}`).join(', ')}`);
  }
}
