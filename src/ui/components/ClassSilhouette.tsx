import { CharacterClass } from '../../types';

/** Simple class silhouette — gradient-filled shape per class using basic clip-paths. */
const CLASS_CLIP_PATHS: Record<CharacterClass, string> = {
  // Warrior: broad triangle torso
  warrior: 'polygon(50% 5%, 30% 20%, 15% 50%, 20% 100%, 80% 100%, 85% 50%, 70% 20%)',
  // Mage: narrow top, flared robe bottom
  mage: 'polygon(50% 5%, 38% 20%, 32% 40%, 20% 100%, 80% 100%, 68% 40%, 62% 20%)',
  // Ranger: hooded, medium build
  ranger: 'polygon(50% 2%, 35% 15%, 28% 35%, 25% 60%, 30% 100%, 70% 100%, 75% 60%, 72% 35%, 65% 15%)',
  // Rogue: lean, narrow
  rogue: 'polygon(50% 5%, 38% 18%, 30% 40%, 28% 70%, 32% 100%, 68% 100%, 72% 70%, 70% 40%, 62% 18%)',
};

const CLASS_GRADIENTS: Record<CharacterClass, string> = {
  warrior: 'from-red-700/50 to-red-950/20',
  mage: 'from-blue-700/50 to-blue-950/20',
  ranger: 'from-green-700/50 to-green-950/20',
  rogue: 'from-purple-700/50 to-purple-950/20',
};

interface ClassSilhouetteProps {
  characterClass: CharacterClass;
  className?: string;
}

export default function ClassSilhouette({ characterClass, className = '' }: ClassSilhouetteProps) {
  return (
    <div
      className={`bg-gradient-to-b ${CLASS_GRADIENTS[characterClass]} ${className}`}
      style={{
        clipPath: CLASS_CLIP_PATHS[characterClass],
      }}
    />
  );
}
