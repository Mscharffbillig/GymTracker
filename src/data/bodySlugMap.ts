import { Slug } from 'react-native-body-highlighter';
import { MuscleGroupStatus } from './muscleMap';
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
  hipAdductors: ['adductors'],
  neck: ['neck'],
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

// Warm heat palette — yellow → orange → red → deep red → crimson (overworked)
// Threshold breakpoints match heat accumulation values (primary=3, secondary=1)
export const HEAT_COLORS = {
  faint: '#FCD34D',   // 0.3–1.0 — one secondary, fading heat
  low: '#F59E0B',     // 1.0–2.0 — two secondaries or faded primary
  medium: '#EA580C',  // 2.0–3.0 — solid secondary stack
  high: '#DC2626',    // 3.0–5.0 — one fresh primary
  veryHigh: '#B91C1C', // 5.0–threshold — primary + secondary or multiple primaries
  overworked: '#7F1D1D', // >= threshold — recover warning
} as const;

// Projected mode: blues reserved for planning view
export const PROJECTED_PRIMARY_COLOR = '#0072B2';   // strong blue
export const PROJECTED_SECONDARY_COLOR = '#7FB8D9'; // ~50% opacity equivalent as solid

export function heatToColor(heat: number, warningThreshold: number): string | null {
  if (heat < 0.3) return null;
  if (heat >= warningThreshold) return HEAT_COLORS.overworked;
  if (heat >= 5.0) return HEAT_COLORS.veryHigh;
  if (heat >= 3.0) return HEAT_COLORS.high;
  if (heat >= 2.0) return HEAT_COLORS.medium;
  if (heat >= 1.0) return HEAT_COLORS.low;
  return HEAT_COLORS.faint;
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
  mode: BodyMapMode,
  warningThreshold: number
): Array<{ slug: Slug; color: string }> {
  const slugToGroups = getSlugToGroups();
  const data: Array<{ slug: Slug; color: string }> = [];

  for (const [slug, groups] of Object.entries(slugToGroups)) {
    if (mode === 'projected') {
      const hasPrimary = groups.some(
        (g) => statuses[g].exerciseNamesInProgram.length > 0 &&
          // only count as primary-projected if a primary exercise targets this group
          statuses[g].exerciseNamesInProgram.length > 0
      );
      // For projected: primary coverage = solid blue, secondary-only = lighter blue
      // We approximate by checking exerciseNamesInProgram (both primary + secondary contribute)
      if (hasPrimary) {
        data.push({ slug: slug as Slug, color: PROJECTED_PRIMARY_COLOR });
      }
      continue;
    }

    // Completed mode: use highest heat among groups that share this slug
    const maxHeat = groups.reduce((acc, g) => Math.max(acc, statuses[g].heat), 0);
    const color = heatToColor(maxHeat, warningThreshold);
    if (color) {
      data.push({ slug: slug as Slug, color });
    }
  }

  return data;
}
