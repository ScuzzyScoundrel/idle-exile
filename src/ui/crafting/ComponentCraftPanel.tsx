import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getComponentRecipesForProfession } from '../../data/componentRecipes';
import { canCraftComponent, getMaxCraftableComponents, autoPickMobDrop } from '../../engine/componentCrafting';
import ProfessionSelector from './ProfessionSelector';
import XpBar from './XpBar';
import MaterialPill from './MaterialPill';
import CraftingSearchBar from './CraftingSearchBar';
import CraftLog from './CraftLog';
import { VARIANT_COLORS, VARIANT_BADGE } from './craftingConstants';
import { formatMatName } from './craftingHelpers';
import type { CraftingProfession, ComponentRecipeDef } from '../../types';

interface ComponentCraftPanelProps {
  onMaterialClick?: (materialId: string) => void;
}

export default function ComponentCraftPanel({ onMaterialClick }: ComponentCraftPanelProps) {
  const { craftingSkills, materials, gold, craftComponent, craftComponentBatch } = useGameStore();
  const [selectedProfession, setSelectedProfession] = useState<CraftingProfession>('weaponsmith');
  const [selectedDrops, setSelectedDrops] = useState<Record<string, string>>({});
  const [flashId, setFlashId] = useState<string | null>(null);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [haveMats, setHaveMats] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const skill = craftingSkills[selectedProfession];

  const professions: CraftingProfession[] = ['weaponsmith', 'armorer', 'leatherworker', 'tailor', 'jeweler', 'alchemist'];
  const allRecipes = getComponentRecipesForProfession(selectedProfession);

  // Filter recipes
  const filteredRecipes = useMemo(() => {
    const searchLower = search.toLowerCase();
    return allRecipes.filter(r => {
      if (searchLower && !r.name.toLowerCase().includes(searchLower) && !r.variant.toLowerCase().includes(searchLower)) return false;
      if (haveMats) {
        const levelLocked = skill.level < r.requiredLevel;
        if (levelLocked) return false;
        const dropId = selectedDrops[r.id];
        if (!canCraftComponent(r, craftingSkills, materials, gold, dropId || undefined)) return false;
      }
      return true;
    });
  }, [allRecipes, search, haveMats, skill.level, craftingSkills, materials, gold, selectedDrops]);

  // Group filtered by band
  const bandGroups = useMemo(() => {
    const groups = new Map<number, ComponentRecipeDef[]>();
    for (const r of filteredRecipes) {
      if (!groups.has(r.band)) groups.set(r.band, []);
      groups.get(r.band)!.push(r);
    }
    return groups;
  }, [filteredRecipes]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(filteredRecipes.map(r => r.id)));
  const collapseAll = () => setExpandedIds(new Set());

  const handleCraft = (recipe: ComponentRecipeDef) => {
    const dropId = selectedDrops[recipe.id];
    const ok = craftComponent(recipe.id, dropId || undefined);
    if (ok) {
      setFlashId(recipe.id);
      setTimeout(() => setFlashId(null), 600);
    }
  };

  const handleCraftAll = (recipe: ComponentRecipeDef) => {
    const dropId = selectedDrops[recipe.id];
    const maxCount = getMaxCraftableComponents(recipe, craftingSkills, materials, gold, dropId || undefined);
    if (maxCount <= 0) return;
    const crafted = craftComponentBatch(recipe.id, maxCount, dropId || undefined);
    if (crafted > 0) {
      setFlashId(recipe.id);
      setFlashMsg(`Crafted x${crafted}`);
      setTimeout(() => { setFlashId(null); setFlashMsg(null); }, 1200);
    }
  };

  return (
    <div className="space-y-3">
      <ProfessionSelector
        professions={professions}
        selected={selectedProfession}
        onSelect={setSelectedProfession}
        craftingSkills={craftingSkills}
        color="teal"
      />

      <XpBar profession={selectedProfession} level={skill.level} xp={skill.xp} color="teal" />

      <CraftingSearchBar
        search={search}
        onSearchChange={setSearch}
        haveMats={haveMats}
        onHaveMatsToggle={() => setHaveMats(p => !p)}
        showing={filteredRecipes.length}
        total={allRecipes.length}
      />

      <CraftLog />

      {/* Expand/Collapse + flash */}
      <div className="flex items-center gap-2">
        <button onClick={expandAll} className="text-xs text-gray-400 hover:text-white">Expand All</button>
        <button onClick={collapseAll} className="text-xs text-gray-400 hover:text-white">Collapse All</button>
        {flashMsg && (
          <span className="ml-auto text-sm font-bold text-teal-400 animate-pulse">{flashMsg}</span>
        )}
      </div>

      {/* Recipes grouped by band */}
      {filteredRecipes.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-500 text-sm">
          {allRecipes.length === 0 ? 'No component recipes for this profession.' : 'No recipes match your filters.'}
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(bandGroups.entries()).sort(([a], [b]) => a - b).map(([band, bandRecipes]) => (
            <div key={band}>
              <div className="text-sm font-semibold text-gray-400 border-b border-gray-700/50 pb-1 mb-2">
                Band {band}
              </div>
              <div className="space-y-2">
                {bandRecipes.map(recipe => {
                  const levelLocked = skill.level < recipe.requiredLevel;
                  const dropId = selectedDrops[recipe.id];
                  const craftable = !levelLocked && canCraftComponent(recipe, craftingSkills, materials, gold, dropId || undefined);
                  const owned = materials[recipe.outputMaterialId] ?? 0;
                  const isFlashing = flashId === recipe.id;
                  const isExpanded = expandedIds.has(recipe.id);

                  return (
                    <div
                      key={recipe.id}
                      className={`bg-gray-800 rounded-lg border-l-4 border border-gray-700 transition-all ${
                        VARIANT_COLORS[recipe.variant] ?? 'border-l-gray-500'
                      } ${isFlashing ? 'border-teal-400 bg-teal-900/20' : ''}`}
                    >
                      {/* Collapsed header row — always visible */}
                      <button
                        onClick={() => toggleExpand(recipe.id)}
                        className="w-full p-2.5 flex items-center gap-1.5 text-left"
                      >
                        <span className="text-sm">{'\uD83E\uDDE9'}</span>
                        <span className={`text-xs font-bold flex-1 truncate ${levelLocked ? 'text-gray-500' : 'text-white'}`}>{recipe.name}</span>
                        {levelLocked && (
                          <span className="text-xs text-yellow-500 font-semibold px-1.5 py-0.5 rounded bg-yellow-900/30 leading-none">
                            Lv.{recipe.requiredLevel}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">x{owned}</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded leading-none ${VARIANT_BADGE[recipe.variant] ?? ''}`}>
                          {recipe.variant}
                        </span>
                        {/* Craftable dot */}
                        <span className={`w-2 h-2 rounded-full ${craftable ? 'bg-green-500' : levelLocked ? 'bg-gray-600' : 'bg-red-500'}`} />
                        <span className="text-xs text-gray-500">{isExpanded ? '\u25BC' : '\u25B6'}</span>
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-2.5 pb-2.5 space-y-1.5">
                          {levelLocked ? (
                            <div className="text-xs text-red-400 font-semibold">
                              {'\uD83D\uDD12'} Req. Lv.{recipe.requiredLevel}
                            </div>
                          ) : (
                            <>
                              {/* Material pills */}
                              <div className="flex flex-wrap gap-1">
                                {recipe.materials.map(({ materialId, amount }) => (
                                  <MaterialPill
                                    key={materialId}
                                    materialId={materialId}
                                    have={materials[materialId] ?? 0}
                                    need={amount}
                                    onMaterialClick={onMaterialClick}
                                  />
                                ))}
                                <MaterialPill
                                  materialId="gold"
                                  have={gold}
                                  need={recipe.goldCost}
                                  variant="gold"
                                />
                              </div>

                              {/* Mob drop selector for specialist recipes */}
                              {recipe.mobDropChoice && (
                                <div className="space-y-1">
                                  <select
                                    value={selectedDrops[recipe.id] ?? ''}
                                    onChange={e => setSelectedDrops(prev => ({ ...prev, [recipe.id]: e.target.value }))}
                                    className="w-full bg-gray-700 text-xs text-gray-300 rounded px-2 py-1.5 border border-gray-600"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <option value="">Auto-pick best</option>
                                    {recipe.mobDropChoice.anyOf.map(dId => {
                                      const have = materials[dId] ?? 0;
                                      const met = have >= recipe.mobDropChoice!.amount;
                                      return (
                                        <option key={dId} value={dId}>
                                          {formatMatName(dId)} ({have}/{recipe.mobDropChoice!.amount}){met ? ' \u2713' : ''}
                                        </option>
                                      );
                                    })}
                                  </select>
                                  {(() => {
                                    const effectiveDrop = dropId || autoPickMobDrop(recipe, materials);
                                    if (!effectiveDrop) return (
                                      <span className="text-xs text-red-400">No drops available ({recipe.mobDropChoice.amount} needed)</span>
                                    );
                                    const have = materials[effectiveDrop] ?? 0;
                                    const met = have >= recipe.mobDropChoice.amount;
                                    return (
                                      <span
                                        className={`text-xs ${met ? 'text-amber-400' : 'text-red-400'} ${onMaterialClick ? 'cursor-pointer hover:underline' : ''}`}
                                        onClick={onMaterialClick ? () => onMaterialClick(effectiveDrop) : undefined}
                                      >
                                        {'\uD83D\uDC80'} {formatMatName(effectiveDrop)} {have}/{recipe.mobDropChoice.amount}
                                      </span>
                                    );
                                  })()}
                                </div>
                              )}

                              {/* Craft buttons */}
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCraft(recipe); }}
                                  disabled={!craftable}
                                  className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                                    craftable
                                      ? 'bg-teal-600 hover:bg-teal-500 text-white'
                                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                  }`}
                                >
                                  {'\uD83E\uDDE9'} Craft
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCraftAll(recipe); }}
                                  disabled={!craftable}
                                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                                    craftable
                                      ? 'bg-teal-700 hover:bg-teal-600 text-teal-200'
                                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                  }`}
                                  title="Craft maximum possible"
                                >
                                  All
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
