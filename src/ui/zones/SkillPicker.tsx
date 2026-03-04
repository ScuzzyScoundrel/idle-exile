import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getUnifiedSkillsForWeapon } from '../../data/unifiedSkills';
import { getEquippedWeaponType } from '../../engine/items';
import { getUnlockedSlotCount } from '../../engine/unifiedSkills';
import { WEAPON_ICONS, KIND_BADGE_COLORS } from './zoneConstants';

export default function SkillPicker() {
  const {
    character, skillBar,
    equipToSkillBar, unequipSkillBarSlot,
  } = useGameStore();
  const [open, setOpen] = useState(false);
  const weaponType = getEquippedWeaponType(character.equipment);
  const available = weaponType ? getUnifiedSkillsForWeapon(weaponType) : [];
  const unlockedSlots = getUnlockedSlotCount(character.level);

  if (!weaponType) return null;

  const equippedIds = new Set(skillBar.filter(Boolean).map(s => s!.skillId));

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-bold text-gray-300 hover:bg-gray-700 transition-colors"
      >
        <span>{WEAPON_ICONS[weaponType]} Skills</span>
        <span className="text-xs text-gray-500">{open ? '\u25B2' : '\u25BC'}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          {available.map(skill => {
            const isEquipped = equippedIds.has(skill.id);
            const isLocked = character.level < skill.levelRequired;
            const equippedSlotIdx = skillBar.findIndex(s => s?.skillId === skill.id);

            return (
              <div
                key={skill.id}
                className={`rounded-lg border p-2 ${
                  isEquipped ? 'border-yellow-600 bg-yellow-950/30' : isLocked ? 'border-gray-700 bg-gray-900/30 opacity-50' : 'border-gray-700 bg-gray-900/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{isLocked ? '\uD83D\uDD12' : skill.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${isLocked ? 'text-gray-500' : 'text-white'}`}>{skill.name}</span>
                      <span className={`text-xs px-1 rounded ${KIND_BADGE_COLORS[skill.kind] ?? 'bg-gray-700 text-gray-300'}`}>
                        {skill.kind}
                      </span>
                      {isLocked && (
                        <span className="text-xs text-gray-500">Lv.{skill.levelRequired}</span>
                      )}
                    </div>
                  </div>
                  {isEquipped ? (
                    <button
                      onClick={() => unequipSkillBarSlot(equippedSlotIdx)}
                      className="text-xs px-2 py-1 bg-red-900 hover:bg-red-800 text-red-300 rounded flex-shrink-0"
                    >
                      Remove
                    </button>
                  ) : !isLocked ? (
                    <div className="flex gap-1 flex-shrink-0">
                      {[0, 1, 2, 3, 4].map(slotIdx => {
                        if (slotIdx > 0 && slotIdx > unlockedSlots) {
                          return (
                            <div key={slotIdx} className="w-6 h-6 rounded text-xs bg-gray-800 text-gray-600 flex items-center justify-center">
                              {'\uD83D\uDD12'}
                            </div>
                          );
                        }
                        const occupied = skillBar[slotIdx] !== null;
                        return (
                          <button
                            key={slotIdx}
                            onClick={() => equipToSkillBar(skill.id, slotIdx)}
                            className={`w-6 h-6 rounded text-xs font-bold ${
                              occupied
                                ? 'bg-gray-700 text-gray-500 hover:bg-yellow-900 hover:text-yellow-300'
                                : 'bg-green-900 text-green-300 hover:bg-green-800'
                            }`}
                            title={`Slot ${slotIdx + 1}${occupied ? ' (replace)' : ''}`}
                          >
                            {slotIdx + 1}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
