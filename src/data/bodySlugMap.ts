import { Slug } from 'react-native-body-highlighter';
import { MuscleGroupStatus } from './muscleMap';
import { BodyMapStyle, MuscleGroup } from '../types';

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

// Heat palette: yellow-orange → deep red (overworked)
// Thresholds are in raw heat-point units (primary=3, secondary=1, cooldown=2/day)
export const HEAT_COLORS = {
  low:       '#FCD34D',  // 0–2 pts  — light/recovering
  medium:    '#F59E0B',  // 2–3 pts  — building
  high:      '#EA580C',  // 3–5 pts  — well worked
  veryHigh:  '#DC2626',  // 5–max    — high volume
  overworked:'#7F1D1D',  // ≥ threshold — recover!
} as const;

// Simple-mode color (binary: worked or not)
export const SIMPLE_WORKED_COLOR = '#0072B2';

// Projected mode
export const PROJECTED_PRIMARY_COLOR = '#0072B2';
export const PROJECTED_SECONDARY_COLOR = '#7FB8D9';

export function heatToColor(heat: number, warningThreshold: number): string | null {
  if (heat <= 0) return null;
  if (heat >= warningThreshold) return HEAT_COLORS.overworked;
  if (heat >= 5) return HEAT_COLORS.veryHigh;
  if (heat >= 3) return HEAT_COLORS.high;
  if (heat >= 2) return HEAT_COLORS.medium;
  return HEAT_COLORS.low;
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

export interface LegendItem {
  label: string;
  color: string;
}

export function getCompletedLegend(bodyMapStyle: BodyMapStyle): LegendItem[] {
  if (bodyMapStyle === 'simple') {
    return [
      { label: 'Worked', color: SIMPLE_WORKED_COLOR },
    ];
  }
  return [
    { label: 'Recovering (1–2 pts)', color: HEAT_COLORS.low },
    { label: 'Active (2–3 pts)',     color: HEAT_COLORS.medium },
    { label: 'Well worked (3–5 pts)', color: HEAT_COLORS.high },
    { label: 'High volume (5+ pts)', color: HEAT_COLORS.veryHigh },
    { label: 'Recover!',             color: HEAT_COLORS.overworked },
  ];
}

export function buildHighlighterData(
  statuses: Record<MuscleGroup, MuscleGroupStatus>,
  mode: BodyMapMode,
  warningThreshold: number,
  bodyMapStyle: BodyMapStyle = 'heatmap'
): Array<{ slug: Slug; color: string }> {
  const slugToGroups = getSlugToGroups();
  const data: Array<{ slug: Slug; color: string }> = [];

  for (const [slug, groups] of Object.entries(slugToGroups)) {
    if (mode === 'projected') {
      const hasCoverage = groups.some(
        (g) => statuses[g].exerciseNamesInProgram.length > 0
      );
      if (hasCoverage) {
        data.push({ slug: slug as Slug, color: PROJECTED_PRIMARY_COLOR });
      }
      continue;
    }

    // Completed mode
    const maxHeat = groups.reduce((acc, g) => Math.max(acc, statuses[g].heat), 0);

    if (bodyMapStyle === 'simple') {
      if (maxHeat > 0) {
        data.push({ slug: slug as Slug, color: SIMPLE_WORKED_COLOR });
      }
    } else {
      const color = heatToColor(maxHeat, warningThreshold);
      if (color) {
        data.push({ slug: slug as Slug, color });
      }
    }
  }

  return data;
}
