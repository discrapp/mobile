import { DISC_CATEGORIES } from '@/constants/plasticTypes';

/**
 * Minimal disc interface for bag stats calculation.
 * Compatible with CachedDisc from discCache.ts
 */
export interface BagStatsDisc {
  id: string;
  manufacturer?: string;
  plastic?: string;
  color?: string;
  category?: string;
  flight_numbers?: {
    speed: number | null;
    glide: number | null;
    turn: number | null;
    fade: number | null;
  };
}

export interface StabilityBreakdown {
  understable: number;
  stable: number;
  overstable: number;
}

export interface BagStats {
  totalDiscs: number;
  speedRange: { min: number; max: number } | null;
  topBrand: { name: string; count: number } | null;
  categoriesCount: number;
  totalCategories: number;
  stability: StabilityBreakdown;
  stabilityByCategory: Array<{
    category: string;
    understable: number;
    stable: number;
    overstable: number;
  }>;
  categoryDistribution: Array<{ category: string; count: number }>;
  speedDistribution: Array<{ speed: number; count: number }>;
  topPlastics: Array<{ name: string; count: number }>;
  colorDistribution: Array<{ color: string; count: number }>;
}

/**
 * Calculate bag statistics from a list of discs.
 * All calculations are done client-side for performance.
 */
export function calculateBagStats(discs: BagStatsDisc[]): BagStats {
  if (discs.length === 0) {
    return {
      totalDiscs: 0,
      speedRange: null,
      topBrand: null,
      categoriesCount: 0,
      totalCategories: DISC_CATEGORIES.length,
      stability: { understable: 0, stable: 0, overstable: 0 },
      stabilityByCategory: [],
      categoryDistribution: [],
      speedDistribution: [],
      topPlastics: [],
      colorDistribution: [],
    };
  }

  // Calculate speed range
  const speeds = discs
    .map((d) => d.flight_numbers?.speed)
    .filter((s): s is number => s !== null && s !== undefined);
  const speedRange =
    speeds.length > 0
      ? { min: Math.min(...speeds), max: Math.max(...speeds) }
      : null;

  // Calculate top brand
  const brandCounts = countBy(discs, (d) => d.manufacturer);
  const topBrand = getTopItem(brandCounts);

  // Count unique categories
  const categories = new Set(
    discs.map((d) => d.category).filter((c): c is string => !!c)
  );
  const categoriesCount = categories.size;

  // Calculate stability breakdown (overall and by category)
  const stability = { understable: 0, stable: 0, overstable: 0 };
  const stabilityByCategoryMap = new Map<
    string,
    { understable: number; stable: number; overstable: number }
  >();

  for (const disc of discs) {
    const turn = disc.flight_numbers?.turn;
    if (turn === null || turn === undefined) continue;

    let stabilityType: 'understable' | 'stable' | 'overstable';
    if (turn <= -2) {
      stabilityType = 'understable';
      stability.understable++;
    } else if (turn <= 0) {
      stabilityType = 'stable';
      stability.stable++;
    } else {
      stabilityType = 'overstable';
      stability.overstable++;
    }

    // Track by category if available
    if (disc.category) {
      const catStability = stabilityByCategoryMap.get(disc.category) || {
        understable: 0,
        stable: 0,
        overstable: 0,
      };
      catStability[stabilityType]++;
      stabilityByCategoryMap.set(disc.category, catStability);
    }
  }

  // Convert stability by category map to sorted array
  const stabilityByCategory = Array.from(stabilityByCategoryMap.entries())
    .map(([category, counts]) => ({
      category,
      ...counts,
    }))
    .sort((a, b) => {
      const totalA = a.understable + a.stable + a.overstable;
      const totalB = b.understable + b.stable + b.overstable;
      return totalB - totalA; // Sort by total count descending
    });

  // Calculate top plastics (top 3)
  const plasticCounts = countBy(discs, (d) => d.plastic);
  const topPlastics = getSortedItems(plasticCounts, 3);

  // Calculate color distribution
  const colorCounts = countBy(discs, (d) => d.color);
  const colorDistribution = getSortedItems(colorCounts).map(
    ({ name, count }) => ({
      color: name,
      count,
    })
  );

  // Calculate category distribution
  const categoryCounts = countBy(discs, (d) => d.category);
  const categoryDistribution = getSortedItems(categoryCounts).map(
    ({ name, count }) => ({
      category: name,
      count,
    })
  );

  // Calculate speed distribution
  const speedCounts = new Map<number, number>();
  for (const disc of discs) {
    const speed = disc.flight_numbers?.speed;
    if (speed !== null && speed !== undefined) {
      speedCounts.set(speed, (speedCounts.get(speed) || 0) + 1);
    }
  }
  const speedDistribution = Array.from(speedCounts.entries())
    .map(([speed, count]) => ({ speed, count }))
    .sort((a, b) => a.speed - b.speed); // Sort by speed ascending

  return {
    totalDiscs: discs.length,
    speedRange,
    topBrand,
    categoriesCount,
    totalCategories: DISC_CATEGORIES.length,
    stability,
    stabilityByCategory,
    categoryDistribution,
    speedDistribution,
    topPlastics,
    colorDistribution,
  };
}

/**
 * Count occurrences of a property value across items.
 */
function countBy<T>(
  items: T[],
  getKey: (item: T) => string | undefined
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item);
    if (key) {
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return counts;
}

/**
 * Get the item with the highest count.
 */
function getTopItem(
  counts: Map<string, number>
): { name: string; count: number } | null {
  let topName: string | null = null;
  let topCount = 0;

  for (const [name, count] of counts) {
    if (count > topCount) {
      topName = name;
      topCount = count;
    }
  }

  return topName ? { name: topName, count: topCount } : null;
}

/**
 * Get items sorted by count in descending order.
 */
function getSortedItems(
  counts: Map<string, number>,
  limit?: number
): Array<{ name: string; count: number }> {
  const items = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return limit ? items.slice(0, limit) : items;
}
