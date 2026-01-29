/**
 * Property-based tests for factory module
 *
 * Feature: branded-enum
 */

import * as fc from 'fast-check';
import { createBrandedEnum } from './factory.js';
import { ENUM_ID, ENUM_VALUES, REGISTRY_KEY } from './types.js';
import { getRegistry, getEnumById } from './registry.js';

/**
 * Clears the global registry for test isolation.
 */
function clearRegistry(): void {
  const global = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: unknown;
  };
  delete global[REGISTRY_KEY];
}

// Arbitrary for valid enum ID (non-empty string, valid identifier format)
const enumIdArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s));

// Arbitrary for enum key (valid JS identifier, excluding __proto__)
const enumKeyArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s))
  .filter((s) => s !== '__proto__' && s !== 'constructor' && s !== '__defineGetter__' && s !== '__defineSetter__');

// Arbitrary for enum value (any non-empty string)
const enumValueArb = fc.string({ minLength: 1, maxLength: 100 });

// Arbitrary for a values object with unique keys
const valuesObjectArb = fc
  .dictionary(enumKeyArb, enumValueArb, { minKeys: 1, maxKeys: 10 })
  .filter((obj) => Object.keys(obj).length > 0);

describe('Feature: branded-enum, Property 1: Enum Creation Correctness', () => {
  /**
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.6**
   *
   * *For any* valid enum ID and values object, creating a branded enum SHALL:
   * - Return an object where all provided keys map to their corresponding values
   * - Attach metadata with the correct enum ID
   * - Attach metadata with a Set containing exactly the provided values
   * - Register the enum in the global registry
   * - Return raw string values when accessed (no wrappers)
   */

  beforeEach(() => {
    clearRegistry();
  });

  it('returns an object where all provided keys map to their corresponding values', () => {
    fc.assert(
      fc.property(
        fc.tuple(enumIdArb, valuesObjectArb),
        ([enumId, values]) => {
          clearRegistry();
          const uniqueId = `${enumId}_${Date.now()}_${Math.random()}`;
          const brandedEnum = createBrandedEnum(uniqueId, values);

          // Verify all keys map to correct values
          for (const [key, value] of Object.entries(values)) {
            expect(brandedEnum[key as keyof typeof brandedEnum]).toBe(value);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('attaches metadata with the correct enum ID', () => {
    fc.assert(
      fc.property(
        fc.tuple(enumIdArb, valuesObjectArb),
        ([enumId, values]) => {
          clearRegistry();
          const uniqueId = `${enumId}_${Date.now()}_${Math.random()}`;
          const brandedEnum = createBrandedEnum(uniqueId, values);

          // Verify ENUM_ID metadata
          expect(brandedEnum[ENUM_ID]).toBe(uniqueId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('attaches metadata with a Set containing exactly the provided values', () => {
    fc.assert(
      fc.property(
        fc.tuple(enumIdArb, valuesObjectArb),
        ([enumId, values]) => {
          clearRegistry();
          const uniqueId = `${enumId}_${Date.now()}_${Math.random()}`;
          const brandedEnum = createBrandedEnum(uniqueId, values);

          // Verify ENUM_VALUES metadata contains exactly the provided values
          const expectedValues = new Set(Object.values(values));
          const actualValues = brandedEnum[ENUM_VALUES];

          expect(actualValues.size).toBe(expectedValues.size);
          for (const value of expectedValues) {
            expect(actualValues.has(value)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('registers the enum in the global registry', () => {
    fc.assert(
      fc.property(
        fc.tuple(enumIdArb, valuesObjectArb),
        ([enumId, values]) => {
          clearRegistry();
          const uniqueId = `${enumId}_${Date.now()}_${Math.random()}`;
          const brandedEnum = createBrandedEnum(uniqueId, values);

          // Verify enum is registered
          const registry = getRegistry();
          expect(registry.enums.has(uniqueId)).toBe(true);
          expect(getEnumById(uniqueId)).toBe(brandedEnum);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns raw string values when accessed (no wrappers)', () => {
    fc.assert(
      fc.property(
        fc.tuple(enumIdArb, valuesObjectArb),
        ([enumId, values]) => {
          clearRegistry();
          const uniqueId = `${enumId}_${Date.now()}_${Math.random()}`;
          const brandedEnum = createBrandedEnum(uniqueId, values);

          // Verify values are raw strings (typeof === 'string')
          for (const key of Object.keys(values)) {
            const value = brandedEnum[key as keyof typeof brandedEnum];
            expect(typeof value).toBe('string');
            // Ensure it's not a wrapper object
            expect(value).not.toBeInstanceOf(Object);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Feature: branded-enum, Property 5: Duplicate ID Handling (Idempotent)', () => {
  /**
   * **Validates: Requirements 5.2**
   *
   * *For any* enum ID that has already been used to create a branded enum:
   * - Attempting to create another branded enum with the same ID SHALL return the existing enum
   * - This enables safe usage in module-scoped code that may be re-executed in test environments
   */

  beforeEach(() => {
    clearRegistry();
  });

  it('returns the existing enum when creating an enum with a duplicate ID', () => {
    fc.assert(
      fc.property(
        fc.tuple(enumIdArb, valuesObjectArb, valuesObjectArb),
        ([enumId, values1, values2]) => {
          clearRegistry();

          // Create first enum
          const enum1 = createBrandedEnum(enumId, values1);

          // Creating second enum with same ID should return the existing one
          const enum2 = createBrandedEnum(enumId, values2);
          expect(enum2).toBe(enum1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('allows creating enums with different IDs', () => {
    fc.assert(
      fc.property(
        fc.tuple(enumIdArb, enumIdArb, valuesObjectArb, valuesObjectArb),
        ([enumId1, enumId2, values1, values2]) => {
          clearRegistry();

          // Make IDs unique
          const uniqueId1 = `${enumId1}_first`;
          const uniqueId2 = `${enumId2}_second`;

          // Both should succeed without throwing
          expect(() => createBrandedEnum(uniqueId1, values1)).not.toThrow();
          expect(() => createBrandedEnum(uniqueId2, values2)).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Feature: branded-enum, Property 7: Serialization and Enumeration Correctness', () => {
  /**
   * **Validates: Requirements 6.1, 6.2, 6.3, 8.1, 8.2, 8.3, 8.4, 8.5**
   *
   * *For any* branded enum:
   * - `JSON.stringify(enum)` produces a JSON object containing only the user-defined key-value pairs (no metadata)
   * - `JSON.parse(JSON.stringify(enum))` equals the original values object
   * - `Object.keys(enum)` returns exactly the user-defined keys
   * - `Object.values(enum)` returns exactly the user-defined values
   * - `Object.entries(enum)` returns exactly the user-defined key-value pairs
   * - Spreading `{...enum}` copies only the user-defined properties
   * - The `in` operator returns true for user keys, false for metadata symbols
   */

  beforeEach(() => {
    clearRegistry();
  });

  it('JSON.stringify produces only user-defined key-value pairs', () => {
    fc.assert(
      fc.property(
        fc.tuple(enumIdArb, valuesObjectArb),
        ([enumId, values]) => {
          clearRegistry();
          const uniqueId = `${enumId}_${Date.now()}_${Math.random()}`;
          const brandedEnum = createBrandedEnum(uniqueId, values);

          const jsonString = JSON.stringify(brandedEnum);
          const parsed = JSON.parse(jsonString);

          // Should equal the original values object
          expect(parsed).toEqual(values);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('JSON.parse(JSON.stringify(enum)) equals the original values object', () => {
    fc.assert(
      fc.property(
        fc.tuple(enumIdArb, valuesObjectArb),
        ([enumId, values]) => {
          clearRegistry();
          const uniqueId = `${enumId}_${Date.now()}_${Math.random()}`;
          const brandedEnum = createBrandedEnum(uniqueId, values);

          const roundTripped = JSON.parse(JSON.stringify(brandedEnum));
          expect(roundTripped).toEqual(values);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Object.keys returns exactly the user-defined keys', () => {
    fc.assert(
      fc.property(
        fc.tuple(enumIdArb, valuesObjectArb),
        ([enumId, values]) => {
          clearRegistry();
          const uniqueId = `${enumId}_${Date.now()}_${Math.random()}`;
          const brandedEnum = createBrandedEnum(uniqueId, values);

          const keys = Object.keys(brandedEnum);
          const expectedKeys = Object.keys(values);

          expect(keys.sort()).toEqual(expectedKeys.sort());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Object.values returns exactly the user-defined values', () => {
    fc.assert(
      fc.property(
        fc.tuple(enumIdArb, valuesObjectArb),
        ([enumId, values]) => {
          clearRegistry();
          const uniqueId = `${enumId}_${Date.now()}_${Math.random()}`;
          const brandedEnum = createBrandedEnum(uniqueId, values);

          const enumValues = Object.values(brandedEnum);
          const expectedValues = Object.values(values);

          expect(enumValues.sort()).toEqual(expectedValues.sort());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Object.entries returns exactly the user-defined key-value pairs', () => {
    fc.assert(
      fc.property(
        fc.tuple(enumIdArb, valuesObjectArb),
        ([enumId, values]) => {
          clearRegistry();
          const uniqueId = `${enumId}_${Date.now()}_${Math.random()}`;
          const brandedEnum = createBrandedEnum(uniqueId, values);

          const entries = Object.entries(brandedEnum);
          const expectedEntries = Object.entries(values);

          // Sort by key for comparison
          const sortedEntries = entries.sort(([a], [b]) => a.localeCompare(b));
          const sortedExpected = expectedEntries.sort(([a], [b]) => a.localeCompare(b));

          expect(sortedEntries).toEqual(sortedExpected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('spreading copies only the user-defined properties', () => {
    fc.assert(
      fc.property(
        fc.tuple(enumIdArb, valuesObjectArb),
        ([enumId, values]) => {
          clearRegistry();
          const uniqueId = `${enumId}_${Date.now()}_${Math.random()}`;
          const brandedEnum = createBrandedEnum(uniqueId, values);

          const spread = { ...brandedEnum };

          // Should equal the original values object
          expect(spread).toEqual(values);

          // Should not have Symbol properties
          expect(Object.getOwnPropertySymbols(spread)).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('in operator returns true for user keys', () => {
    fc.assert(
      fc.property(
        fc.tuple(enumIdArb, valuesObjectArb),
        ([enumId, values]) => {
          clearRegistry();
          const uniqueId = `${enumId}_${Date.now()}_${Math.random()}`;
          const brandedEnum = createBrandedEnum(uniqueId, values);

          // All user keys should be found with 'in' operator
          for (const key of Object.keys(values)) {
            expect(key in brandedEnum).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('in operator returns false for non-existent keys', () => {
    fc.assert(
      fc.property(
        fc.tuple(enumIdArb, valuesObjectArb, fc.string({ minLength: 1, maxLength: 20 })),
        ([enumId, values, randomKey]) => {
          clearRegistry();
          const uniqueId = `${enumId}_${Date.now()}_${Math.random()}`;
          const brandedEnum = createBrandedEnum(uniqueId, values);

          // Create a key that definitely doesn't exist
          const nonExistentKey = `nonexistent_${randomKey}_${Date.now()}`;
          expect(nonExistentKey in brandedEnum).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
