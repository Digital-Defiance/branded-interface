import { brandedEnum } from './branded-enum.js';

describe('brandedEnum', () => {
  it('should work', () => {
    expect(brandedEnum()).toEqual('branded-enum');
  });
});
