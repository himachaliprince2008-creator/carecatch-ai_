// src/__tests__/recommendation/recommendation.test.ts
import { calculateScore } from '@/lib/recommendation/score';
import { Hospital } from '@/lib/types';

describe('Recommendation scoring', () => {
  const baseHospital: Hospital = {
    id: 'h1',
    name: 'Test Hospital',
    latitude: 12.9716,
    longitude: 77.5946,
    cost: 5000,
    outcomeScore: 0.8,
    facilities: ['ICU', 'Emergency'],
    distanceKm: 0,
  };

  test('higher cost reduces score', () => {
    const cheap = { ...baseHospital, cost: 1000 };
    const expensive = { ...baseHospital, cost: 10000 };
    expect(calculateScore(cheap)).toBeGreaterThan(calculateScore(expensive));
  });

  test('closer distance improves score', () => {
    const near = { ...baseHospital, distanceKm: 5 };
    const far = { ...baseHospital, distanceKm: 50 };
    expect(calculateScore(near)).toBeGreaterThan(calculateScore(far));
  });

  test('better outcome score improves score', () => {
    const good = { ...baseHospital, outcomeScore: 0.9 };
    const bad = { ...baseHospital, outcomeScore: 0.5 };
    expect(calculateScore(good)).toBeGreaterThan(calculateScore(bad));
  });
});
