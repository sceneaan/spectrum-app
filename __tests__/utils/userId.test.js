import { getUserId, getEntityId, getProviderId } from '../../src/utils/userId';

describe('userId helpers', () => {
  test('getUserId prefers id over _id', () => {
    expect(getUserId({ id: 'abc', _id: 'xyz' })).toBe('abc');
    expect(getUserId({ _id: 'xyz' })).toBe('xyz');
    expect(getUserId(null)).toBeNull();
  });

  test('getEntityId handles objects and primitives', () => {
    expect(getEntityId({ appointmentId: 'a1' })).toBe('a1');
    expect(getEntityId({ id: 'i1', _id: 'x' })).toBe('i1');
    expect(getEntityId('raw-id')).toBe('raw-id');
    expect(getEntityId(undefined)).toBeNull();
  });

  test('getProviderId handles populated and string refs', () => {
    expect(getProviderId({ id: 'p1' })).toBe('p1');
    expect(getProviderId('p2')).toBe('p2');
  });
});
