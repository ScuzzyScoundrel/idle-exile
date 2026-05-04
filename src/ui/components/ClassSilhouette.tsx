import { CharacterClass } from '../../types';

/** Simple class silhouette — gradient-filled shape per class using basic clip-paths. */
const CLASS_CLIP_PATHS: Record<CharacterClass, string> = {
  // Berserker: broad triangle torso
  berserker: 'polygon(50% 5%, 30% 20%, 15% 50%, 20% 100%, 80% 100%, 85% 50%, 70% 20%)',
  // Sorcerer: narrow top, flared robe bottom
  sorcerer: 'polygon(50% 5%, 38% 20%, 32% 40%, 20% 100%, 80% 100%, 68% 40%, 62% 20%)',
  // Hunter: hooded, medium build
  hunter: 'polygon(50% 2%, 35% 15%, 28% 35%, 25% 60%, 30% 100%, 70% 100%, 75% 60%, 72% 35%, 65% 15%)',
  // Witchdoctor: wide ritual robe, masked
  witchdoctor: 'polygon(50% 3%, 32% 15%, 25% 35%, 15% 100%, 85% 100%, 75% 35%, 68% 15%)',
  // Assassin: very lean, blade-like
  assassin: 'polygon(50% 4%, 40% 16%, 32% 42%, 30% 75%, 34% 100%, 66% 100%, 70% 75%, 68% 42%, 60% 16%)',
};

const CLASS_GRADIENTS: Record<CharacterClass, string> = {
  berserker: 'from-red-700/50 to-red-950/20',
  sorcerer: 'from-blue-700/50 to-blue-950/20',
  hunter: 'from-green-700/50 to-green-950/20',
  witchdoctor: 'from-pink-700/50 to-pink-950/20',
  assassin: 'from-teal-700/50 to-teal-950/20',
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
