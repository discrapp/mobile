import {
  calculateBagStats,
  BagStats,
  BagStatsDisc,
} from '../../utils/bagStats';

describe('calculateBagStats', () => {
  describe('with empty disc array', () => {
    it('returns sensible defaults', () => {
      const result = calculateBagStats([]);

      expect(result.totalDiscs).toBe(0);
      expect(result.speedRange).toBeNull();
      expect(result.topBrand).toBeNull();
      expect(result.categoriesCount).toBe(0);
      expect(result.totalCategories).toBe(7);
      expect(result.stability.understable).toBe(0);
      expect(result.stability.stable).toBe(0);
      expect(result.stability.overstable).toBe(0);
      expect(result.stabilityByCategory).toEqual([]);
      expect(result.categoryDistribution).toEqual([]);
      expect(result.speedDistribution).toEqual([]);
      expect(result.topPlastics).toEqual([]);
      expect(result.colorDistribution).toEqual([]);
    });
  });

  describe('with a single disc', () => {
    it('calculates stats correctly', () => {
      const discs: BagStatsDisc[] = [
        {
          id: '1',
          manufacturer: 'Innova',
          plastic: 'Star',
          color: 'Blue',
          category: 'Distance Driver',
          flight_numbers: { speed: 12, glide: 5, turn: -1, fade: 3 },
        },
      ];

      const result = calculateBagStats(discs);

      expect(result.totalDiscs).toBe(1);
      expect(result.speedRange).toEqual({ min: 12, max: 12 });
      expect(result.topBrand).toEqual({ name: 'Innova', count: 1 });
      expect(result.categoriesCount).toBe(1);
      expect(result.stability.stable).toBe(1); // turn -1 is stable
      expect(result.categoryDistribution).toEqual([{ category: 'Distance Driver', count: 1 }]);
      expect(result.speedDistribution).toEqual([{ speed: 12, count: 1 }]);
      expect(result.stabilityByCategory).toEqual([
        { category: 'Distance Driver', understable: 0, stable: 1, overstable: 0 },
      ]);
      expect(result.topPlastics).toEqual([{ name: 'Star', count: 1 }]);
      expect(result.colorDistribution).toEqual([{ color: 'Blue', count: 1 }]);
    });
  });

  describe('with multiple discs', () => {
    const discs: BagStatsDisc[] = [
      {
        id: '1',
        manufacturer: 'Innova',
        plastic: 'Star',
        color: 'Blue',
        category: 'Distance Driver',
        flight_numbers: { speed: 12, glide: 5, turn: -3, fade: 2 },
      },
      {
        id: '2',
        manufacturer: 'Innova',
        plastic: 'Champion',
        color: 'Red',
        category: 'Fairway Driver',
        flight_numbers: { speed: 7, glide: 5, turn: 0, fade: 2 },
      },
      {
        id: '3',
        manufacturer: 'Discraft',
        plastic: 'ESP',
        color: 'Blue',
        category: 'Midrange',
        flight_numbers: { speed: 5, glide: 4, turn: -1, fade: 1 },
      },
      {
        id: '4',
        manufacturer: 'Innova',
        plastic: 'Star',
        color: 'Yellow',
        category: 'Putter',
        flight_numbers: { speed: 3, glide: 3, turn: 0, fade: 2 },
      },
      {
        id: '5',
        manufacturer: 'MVP',
        plastic: 'Neutron',
        color: 'Green',
        category: 'Distance Driver',
        flight_numbers: { speed: 13, glide: 5, turn: 1, fade: 3 },
      },
    ];

    it('calculates total discs', () => {
      const result = calculateBagStats(discs);
      expect(result.totalDiscs).toBe(5);
    });

    it('calculates speed range', () => {
      const result = calculateBagStats(discs);
      expect(result.speedRange).toEqual({ min: 3, max: 13 });
    });

    it('finds top brand by count', () => {
      const result = calculateBagStats(discs);
      expect(result.topBrand).toEqual({ name: 'Innova', count: 3 });
    });

    it('counts unique categories', () => {
      const result = calculateBagStats(discs);
      expect(result.categoriesCount).toBe(4); // Distance, Fairway, Midrange, Putter
    });

    it('calculates stability breakdown', () => {
      const result = calculateBagStats(discs);
      // turn <= -2: understable (1 disc with turn -3)
      // turn > -2 AND turn <= 0: stable (3 discs with turn -1, 0, 0)
      // turn > 0: overstable (1 disc with turn 1)
      expect(result.stability.understable).toBe(1);
      expect(result.stability.stable).toBe(3);
      expect(result.stability.overstable).toBe(1);
    });

    it('lists top plastics sorted by count', () => {
      const result = calculateBagStats(discs);
      expect(result.topPlastics[0]).toEqual({ name: 'Star', count: 2 });
      expect(result.topPlastics.length).toBeLessThanOrEqual(3);
    });

    it('calculates color distribution sorted by count', () => {
      const result = calculateBagStats(discs);
      expect(result.colorDistribution[0]).toEqual({ color: 'Blue', count: 2 });
      expect(result.colorDistribution.length).toBe(4); // Blue, Red, Yellow, Green
    });

    it('calculates category distribution sorted by count', () => {
      const result = calculateBagStats(discs);
      expect(result.categoryDistribution[0]).toEqual({ category: 'Distance Driver', count: 2 });
      expect(result.categoryDistribution.length).toBe(4);
    });

    it('calculates speed distribution sorted by speed', () => {
      const result = calculateBagStats(discs);
      // Speeds: 3, 5, 7, 12, 13
      expect(result.speedDistribution).toEqual([
        { speed: 3, count: 1 },
        { speed: 5, count: 1 },
        { speed: 7, count: 1 },
        { speed: 12, count: 1 },
        { speed: 13, count: 1 },
      ]);
    });

    it('calculates stability by category', () => {
      const result = calculateBagStats(discs);
      // Distance Driver: 1 understable (-3), 1 overstable (1)
      // Fairway: 1 stable (0)
      // Midrange: 1 stable (-1)
      // Putter: 1 stable (0)
      const distanceDriver = result.stabilityByCategory.find(
        (c) => c.category === 'Distance Driver'
      );
      expect(distanceDriver).toEqual({
        category: 'Distance Driver',
        understable: 1,
        stable: 0,
        overstable: 1,
      });
    });
  });

  describe('with missing data', () => {
    it('handles missing flight numbers', () => {
      const discs: BagStatsDisc[] = [
        {
          id: '1',
          manufacturer: 'Innova',
          // no flight_numbers
        },
        {
          id: '2',
          manufacturer: 'Discraft',
          flight_numbers: { speed: 10, glide: 4, turn: null, fade: 2 },
        },
      ];

      const result = calculateBagStats(discs);

      expect(result.totalDiscs).toBe(2);
      expect(result.speedRange).toEqual({ min: 10, max: 10 });
      expect(result.stability.understable).toBe(0);
      expect(result.stability.stable).toBe(0);
      expect(result.stability.overstable).toBe(0);
    });

    it('handles missing manufacturer', () => {
      const discs: BagStatsDisc[] = [
        { id: '1' },
        { id: '2', manufacturer: 'Innova' },
      ];

      const result = calculateBagStats(discs);

      expect(result.topBrand).toEqual({ name: 'Innova', count: 1 });
    });

    it('handles missing plastic', () => {
      const discs: BagStatsDisc[] = [
        { id: '1' },
        { id: '2', plastic: 'Star' },
      ];

      const result = calculateBagStats(discs);

      expect(result.topPlastics).toEqual([{ name: 'Star', count: 1 }]);
    });

    it('handles missing color', () => {
      const discs: BagStatsDisc[] = [
        { id: '1' },
        { id: '2', color: 'Blue' },
      ];

      const result = calculateBagStats(discs);

      expect(result.colorDistribution).toEqual([{ color: 'Blue', count: 1 }]);
    });

    it('handles missing category', () => {
      const discs: BagStatsDisc[] = [
        { id: '1' },
        { id: '2', category: 'Putter' },
      ];

      const result = calculateBagStats(discs);

      expect(result.categoriesCount).toBe(1);
    });
  });

  describe('stability classification', () => {
    it('classifies turn <= -2 as understable', () => {
      const discs: BagStatsDisc[] = [
        { id: '1', flight_numbers: { speed: 12, glide: 5, turn: -2, fade: 2 } },
        { id: '2', flight_numbers: { speed: 12, glide: 5, turn: -3, fade: 1 } },
        { id: '3', flight_numbers: { speed: 12, glide: 5, turn: -5, fade: 1 } },
      ];

      const result = calculateBagStats(discs);

      expect(result.stability.understable).toBe(3);
    });

    it('classifies turn > -2 AND turn <= 0 as stable', () => {
      const discs: BagStatsDisc[] = [
        { id: '1', flight_numbers: { speed: 12, glide: 5, turn: -1, fade: 2 } },
        { id: '2', flight_numbers: { speed: 5, glide: 4, turn: 0, fade: 1 } },
      ];

      const result = calculateBagStats(discs);

      expect(result.stability.stable).toBe(2);
    });

    it('classifies turn > 0 as overstable', () => {
      const discs: BagStatsDisc[] = [
        { id: '1', flight_numbers: { speed: 12, glide: 5, turn: 1, fade: 3 } },
        { id: '2', flight_numbers: { speed: 5, glide: 4, turn: 2, fade: 4 } },
      ];

      const result = calculateBagStats(discs);

      expect(result.stability.overstable).toBe(2);
    });
  });
});
