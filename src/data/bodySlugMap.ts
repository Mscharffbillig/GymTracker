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

// Okabe-Ito colorblind-safe palette: distinguishable by hue+lightness for all
// common color vision deficiencies, not just by opacity of a single hue.
export const LEVEL_COLORS: Record<HighlightLevel, string | null> = {
  fresh: '#0072B2', // strong blue
  recent: '#56B4E9', // sky blue
  stale: '#E69F00', // amber
  none: null,
};

export const PROJECTED_COLOR = '#9B5DE5'; // violet, distinct from the completed palette

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

export type BodyMapMode = 'completed' | 'projected';

export function buildHighlighterData(
  statuses: Record<MuscleGroup, MuscleGroupStatus>,
  mode: BodyMapMode
): Array<{ slug: Slug; color: string }> {
  const slugToGroups = getSlugToGroups();
  const data: Array<{ slug: Slug; color: string }> = [];

  for (const [slug, groups] of Object.entries(slugToGroups)) {
    if (mode === 'projected') {
      const covered = groups.some((g) => statuses[g].exerciseNamesInProgram.length > 0);
      if (covered) {
        data.push({ slug: slug as Slug, color: PROJECTED_COLOR });
      }
      continue;
    }

    const best = groups.reduce(
      (acc, g) => bestLevel(acc, statuses[g].highlightLevel),
      'none' as HighlightLevel
    );
    const color = LEVEL_COLORS[best];
    if (color) {
      data.push({ slug: slug as Slug, color });
    }
  }

  return data;
}
