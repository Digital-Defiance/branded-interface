/**
 * Property-based tests for utils module
 *
 * Feature: branded-enum
 */

import * as fc from 'fast-check';
import { createBrandedEnum } from './factory.js';
import { hasValue, getKeyForValue, isValidKey, enumEntries } from './utils.js';
import { REGISTRY_KEY } from './types.js';

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

// Arbitrary for enum key (valid JS identifier, excluding reserved names)
const enumKeyArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s))
  .filter(
    (s) =>
      s !== '__proto__' &&
      s !== 'constructor' &&
      s !== '__defineGetter__' &&
      s !== '__defineSetter__'
  );

// Arbitrary for enum value (any non-empty string)
const enumValueArb = fc.string({ minLength: 1, maxLength: 100 });

// Arbitrary for a values object with unique keys
const valuesObjectArb = fc
  .dictionary(enumKeyArb, enumValueArb, { minKeys: 1, maxKeys: 10 })
  .filter((obj) => Object.keys(obj).length > 0);

// Counter for unique IDs
let idCounter = 0;

/**
 * Creates a unique enum ID for test isolation.
 */
function uniqueId(base: string): string {
  return `${base}_${Date.now()}_${++idCounter}`;
}

describe('Feature: branded-enum, Property 8: Reverse Lookup Correctness', () => {
  /**
   * **Validates: Requirements 9.1, 9.2, 9.3**
   *
   * *For any* branded enum and any value:
   * - `hasValue(enum, value)` returns true if and only if the value exists in the enum
   * - `getKeyForValue(enum, value)` returns the key that maps to the value if it exists
   * - `getKeyForValue(enum, value)` returns undefined if the value doesn't exist
   * - For all values in an enum, `enum[getKeyForValue(enum, value)] === value`
   */

  beforeEach(() => {
    clearRegistry();
    idCounter = 0;
  });

  it('hasValue returns true if and only if the value exists in the enum', () => {
    fc.assert(
      fc.property(fc.tuple(enumIdArb, valuesObjectArb), ([enumId, values]) => {
        clearRegistry();
        const id = uniqueId(enumId);
        const brandedEnum = createBrandedEnum(id, values);

        // All values in the enum should return true
        for (const value of Object.values(values)) {
          expect(hasValue(brandedEnum, value)).toBe(true);
        }

        // A value not in the enum should return false
        const nonExistentValue = `nonexistent_${Date.now()}_${Math.random()}`;
        expect(hasValue(brandedEnum, nonExistentValue)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('getKeyForValue returns the key that maps to the value if it exists', () => {
    fc.assert(
      fc.property(fc.tuple(enumIdArb, valuesObjectArb), ([enumId, values]) => {
        clearRegistry();
        const id = uniqueId(enumId);
        const brandedEnum = createBrandedEnum(id, values);

        // For each key-value pair, getKeyForValue should return a key that maps to the value
        for (const value of Object.values(values)) {
          const foundKey = getKeyForValue(brandedEnum, value);
          expect(foundKey).toBeDefined();
          // The found key should map to the same value
          expect(brandedEnum[foundKey as keyof typeof brandedEnum]).toBe(value);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('getKeyForValue returns undefined if the value does not exist', () => {
    fc.assert(
      fc.property(fc.tuple(enumIdArb, valuesObjectArb), ([enumId, values]) => {
        clearRegistry();
        const id = uniqueId(enumId);
        const brandedEnum = createBrandedEnum(id, values);

        // A value not in the enum should return undefined
        const nonExistentValue = `nonexistent_${Date.now()}_${Math.random()}`;
        expect(getKeyForValue(brandedEnum, nonExistentValue)).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  it('for all values in an enum, enum[getKeyForValue(enum, value)] === value', () => {
    fc.assert(
      fc.property(fc.tuple(enumIdArb, valuesObjectArb), ([enumId, values]) => {
        clearRegistry();
        const id = uniqueId(enumId);
        const brandedEnum = createBrandedEnum(id, values);

        // For each value, the round-trip should work
        for (const value of Object.values(values)) {
          const key = getKeyForValue(brandedEnum, value);
          expect(key).toBeDefined();
          expect(brandedEnum[key as keyof typeof brandedEnum]).toBe(value);
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: branded-enum, Property 11: Key Validation Correctness', () => {
  /**
   * **Validates: Requirements 9.6**
   *
   * *For any* branded enum and any key:
   * - `isValidKey(enum, key)` returns true if and only if the key exists in the enum
   * - `isValidKey(enum, key)` returns false for metadata symbol keys
   */

  beforeEach(() => {
    clearRegistry();
    idCounter = 0;
  });

  it('isValidKey returns true if and only if the key exists in the enum', () => {
    fc.assert(
      fc.property(fc.tuple(enumIdArb, valuesObjectArb), ([enumId, values]) => {
        clearRegistry();
        const id = uniqueId(enumId);
        const brandedEnum = createBrandedEnum(id, values);

        // All keys in the enum should return true
        for (const key of Object.keys(values)) {
          expect(isValidKey(brandedEnum, key)).toBe(true);
        }

        // A key not in the enum should return false
        const nonExistentKey = `nonexistent_${Date.now()}_${Math.random()}`;
        expect(isValidKey(brandedEnum, nonExistentKey)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('isValidKey returns false for non-string keys', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          enumIdArb,
          valuesObjectArb,
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.integer(),
            fc.double(),
            fc.object(),
            fc.array(fc.anything()),
            fc.boolean()
          )
        ),
        ([enumId, values, nonStringKey]) => {
          clearRegistry();
          const id = uniqueId(enumId);
          const brandedEnum = createBrandedEnum(id, values);

          expect(isValidKey(brandedEnum, nonStringKey)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isValidKey returns false when enumObj is not a branded enum', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.string({ minLength: 1 }),
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.integer(),
            fc.object(),
            fc.array(fc.anything()),
            fc.constant({}),
            fc.constant({ someKey: 'someValue' })
          )
        ),
        ([key, notAnEnum]) => {
          expect(
            isValidKey(notAnEnum as Parameters<typeof isValidKey>[0], key)
          ).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: branded-enum, Property 10: Enum Entries Iterator Correctness', () => {
  /**
   * **Validates: Requirements 9.5**
   *
   * *For any* branded enum:
   * - `enumEntries(enum)` yields exactly the same pairs as `Object.entries(enum)`
   * - Collecting all entries produces an array equal to `Object.entries(enum)`
   */

  beforeEach(() => {
    clearRegistry();
    idCounter = 0;
  });

  it('enumEntries yields exactly the same pairs as Object.entries', () => {
    fc.assert(
      fc.property(fc.tuple(enumIdArb, valuesObjectArb), ([enumId, values]) => {
        clearRegistry();
        const id = uniqueId(enumId);
        const brandedEnum = createBrandedEnum(id, values);

        const entriesFromIterator = [...enumEntries(brandedEnum)];
        const entriesFromObject = Object.entries(brandedEnum);

        expect(entriesFromIterator.length).toBe(entriesFromObject.length);

        // Convert to maps for comparison (order may vary)
        const mapFromIterator = new Map(entriesFromIterator);
        const mapFromObject = new Map(entriesFromObject);

        expect(mapFromIterator.size).toBe(mapFromObject.size);

        for (const [key, value] of mapFromIterator) {
          expect(mapFromObject.get(key as string)).toBe(value);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('collecting all entries produces an array equal to Object.entries', () => {
    fc.assert(
      fc.property(fc.tuple(enumIdArb, valuesObjectArb), ([enumId, values]) => {
        clearRegistry();
        const id = uniqueId(enumId);
        const brandedEnum = createBrandedEnum(id, values);

        const collected: [string, string][] = [];
        for (const entry of enumEntries(brandedEnum)) {
          collected.push(entry as [string, string]);
        }

        const expected = Object.entries(brandedEnum);

        // Sort both arrays for comparison
        const sortedCollected = [...collected].sort((a, b) =>
          a[0].localeCompare(b[0])
        );
        const sortedExpected = [...expected].sort((a, b) =>
          a[0].localeCompare(b[0])
        );

        expect(sortedCollected).toEqual(sortedExpected);
      }),
      { numRuns: 100 }
    );
  });

  it('enumEntries returns empty iterator for non-branded-enum objects', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.integer(),
          fc.object(),
          fc.array(fc.anything()),
          fc.constant({}),
          fc.constant({ someKey: 'someValue' })
        ),
        (notAnEnum) => {
          const entries = [
            ...enumEntries(notAnEnum as Parameters<typeof enumEntries>[0]),
          ];
          expect(entries).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });
});
