/**
 * Property-based tests for merge module
 *
 * Feature: branded-enum
 */

import * as fc from 'fast-check';
import { createBrandedEnum } from './factory.js';
import { mergeEnums } from './merge.js';
import { ENUM_ID, ENUM_VALUES, REGISTRY_KEY } from './types.js';
import { getRegistry, findEnumSources } from './registry.js';

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
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s));

// Arbitrary for enum key (valid JS identifier, excluding reserved names)
const enumKeyArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s))
  .filter((s) => s !== '__proto__' && s !== 'constructor' && s !== '__defineGetter__' && s !== '__defineSetter__');

// Arbitrary for enum value (any non-empty string)
const enumValueArb = fc.string({ minLength: 1, maxLength: 50 });

/**
 * Generates a values object with guaranteed unique keys using a prefix.
 */
function valuesObjectWithPrefixArb(prefix: string) {
  return fc
    .dictionary(enumKeyArb, enumValueArb, { minKeys: 1, maxKeys: 5 })
    .filter((obj) => Object.keys(obj).length > 0)
    .map((obj) => {
      // Add prefix to all keys to ensure uniqueness across enums
      const prefixed: Record<string, string> = {};
      for (const [key, value] of Object.entries(obj)) {
        prefixed[`${prefix}_${key}`] = value;
      }
      return prefixed;
    });
}

describe('Feature: branded-enum, Property 13: Enum Merge Correctness', () => {
  /**
   * **Validates: Requirements 10.1, 10.2, 10.4**
   *
   * *For any* set of branded enums being merged:
   * - The merged enum contains all key-value pairs from all source enums
   * - Duplicate values (same value in multiple enums) are preserved
   * - The merged enum is registered in the global registry as a new enum
   * - `findEnumSources` for values in the merged enum includes the merged enum's ID
   */

  beforeEach(() => {
    clearRegistry();
  });

  it('merged enum contains all key-value pairs from all source enums', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          enumIdArb,
          enumIdArb,
          enumIdArb,
          valuesObjectWithPrefixArb('a'),
          valuesObjectWithPrefixArb('b')
        ),
        ([id1, id2, mergedId, values1, values2]) => {
          clearRegistry();
          const uniqueId1 = `${id1}_${Date.now()}_${Math.random()}`;
          const uniqueId2 = `${id2}_${Date.now()}_${Math.random()}`;
          const uniqueMergedId = `${mergedId}_merged_${Date.now()}_${Math.random()}`;

          const enum1 = createBrandedEnum(uniqueId1, values1);
          const enum2 = createBrandedEnum(uniqueId2, values2);

          const merged = mergeEnums(uniqueMergedId, enum1, enum2);

          // Verify all keys from enum1 are in merged
          for (const [key, value] of Object.entries(values1)) {
            expect(merged[key as keyof typeof merged]).toBe(value);
          }

          // Verify all keys from enum2 are in merged
          for (const [key, value] of Object.entries(values2)) {
            expect(merged[key as keyof typeof merged]).toBe(value);
          }

          // Verify merged has exactly the combined keys
          const mergedKeys = Object.keys(merged).sort();
          const expectedKeys = [...Object.keys(values1), ...Object.keys(values2)].sort();
          expect(mergedKeys).toEqual(expectedKeys);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('duplicate values (same value in multiple enums) are preserved', () => {
    fc.assert(
      fc.property(
        fc.tuple(enumIdArb, enumIdArb, enumIdArb, enumValueArb),
        ([id1, id2, mergedId, sharedValue]) => {
          clearRegistry();
          const uniqueId1 = `${id1}_${Date.now()}_${Math.random()}`;
          const uniqueId2 = `${id2}_${Date.now()}_${Math.random()}`;
          const uniqueMergedId = `${mergedId}_merged_${Date.now()}_${Math.random()}`;

          // Create two enums with the same value but different keys
          const values1: Record<string, string> = { KeyA: sharedValue };
          const values2: Record<string, string> = { KeyB: sharedValue };
          const enum1 = createBrandedEnum(uniqueId1, values1);
          const enum2 = createBrandedEnum(uniqueId2, values2);

          // Merging should succeed (duplicate values are allowed)
          const merged = mergeEnums(uniqueMergedId, enum1, enum2);

          // Both keys should exist with the same value
          expect((merged as Record<string, string>).KeyA).toBe(sharedValue);
          expect((merged as Record<string, string>).KeyB).toBe(sharedValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('merged enum is registered in the global registry as a new enum', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          enumIdArb,
          enumIdArb,
          enumIdArb,
          valuesObjectWithPrefixArb('a'),
          valuesObjectWithPrefixArb('b')
        ),
        ([id1, id2, mergedId, values1, values2]) => {
          clearRegistry();
          const uniqueId1 = `${id1}_${Date.now()}_${Math.random()}`;
          const uniqueId2 = `${id2}_${Date.now()}_${Math.random()}`;
          const uniqueMergedId = `${mergedId}_merged_${Date.now()}_${Math.random()}`;

          const enum1 = createBrandedEnum(uniqueId1, values1);
          const enum2 = createBrandedEnum(uniqueId2, values2);

          const merged = mergeEnums(uniqueMergedId, enum1, enum2);

          // Verify merged enum is registered
          const registry = getRegistry();
          expect(registry.enums.has(uniqueMergedId)).toBe(true);

          // Verify the registered enum is the same object
          const registeredEntry = registry.enums.get(uniqueMergedId);
          expect(registeredEntry?.enumObj).toBe(merged);
          expect(registeredEntry?.enumId).toBe(uniqueMergedId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('findEnumSources for values in merged enum includes the merged enum ID', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          enumIdArb,
          enumIdArb,
          enumIdArb,
          valuesObjectWithPrefixArb('a'),
          valuesObjectWithPrefixArb('b')
        ),
        ([id1, id2, mergedId, values1, values2]) => {
          clearRegistry();
          const uniqueId1 = `${id1}_${Date.now()}_${Math.random()}`;
          const uniqueId2 = `${id2}_${Date.now()}_${Math.random()}`;
          const uniqueMergedId = `${mergedId}_merged_${Date.now()}_${Math.random()}`;

          const enum1 = createBrandedEnum(uniqueId1, values1);
          const enum2 = createBrandedEnum(uniqueId2, values2);

          mergeEnums(uniqueMergedId, enum1, enum2);

          // Check that findEnumSources includes the merged enum ID for values from enum1
          for (const value of Object.values(values1)) {
            const sources = findEnumSources(value);
            expect(sources).toContain(uniqueMergedId);
            expect(sources).toContain(uniqueId1);
          }

          // Check that findEnumSources includes the merged enum ID for values from enum2
          for (const value of Object.values(values2)) {
            const sources = findEnumSources(value);
            expect(sources).toContain(uniqueMergedId);
            expect(sources).toContain(uniqueId2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('merged enum has correct metadata', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          enumIdArb,
          enumIdArb,
          enumIdArb,
          valuesObjectWithPrefixArb('a'),
          valuesObjectWithPrefixArb('b')
        ),
        ([id1, id2, mergedId, values1, values2]) => {
          clearRegistry();
          const uniqueId1 = `${id1}_${Date.now()}_${Math.random()}`;
          const uniqueId2 = `${id2}_${Date.now()}_${Math.random()}`;
          const uniqueMergedId = `${mergedId}_merged_${Date.now()}_${Math.random()}`;

          const enum1 = createBrandedEnum(uniqueId1, values1);
          const enum2 = createBrandedEnum(uniqueId2, values2);

          const merged = mergeEnums(uniqueMergedId, enum1, enum2);

          // Verify ENUM_ID metadata
          expect(merged[ENUM_ID]).toBe(uniqueMergedId);

          // Verify ENUM_VALUES contains all values from both enums
          const expectedValues = new Set([
            ...Object.values(values1),
            ...Object.values(values2),
          ]);
          const actualValues = merged[ENUM_VALUES];

          expect(actualValues.size).toBe(expectedValues.size);
          for (const value of expectedValues) {
            expect(actualValues.has(value)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Feature: branded-enum, Property 14: Merge Key Collision Rejection', () => {
  /**
   * **Validates: Requirements 10.3**
   *
   * *For any* set of branded enums where two or more have the same key:
   * - `mergeEnums` SHALL throw an error indicating the duplicate key
   */

  beforeEach(() => {
    clearRegistry();
  });

  it('throws an error when merging enums with duplicate keys', () => {
    fc.assert(
      fc.property(
        fc.tuple(enumIdArb, enumIdArb, enumIdArb, enumKeyArb, enumValueArb, enumValueArb),
        ([id1, id2, mergedId, sharedKey, value1, value2]) => {
          clearRegistry();
          const uniqueId1 = `${id1}_${Date.now()}_${Math.random()}`;
          const uniqueId2 = `${id2}_${Date.now()}_${Math.random()}`;
          const uniqueMergedId = `${mergedId}_merged_${Date.now()}_${Math.random()}`;

          // Create two enums with the same key
          const values1: Record<string, string> = { [sharedKey]: value1 };
          const values2: Record<string, string> = { [sharedKey]: value2 };
          const enum1 = createBrandedEnum(uniqueId1, values1);
          const enum2 = createBrandedEnum(uniqueId2, values2);

          // Merging should throw due to duplicate key
          expect(() => mergeEnums(uniqueMergedId, enum1, enum2)).toThrow(
            `Cannot merge enums: duplicate key "${sharedKey}" found`
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('error message includes the duplicate key name', () => {
    fc.assert(
      fc.property(
        fc.tuple(enumIdArb, enumIdArb, enumIdArb, enumKeyArb, enumValueArb, enumValueArb),
        ([id1, id2, mergedId, sharedKey, value1, value2]) => {
          clearRegistry();
          const uniqueId1 = `${id1}_${Date.now()}_${Math.random()}`;
          const uniqueId2 = `${id2}_${Date.now()}_${Math.random()}`;
          const uniqueMergedId = `${mergedId}_merged_${Date.now()}_${Math.random()}`;

          // Create two enums with the same key
          const values1: Record<string, string> = { [sharedKey]: value1 };
          const values2: Record<string, string> = { [sharedKey]: value2 };
          const enum1 = createBrandedEnum(uniqueId1, values1);
          const enum2 = createBrandedEnum(uniqueId2, values2);

          // Verify error message contains the key name
          try {
            mergeEnums(uniqueMergedId, enum1, enum2);
            fail('Expected mergeEnums to throw');
          } catch (error) {
            expect((error as Error).message).toContain(sharedKey);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('succeeds when enums have no overlapping keys', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          enumIdArb,
          enumIdArb,
          enumIdArb,
          valuesObjectWithPrefixArb('first'),
          valuesObjectWithPrefixArb('second')
        ),
        ([id1, id2, mergedId, values1, values2]) => {
          clearRegistry();
          const uniqueId1 = `${id1}_${Date.now()}_${Math.random()}`;
          const uniqueId2 = `${id2}_${Date.now()}_${Math.random()}`;
          const uniqueMergedId = `${mergedId}_merged_${Date.now()}_${Math.random()}`;

          const enum1 = createBrandedEnum(uniqueId1, values1);
          const enum2 = createBrandedEnum(uniqueId2, values2);

          // Should not throw when keys are unique
          expect(() => mergeEnums(uniqueMergedId, enum1, enum2)).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});
