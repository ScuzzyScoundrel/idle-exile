import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Item, GearSlot, PROFESSION_GEAR_SLOTS, ProfessionBonuses } from '../../types';
import { resolveProfessionBonuses } from '../../engine/professionBonuses';
import { formatAffix } from '../../engine/items';
import { slotIcon } from '../slotConfig';

const RARITY_BORDER: Record<string, string> = {
  common: 'border-green-600',
  uncommon: 'border-blue-500',
  rare: 'border-yellow-500',
  epic: 'border-purple-500',
  legendary: 'border-orange-500',
};

const RARITY_TEXT: Record<string, string> = {
  common: 'text-green-400',
  uncommon: 'text-blue-400',
  rare: 'text-yellow-400',
  epic: 'text-purple-400',
  legendary: 'text-orange-400',
};

const SLOT_LABELS: Record<string, string> = {
  helmet: 'Helmet',
  shoulders: 'Shoulders',
  chest: 'Chest',
  gloves: 'Gloves',
  pants: 'Pants',
  boots: 'Boots',
  mainhand: 'Tool',
};

function BonusLine({ label, value, suffix = '%' }: { label: string; value: number; suffix?: string }) {
  if (value === 0) return null;
  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className="text-teal-300">+{value}{suffix}</span>
    </div>
  );
}

function EquipSlot({
  slot,
  item,
  onEquip,
  onUnequip,
  eligibleItems,
}: {
  slot: GearSlot;
  item: Item | undefined;
  onEquip: (itemId: string) => void;
  onUnequip: (slot: GearSlot) => void;
  eligibleItems: Item[];
}) {
  const [showPicker, setShowPicker] = useState(false);

  if (item) {
    return (
      <div className={`border rounded-lg p-2 ${RARITY_BORDER[item.rarity]} bg-gray-900`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-500 uppercase">{SLOT_LABELS[slot] ?? slot}</span>
          <button
            onClick={() => onUnequip(slot)}
            className="text-[10px] text-red-400 hover:text-red-300"
          >
            Unequip
          </button>
        </div>
        <div className={`text-xs font-bold ${RARITY_TEXT[item.rarity]} truncate`}>
          {slotIcon(slot)} {item.name}
        </div>
        <div className="text-[10px] text-gray-500">iLvl {item.iLvl}</div>
        {[...item.prefixes, ...item.suffixes].map((a, i) => (
          <div key={i} className="text-[10px] text-teal-300">{formatAffix(a)}</div>
        ))}
      </div>
    );
  }

  return (
    <div className="border border-gray-700 border-dashed rounded-lg p-2 bg-gray-900/50">
      <div className="text-[10px] text-gray-500 uppercase mb-1">{SLOT_LABELS[slot] ?? slot}</div>
      {!showPicker ? (
        <button
          onClick={() => setShowPicker(true)}
          disabled={eligibleItems.length === 0}
          className={`w-full text-xs py-1 rounded ${
            eligibleItems.length > 0
              ? 'bg-teal-700 hover:bg-teal-600 text-white'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }`}
        >
          {eligibleItems.length > 0 ? `Equip (${eligibleItems.length})` : 'Empty'}
        </button>
      ) : (
        <div className="space-y-1">
          {eligibleItems.map(it => (
            <button
              key={it.id}
              onClick={() => { onEquip(it.id); setShowPicker(false); }}
              className={`w-full text-left text-[10px] p-1 rounded border ${RARITY_BORDER[it.rarity]} bg-gray-800 hover:bg-gray-700`}
            >
              <span className={`font-bold ${RARITY_TEXT[it.rarity]}`}>{it.name}</span>
              <span className="text-gray-500 ml-1">iLvl {it.iLvl}</span>
            </button>
          ))}
          <button
            onClick={() => setShowPicker(false)}
            className="w-full text-[10px] text-gray-500 hover:text-gray-300"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProfessionGearPanel() {
  const professionEquipment = useGameStore(s => s.professionEquipment);
  const inventory = useGameStore(s => s.inventory);
  const equipProfessionGear = useGameStore(s => s.equipProfessionGear);
  const unequipProfessionSlot = useGameStore(s => s.unequipProfessionSlot);

  const bonuses: ProfessionBonuses = resolveProfessionBonuses(professionEquipment);

  // Group eligible items from inventory by slot
  const eligibleBySlot: Record<string, Item[]> = {};
  for (const slot of PROFESSION_GEAR_SLOTS) {
    eligibleBySlot[slot] = inventory.filter(
      it => it.isProfessionGear && it.slot === slot
    );
  }

  const hasAnyBonus = Object.values(bonuses).some(v => v > 0);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-teal-400">Profession Gear</h3>
      <p className="text-[10px] text-gray-500">
        Equip profession gear for passive bonuses to gathering and crafting.
      </p>

      {/* Equipment Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {PROFESSION_GEAR_SLOTS.map(slot => (
          <EquipSlot
            key={slot}
            slot={slot}
            item={professionEquipment[slot]}
            onEquip={equipProfessionGear}
            onUnequip={unequipProfessionSlot}
            eligibleItems={eligibleBySlot[slot] ?? []}
          />
        ))}
      </div>

      {/* Bonus Summary */}
      {hasAnyBonus && (
        <div className="border border-teal-800 rounded-lg p-2 bg-teal-950/30">
          <div className="text-xs font-bold text-teal-400 mb-1">Total Bonuses</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <BonusLine label="Gathering Speed" value={bonuses.gatherSpeed} />
            <BonusLine label="Gathering Yield" value={bonuses.gatherYield} />
            <BonusLine label="Instant Gather" value={bonuses.instantGather} />
            <BonusLine label="Rare Material Find" value={bonuses.rareFind} />
            <BonusLine label="Crafting Speed" value={bonuses.craftSpeed} />
            <BonusLine label="Material Preservation" value={bonuses.materialSave} />
            <BonusLine label="Crafting XP" value={bonuses.craftXp} />
            <BonusLine label="Bonus iLvl" value={bonuses.bonusIlvl} suffix="" />
            <BonusLine label="Double Craft" value={bonuses.criticalCraft} />
            <BonusLine label="Gold Cost Reduction" value={bonuses.goldEfficiency} />
          </div>
        </div>
      )}
    </div>
  );
}
