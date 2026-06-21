import { Slug } from 'react-native-body-highlighter';
import { HighlightLevel, MuscleGroupStatus } from './muscleMap';
import { MuscleGroup } from '../types';

export const MUSCLE_GROUP_TO_SLUGS: Record<MuscleGroup, Slug[]> = {
  chestUpper: ['chest'],
  chestLower: ['chest'],
  lats: ['upper-back'],
  traps: ['trapezius'],
  lowerBack: ['lower-back'],
  delts: ['deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  core: ['abs', 'obliques'],
  glutes: ['gluteal'],
  quads: ['quadriceps'],
  hamstrings: ['hamstring'],
  calves: ['calves'],
};

export const SLUG_LABELS: Record<Slug, string> = {
  chest: 'Chest',
  'upper-back': 'Lats',
  trapezius: 'Traps',
  'lower-back': 'Lower Back',
  deltoids: 'Delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  abs: 'Abs',
  obliques: 'Obliques',
  gluteal: 'Glutes',
  quadriceps: 'Quads',
  hamstring: 'Hamstrings',
  calves: 'Calves',
  adductors: 'Adductors',
  forearm: 'Forearms',
  ankles: 'Ankles',
  knees: 'Knees',
  tibialis: 'Shins',
  neck: 'Neck',
  head: 'Head',
  hair: 'Hair',
  hands: 'Hands',
  feet: 'Feet',
};

const LEVEL_RANK: Record<HighlightLevel, number> = { none: 0, stale: 1, recent: 2, fresh: 3 };

function bestLevel(a: HighlightLevel, b: HighlightLevel): HighlightLevel {
  return LEVEL_RANK[b] > LEVEL_RANK[a] ? b : a;
}

export function getSlugToGroups(): Record<string, MuscleGroup[]> {
  const map: Record<string, MuscleGroup[]> = {};
  for (const [group, slugs] of Object.entries(MUSCLE_GROUP_TO_SLUGS) as Array<
    [MuscleGroup, Slug[]]
  >) {
    for (const slug of slugs) {
      if (!map[slug]) map[slug] = [];
      map[slug].push(group);
    }
  }
  return map;
}

export function colorForLevel(
  level: HighlightLevel,
  colors: { primary: string; textMuted: string }
): string | null {
  switch (level) {
    case 'fresh':
      return colors.primary;
    case 'recent':
      return colors.primary + 'AA';
    case 'stale':
      return colors.textMuted;
    default:
      return null;
  }
}

export function buildHighlighterData(
  statuses: Record<MuscleGroup, MuscleGroupStatus>,
  colors: { primary: string; textMuted: string }
) {
  const slugToGroups = getSlugToGroups();
  const data: Array<{ slug: Slug; color: string }> = [];

  for (const [slug, groups] of Object.entries(slugToGroups)) {
    const best = groups.reduce(
      (acc, g) => bestLevel(acc, statuses[g].highlightLevel),
      'none' as HighlightLevel
    );
    const color = colorForLevel(best, colors);
    if (color) {
      data.push({ slug: slug as Slug, color });
    }
  }

  return data;
}
