import { calculateShippingCost, isPunjab, getAllStates, getCitiesForState } from '../locationUtils';

describe('locationUtils', () => {
  describe('calculateShippingCost', () => {
    it('should return 0 for orders above ₹2999 regardless of state', () => {
      expect(calculateShippingCost('Punjab', 3000)).toBe(0);
      expect(calculateShippingCost('Maharashtra', 3500)).toBe(0);
      expect(calculateShippingCost('Delhi', 5000)).toBe(0);
    });

    it('should return ₹49 for Punjab when order value is ≤ ₹2999', () => {
      expect(calculateShippingCost('Punjab', 1000)).toBe(49);
      expect(calculateShippingCost('punjab', 2999)).toBe(49);
      expect(calculateShippingCost('PUNJAB', 500)).toBe(49);
    });

    it('should return ₹99 for other states when order value is ≤ ₹2999', () => {
      expect(calculateShippingCost('Maharashtra', 1000)).toBe(99);
      expect(calculateShippingCost('Delhi', 2999)).toBe(99);
      expect(calculateShippingCost('Karnataka', 500)).toBe(99);
    });
  });

  describe('isPunjab', () => {
    it('should detect Punjab correctly (case-insensitive)', () => {
      expect(isPunjab('Punjab')).toBe(true);
      expect(isPunjab('punjab')).toBe(true);
      expect(isPunjab('PUNJAB')).toBe(true);
      expect(isPunjab('Maharashtra')).toBe(false);
      expect(isPunjab('Delhi')).toBe(false);
    });
  });

  describe('getAllStates', () => {
    it('should return all Indian states', () => {
      const states = getAllStates();
      expect(states).toContain('Punjab');
      expect(states).toContain('Maharashtra');
      expect(states).toContain('Delhi');
      expect(states.length).toBeGreaterThan(30); // India has 36 states/UTs
    });

    it('should return states in sorted order', () => {
      const states = getAllStates();
      const sortedStates = [...states].sort();
      expect(states).toEqual(sortedStates);
    });
  });

  describe('getCitiesForState', () => {
    it('should return cities for Punjab', () => {
      const cities = getCitiesForState('Punjab');
      expect(cities).toContain('Amritsar');
      expect(cities).toContain('Ludhiana');
      expect(cities).toContain('Jalandhar');
    });

    it('should return cities for Maharashtra', () => {
      const cities = getCitiesForState('Maharashtra');
      expect(cities).toContain('Mumbai');
      expect(cities).toContain('Pune');
      expect(cities).toContain('Nagpur');
    });

    it('should return empty array for invalid state', () => {
      const cities = getCitiesForState('InvalidState');
      expect(cities).toEqual([]);
    });

    it('should be case-insensitive', () => {
      const cities1 = getCitiesForState('Punjab');
      const cities2 = getCitiesForState('punjab');
      expect(cities1).toEqual(cities2);
    });
  });
});
