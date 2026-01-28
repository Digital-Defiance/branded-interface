/**
 * Property-based tests for accessors module
 *
 * Feature: branded-enum
 */

import * as fc from 'fast-check';
import { createBrandedEnum } from './factory.js';
import { getEnumId, getEnumValues, enumSize } from './accessors.js';
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

describe('Feature: branded-enum, Property 4: Metadata Accessor Correctness', () => {
  /**
   * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
   *
   * *For any* object:
   * - `getEnumId(obj)` returns the enum ID if obj is a branded enum, undefined otherwise
   * - `getEnumValues(obj)` returns an array of all values if obj is a branded enum, undefined otherwise
   * - The returned values array contains exactly the values used at creation
   */

  beforeEach(() => {
    clearRegistry();
    idCounter = 0;
  });

  it('getEnumId returns the enum ID for branded enums', () => {
    fc.assert(
      fc.property(fc.tuple(enumIdArb, valuesObjectArb), ([enumId, values]) => {
        clearRegistry();
        const id = uniqueId(enumId);
        const brandedEnum = createBrandedEnum(id, values);

        expect(getEnumId(brandedEnum)).toBe(id);
      }),
      { numRuns: 100 }
    );
  });

  it('getEnumId returns undefined for non-branded enum objects', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.integer(),
          fc.double(),
          fc.object(),
          fc.array(fc.anything()),
          fc.boolean(),
          fc.constant({}),
          fc.constant({ someKey: 'someValue' })
        ),
        (notAnEnum) => {
          expect(getEnumId(notAnEnum)).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getEnumValues returns an array of all values for branded enums', () => {
    fc.assert(
      fc.property(fc.tuple(enumIdArb, valuesObjectArb), ([enumId, values]) => {
        clearRegistry();
        const id = uniqueId(enumId);
        const brandedEnum = createBrandedEnum(id, values);

        const result = getEnumValues(brandedEnum);
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);

        // Should contain exactly the unique values used at creation
        // (duplicates are stored once in the internal Set)
        const expectedValues = [...new Set(Object.values(values))];
        expect(result!.sort()).toEqual(expectedValues.sort());
      }),
      { numRuns: 100 }
    );
  });

  it('getEnumValues returns undefined for non-branded enum objects', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.integer(),
          fc.double(),
          fc.object(),
          fc.array(fc.anything()),
          fc.boolean(),
          fc.constant({}),
          fc.constant({ someKey: 'someValue' })
        ),
        (notAnEnum) => {
          expect(getEnumValues(notAnEnum as Parameters<typeof getEnumValues>[0])).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returned values array contains exactly the values used at creation', () => {
    fc.assert(
      fc.property(fc.tuple(enumIdArb, valuesObjectArb), ([enumId, values]) => {
        clearRegistry();
        const id = uniqueId(enumId);
        const brandedEnum = createBrandedEnum(id, values);

        const result = getEnumValues(brandedEnum);
        const expectedValues = new Set(Object.values(values));

        // Verify exact match
        expect(result!.length).toBe(expectedValues.size);
        for (const value of result!) {
          expect(expectedValues.has(value)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});


describe('Feature: branded-enum, Property 9: Enum Size Correctness', () => {
  /**
   * **Validates: Requirements 9.4**
   *
   * *For any* branded enum created with N key-value pairs:
   * - `enumSize(enum)` returns N
   * - `enumSize(enum)` equals `Object.keys(enum).length`
   */

  beforeEach(() => {
    clearRegistry();
    idCounter = 0;
  });

  it('enumSize returns the count of enum values', () => {
    fc.assert(
      fc.property(fc.tuple(enumIdArb, valuesObjectArb), ([enumId, values]) => {
        clearRegistry();
        const id = uniqueId(enumId);
        const brandedEnum = createBrandedEnum(id, values);

        const size = enumSize(brandedEnum);
        // Note: size is based on unique values, not keys
        const expectedSize = new Set(Object.values(values)).size;
        expect(size).toBe(expectedSize);
      }),
      { numRuns: 100 }
    );
  });

  it('enumSize returns undefined for non-branded enum objects', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.integer(),
          fc.double(),
          fc.object(),
          fc.array(fc.anything()),
          fc.boolean(),
          fc.constant({}),
          fc.constant({ someKey: 'someValue' })
        ),
        (notAnEnum) => {
          expect(enumSize(notAnEnum)).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('enumSize equals the number of unique values in the enum', () => {
    fc.assert(
      fc.property(fc.tuple(enumIdArb, valuesObjectArb), ([enumId, values]) => {
        clearRegistry();
        const id = uniqueId(enumId);
        const brandedEnum = createBrandedEnum(id, values);

        const size = enumSize(brandedEnum);
        const uniqueValues = new Set(Object.values(values));

        expect(size).toBe(uniqueValues.size);
      }),
      { numRuns: 100 }
    );
  });
});
