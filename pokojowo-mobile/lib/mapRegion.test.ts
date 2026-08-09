import { Dimensions } from 'react-native';
import {
  POLAND_REGION,
  regionAround,
  regionToBbox,
  regionToZoom,
} from './mapRegion';

jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(() => ({ width: 390, height: 844 })),
  },
}));

describe('map region helpers', () => {
  it('uses the viewport width to derive a stable tile zoom', () => {
    expect(regionToZoom(POLAND_REGION)).toBe(7);
    expect(regionToZoom({ ...POLAND_REGION, longitudeDelta: 0 })).toBe(12);
    expect(Dimensions.get).toHaveBeenCalledWith('window');
  });

  it('returns stable bounds that include the visible region', () => {
    const region = {
      latitude: 52,
      longitude: 21,
      latitudeDelta: 0.2,
      longitudeDelta: 0.3,
    };
    const bbox = regionToBbox(region);
    const [west, south, east, north] = bbox.split(',').map(Number);

    expect(west).toBeLessThanOrEqual(20.85);
    expect(south).toBeLessThanOrEqual(51.9);
    expect(east).toBeGreaterThanOrEqual(21.15);
    expect(north).toBeGreaterThanOrEqual(52.1);
    expect(bbox).toBe(regionToBbox(region));
  });

  it('creates a symmetric region around a pin', () => {
    expect(regionAround(52.1, 21.0, 0.04)).toEqual({
      latitude: 52.1,
      longitude: 21,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    });
  });
});
