/**
 * Property-based tests for registry module
 *
 * Feature: branded-enum
 */

import * as fc from 'fast-check';
import {
  getRegistry,
  registerEnum,
  getAllEnumIds,
  getEnumById,
  findEnumSources,
} from './registry.js';
import { BrandedEnum, ENUM_ID, ENUM_VALUES, REGISTRY_KEY } from './types.js';

/**
 * Helper to create a branded enum for testing purposes.
 * This is a minimal implementation used only for testing the registry.
 */
function createTestBrandedEnum<T extends Record<string, string>>(
  enumId: string,
  values: T
): BrandedEnum<T> {
  const valueSet = new Set(Object.values(values));
  const enumObj = { ...values } as BrandedEnum<T>;

  Object.defineProperty(enumObj, ENUM_ID, {
    value: enumId,
    enumerable: false,
    writable: false,
    configurable: false,
  });

  Object.defineProperty(enumObj, ENUM_VALUES, {
    value: valueSet,
    enumerable: false,
    writable: false,
    configurable: false,
  });

  Object.freeze(enumObj);
  return enumObj;
}

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

// Arbitrary for enum key (valid JS identifier)
const enumKeyArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s));

// Arbitrary for enum value (any non-empty string)
const enumValueArb = fc.string({ minLength: 1, maxLength: 100 });

// Arbitrary for a values object with unique keys
const valuesObjectArb = fc
  .dictionary(enumKeyArb, enumValueArb, { minKeys: 1, maxKeys: 10 })
  .filter((obj) => Object.keys(obj).length > 0);

describe('Feature: branded-enum, Property 6: Registry Lookup Correctness', () => {
  /**
   * **Validates: Requirements 5.3, 5.4, 5.5**
   *
   * *For any* set of created branded enums:
   * - `getAllEnumIds()` returns an array containing exactly the IDs of all created enums
   * - `getEnumById(id)` returns the branded enum object for valid IDs
   * - `getEnumById(id)` returns undefined for IDs that were never registered
   */

  beforeEach(() => {
    clearRegistry();
  });

  it('getAllEnumIds returns exactly the IDs of all registered enums', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(enumIdArb, valuesObjectArb), {
          minLength: 1,
          maxLength: 5,
        }),
        (enumSpecs) => {
          clearRegistry();

          // Make IDs unique by appending index
          const uniqueSpecs = enumSpecs.map(([id, values], idx) => [
            `${id}_${idx}`,
            values,
          ]) as [string, Record<string, string>][];

          // Register all enums
          const registeredIds: string[] = [];
          for (const [id, values] of uniqueSpecs) {
            const enumObj = createTestBrandedEnum(id, values);
            registerEnum(enumObj);
            registeredIds.push(id);
          }

          // Verify getAllEnumIds returns exactly the registered IDs
          const allIds = getAllEnumIds();
          expect(allIds.sort()).toEqual(registeredIds.sort());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getEnumById returns the correct enum for valid IDs', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(enumIdArb, valuesObjectArb), {
          minLength: 1,
          maxLength: 5,
        }),
        (enumSpecs) => {
          clearRegistry();

          // Make IDs unique by appending index
          const uniqueSpecs = enumSpecs.map(([id, values], idx) => [
            `${id}_${idx}`,
            values,
          ]) as [string, Record<string, string>][];

          // Register all enums and store references
          const enumMap = new Map<string, BrandedEnum<Record<string, string>>>();
          for (const [id, values] of uniqueSpecs) {
            const enumObj = createTestBrandedEnum(id, values);
            registerEnum(enumObj);
            enumMap.set(id, enumObj);
          }

          // Verify getEnumById returns the correct enum for each ID
          for (const [id, expectedEnum] of enumMap) {
            const retrieved = getEnumById(id);
            expect(retrieved).toBe(expectedEnum);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getEnumById returns undefined for unregistered IDs', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.array(fc.tuple(enumIdArb, valuesObjectArb), {
            minLength: 0,
            maxLength: 3,
          }),
          enumIdArb
        ),
        ([enumSpecs, unknownId]) => {
          clearRegistry();

          // Make IDs unique by appending index
          const uniqueSpecs = enumSpecs.map(([id, values], idx) => [
            `${id}_${idx}`,
            values,
          ]) as [string, Record<string, string>][];

          // Register all enums
          const registeredIds = new Set<string>();
          for (const [id, values] of uniqueSpecs) {
            const enumObj = createTestBrandedEnum(id, values);
            registerEnum(enumObj);
            registeredIds.add(id);
          }

          // Create an ID that's definitely not registered
          const unregisteredId = `unregistered_${unknownId}_${Date.now()}`;

          // Verify getEnumById returns undefined for unregistered ID
          expect(getEnumById(unregisteredId)).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Feature: branded-enum, Property 3: Find Enum Sources Correctness', () => {
  /**
   * **Validates: Requirements 3.1, 3.2, 3.3**
   *
   * *For any* string value:
   * - `findEnumSources(value)` returns an array containing exactly the IDs of all enums that contain that value
   * - If no enums contain the value, returns an empty array
   * - If multiple enums contain the same value, all their IDs are included
   */

  beforeEach(() => {
    clearRegistry();
  });

  it('findEnumSources returns exactly the IDs of enums containing the value', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(enumIdArb, valuesObjectArb), {
          minLength: 1,
          maxLength: 5,
        }),
        (enumSpecs) => {
          clearRegistry();

          // Make IDs unique by appending index
          const uniqueSpecs = enumSpecs.map(([id, values], idx) => [
            `${id}_${idx}`,
            values,
          ]) as [string, Record<string, string>][];

          // Register all enums and track which values belong to which enums
          const valueToEnumIds = new Map<string, Set<string>>();
          for (const [id, values] of uniqueSpecs) {
            const enumObj = createTestBrandedEnum(id, values);
            registerEnum(enumObj);

            for (const value of Object.values(values)) {
              if (!valueToEnumIds.has(value)) {
                valueToEnumIds.set(value, new Set());
              }
              valueToEnumIds.get(value)!.add(id);
            }
          }

          // Verify findEnumSources returns correct IDs for each value
          for (const [value, expectedIds] of valueToEnumIds) {
            const foundIds = findEnumSources(value);
            expect(foundIds.sort()).toEqual(Array.from(expectedIds).sort());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('findEnumSources returns empty array for values not in any enum', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.array(fc.tuple(enumIdArb, valuesObjectArb), {
            minLength: 0,
            maxLength: 3,
          }),
          fc.string({ minLength: 1, maxLength: 50 })
        ),
        ([enumSpecs, randomValue]) => {
          clearRegistry();

          // Make IDs unique by appending index
          const uniqueSpecs = enumSpecs.map(([id, values], idx) => [
            `${id}_${idx}`,
            values,
          ]) as [string, Record<string, string>][];

          // Collect all values that will be registered
          const allValues = new Set<string>();
          for (const [id, values] of uniqueSpecs) {
            const enumObj = createTestBrandedEnum(id, values);
            registerEnum(enumObj);
            for (const value of Object.values(values)) {
              allValues.add(value);
            }
          }

          // Create a value that's definitely not in any enum
          const nonExistentValue = `nonexistent_${randomValue}_${Date.now()}`;

          // Verify findEnumSources returns empty array
          expect(findEnumSources(nonExistentValue)).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('findEnumSources returns all enum IDs when multiple enums share a value', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.array(enumIdArb, { minLength: 2, maxLength: 5 }),
          enumValueArb
        ),
        ([enumIds, sharedValue]) => {
          clearRegistry();

          // Make IDs unique
          const uniqueIds = enumIds.map((id, idx) => `${id}_${idx}`);

          // Create enums that all share the same value
          for (const id of uniqueIds) {
            const values = { SharedKey: sharedValue };
            const enumObj = createTestBrandedEnum(id, values);
            registerEnum(enumObj);
          }

          // Verify findEnumSources returns all enum IDs
          const foundIds = findEnumSources(sharedValue);
          expect(foundIds.sort()).toEqual(uniqueIds.sort());
        }
      ),
      { numRuns: 100 }
    );
  });
});
