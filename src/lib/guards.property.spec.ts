/**
 * Property-based tests for guards module
 *
 * Feature: branded-enum
 */

import * as fc from 'fast-check';
import { createBrandedEnum } from './factory.js';
import { isFromEnum, assertFromEnum, parseEnum, safeParseEnum } from './guards.js';
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

describe('Feature: branded-enum, Property 2: Type Guard Correctness', () => {
  /**
   * **Validates: Requirements 2.1, 2.2, 2.4, 2.5**
   *
   * *For any* branded enum and any value:
   * - `isFromEnum(value, enum)` returns `true` if and only if the value exists in the enum's value set
   * - `isFromEnum` returns `false` for non-string values (null, undefined, numbers, objects)
   * - `isFromEnum` returns `false` when the second argument is not a branded enum
   */

  beforeEach(() => {
    clearRegistry();
    idCounter = 0;
  });

  it('returns true if and only if the value exists in the enum value set', () => {
    fc.assert(
      fc.property(fc.tuple(enumIdArb, valuesObjectArb), ([enumId, values]) => {
        clearRegistry();
        const id = uniqueId(enumId);
        const brandedEnum = createBrandedEnum(id, values);

        // All values in the enum should return true
        for (const value of Object.values(values)) {
          expect(isFromEnum(value, brandedEnum)).toBe(true);
        }

        // A value not in the enum should return false
        const nonExistentValue = `nonexistent_${Date.now()}_${Math.random()}`;
        expect(isFromEnum(nonExistentValue, brandedEnum)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('returns false for non-string values (null, undefined, numbers, objects)', () => {
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
        ([enumId, values, nonStringValue]) => {
          clearRegistry();
          const id = uniqueId(enumId);
          const brandedEnum = createBrandedEnum(id, values);

          expect(isFromEnum(nonStringValue, brandedEnum)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns false when the second argument is not a branded enum', () => {
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
        ([value, notAnEnum]) => {
          // isFromEnum should return false for non-branded-enum objects
          expect(
            isFromEnum(value, notAnEnum as Parameters<typeof isFromEnum>[1])
          ).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Feature: branded-enum, Property 12: Assert Type Guard Correctness', () => {
  /**
   * **Validates: Requirements 9.7, 9.8**
   *
   * *For any* branded enum and any value:
   * - `assertFromEnum(value, enum)` returns the value unchanged if it exists in the enum
   * - `assertFromEnum(value, enum)` throws an error if the value doesn't exist in the enum
   * - The thrown error message includes the value and enum ID for debugging
   */

  beforeEach(() => {
    clearRegistry();
    idCounter = 0;
  });

  it('returns the value unchanged if it exists in the enum', () => {
    fc.assert(
      fc.property(fc.tuple(enumIdArb, valuesObjectArb), ([enumId, values]) => {
        clearRegistry();
        const id = uniqueId(enumId);
        const brandedEnum = createBrandedEnum(id, values);

        // All values in the enum should be returned unchanged
        for (const value of Object.values(values)) {
          const result = assertFromEnum(value, brandedEnum);
          expect(result).toBe(value);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('throws an error if the value does not exist in the enum', () => {
    fc.assert(
      fc.property(
        fc.tuple(enumIdArb, valuesObjectArb, fc.string({ minLength: 1 })),
        ([enumId, values, randomValue]) => {
          clearRegistry();
          const id = uniqueId(enumId);
          const brandedEnum = createBrandedEnum(id, values);

          // Create a value that definitely doesn't exist
          const nonExistentValue = `nonexistent_${randomValue}_${Date.now()}`;

          expect(() => assertFromEnum(nonExistentValue, brandedEnum)).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('thrown error message includes the value and enum ID', () => {
    fc.assert(
      fc.property(
        fc.tuple(enumIdArb, valuesObjectArb, fc.string({ minLength: 1 })),
        ([enumId, values, randomValue]) => {
          clearRegistry();
          const id = uniqueId(enumId);
          const brandedEnum = createBrandedEnum(id, values);

          // Create a value that definitely doesn't exist
          const nonExistentValue = `nonexistent_${randomValue}_${Date.now()}`;

          try {
            assertFromEnum(nonExistentValue, brandedEnum);
            // Should not reach here
            expect(true).toBe(false);
          } catch (error) {
            const message = (error as Error).message;
            // Error message should include the value and enum ID
            expect(message).toContain(nonExistentValue);
            expect(message).toContain(id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('throws an error if the second argument is not a branded enum', () => {
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
        ([value, notAnEnum]) => {
          expect(() =>
            assertFromEnum(
              value,
              notAnEnum as Parameters<typeof assertFromEnum>[1]
            )
          ).toThrow('Second argument is not a branded enum');
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('parseEnum', () => {
  /**
   * Tests for parseEnum - safe parsing with default value.
   * Alternative to assertFromEnum that doesn't throw.
   */

  beforeEach(() => {
    clearRegistry();
    idCounter = 0;
  });

  describe('basic functionality', () => {
    it('returns the value unchanged if it exists in the enum', () => {
      fc.assert(
        fc.property(fc.tuple(enumIdArb, valuesObjectArb), ([enumId, values]) => {
          clearRegistry();
          const id = uniqueId(enumId);
          const brandedEnum = createBrandedEnum(id, values);
          const allValues = Object.values(values);
          const defaultValue = allValues[0];

          // All values in the enum should be returned unchanged
          for (const value of allValues) {
            const result = parseEnum(value, brandedEnum, defaultValue);
            expect(result).toBe(value);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('returns the default value if the value does not exist in the enum', () => {
      fc.assert(
        fc.property(
          fc.tuple(enumIdArb, valuesObjectArb, fc.string({ minLength: 1 })),
          ([enumId, values, randomValue]) => {
            clearRegistry();
            const id = uniqueId(enumId);
            const brandedEnum = createBrandedEnum(id, values);
            const allValues = Object.values(values);
            const defaultValue = allValues[0];

            // Create a value that definitely doesn't exist
            const nonExistentValue = `nonexistent_${randomValue}_${Date.now()}`;

            const result = parseEnum(nonExistentValue, brandedEnum, defaultValue);
            expect(result).toBe(defaultValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns the default value for non-string values', () => {
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
          ([enumId, values, nonStringValue]) => {
            clearRegistry();
            const id = uniqueId(enumId);
            const brandedEnum = createBrandedEnum(id, values);
            const allValues = Object.values(values);
            const defaultValue = allValues[0];

            const result = parseEnum(nonStringValue, brandedEnum, defaultValue);
            expect(result).toBe(defaultValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('never throws an error (unlike assertFromEnum)', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            enumIdArb,
            valuesObjectArb,
            fc.oneof(
              fc.string(),
              fc.constant(null),
              fc.constant(undefined),
              fc.integer(),
              fc.object()
            )
          ),
          ([enumId, values, anyValue]) => {
            clearRegistry();
            const id = uniqueId(enumId);
            const brandedEnum = createBrandedEnum(id, values);
            const allValues = Object.values(values);
            const defaultValue = allValues[0];

            // Should never throw
            expect(() => parseEnum(anyValue, brandedEnum, defaultValue)).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('default value selection', () => {
    it('can use any valid enum value as the default', () => {
      fc.assert(
        fc.property(fc.tuple(enumIdArb, valuesObjectArb), ([enumId, values]) => {
          clearRegistry();
          const id = uniqueId(enumId);
          const brandedEnum = createBrandedEnum(id, values);
          const allValues = Object.values(values);

          // Test with each value as the default
          for (const defaultValue of allValues) {
            const result = parseEnum('nonexistent', brandedEnum, defaultValue);
            expect(result).toBe(defaultValue);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});


describe('safeParseEnum', () => {
  /**
   * Tests for safeParseEnum - validated deserialization with result object.
   * Returns { success: true, value } | { success: false, error }
   */

  beforeEach(() => {
    clearRegistry();
    idCounter = 0;
  });

  describe('success cases', () => {
    it('returns success with the value when value exists in the enum', () => {
      fc.assert(
        fc.property(fc.tuple(enumIdArb, valuesObjectArb), ([enumId, values]) => {
          clearRegistry();
          const id = uniqueId(enumId);
          const brandedEnum = createBrandedEnum(id, values);

          // All values in the enum should return success
          for (const value of Object.values(values)) {
            const result = safeParseEnum(value, brandedEnum);
            expect(result.success).toBe(true);
            if (result.success) {
              expect(result.value).toBe(value);
            }
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('failure cases', () => {
    it('returns failure with VALUE_NOT_IN_ENUM when value is not in enum', () => {
      fc.assert(
        fc.property(
          fc.tuple(enumIdArb, valuesObjectArb, fc.string({ minLength: 1 })),
          ([enumId, values, randomValue]) => {
            clearRegistry();
            const id = uniqueId(enumId);
            const brandedEnum = createBrandedEnum(id, values);

            // Create a value that definitely doesn't exist
            const nonExistentValue = `nonexistent_${randomValue}_${Date.now()}`;

            const result = safeParseEnum(nonExistentValue, brandedEnum);
            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error.code).toBe('VALUE_NOT_IN_ENUM');
              expect(result.error.input).toBe(nonExistentValue);
              expect(result.error.enumId).toBe(id);
              expect(result.error.message).toContain(nonExistentValue);
              expect(result.error.message).toContain(id);
              expect(result.error.validValues).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns failure with INVALID_VALUE_TYPE for non-string values', () => {
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
          ([enumId, values, nonStringValue]) => {
            clearRegistry();
            const id = uniqueId(enumId);
            const brandedEnum = createBrandedEnum(id, values);

            const result = safeParseEnum(nonStringValue, brandedEnum);
            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error.code).toBe('INVALID_VALUE_TYPE');
              expect(result.error.input).toBe(nonStringValue);
              expect(result.error.enumId).toBe(id);
              expect(result.error.validValues).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns failure with INVALID_ENUM_OBJECT when second argument is not a branded enum', () => {
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
          ([value, notAnEnum]) => {
            const result = safeParseEnum(
              value,
              notAnEnum as Parameters<typeof safeParseEnum>[1]
            );
            expect(result.success).toBe(false);
            if (!result.success) {
              expect(result.error.code).toBe('INVALID_ENUM_OBJECT');
              expect(result.error.input).toBe(value);
              expect(result.error.enumId).toBeUndefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('error details', () => {
    it('provides validValues array sorted alphabetically on failure', () => {
      fc.assert(
        fc.property(fc.tuple(enumIdArb, valuesObjectArb), ([enumId, values]) => {
          clearRegistry();
          const id = uniqueId(enumId);
          const brandedEnum = createBrandedEnum(id, values);

          const result = safeParseEnum('nonexistent_value', brandedEnum);
          expect(result.success).toBe(false);
          if (!result.success && result.error.validValues) {
            // validValues comes from a Set, so duplicates are removed
            const expectedValues = [...new Set(Object.values(values))].sort();
            expect(result.error.validValues).toEqual(expectedValues);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('includes correct type name in error message for non-string values', () => {
      clearRegistry();
      const brandedEnum = createBrandedEnum('test-enum', { A: 'a' } as const);

      // Test null
      const nullResult = safeParseEnum(null, brandedEnum);
      expect(nullResult.success).toBe(false);
      if (!nullResult.success) {
        expect(nullResult.error.message).toContain('null');
      }

      // Test number
      const numberResult = safeParseEnum(123, brandedEnum);
      expect(numberResult.success).toBe(false);
      if (!numberResult.success) {
        expect(numberResult.error.message).toContain('number');
      }

      // Test object
      const objectResult = safeParseEnum({}, brandedEnum);
      expect(objectResult.success).toBe(false);
      if (!objectResult.success) {
        expect(objectResult.error.message).toContain('object');
      }

      // Test undefined
      const undefinedResult = safeParseEnum(undefined, brandedEnum);
      expect(undefinedResult.success).toBe(false);
      if (!undefinedResult.success) {
        expect(undefinedResult.error.message).toContain('undefined');
      }
    });
  });

  describe('never throws', () => {
    it('never throws an error regardless of input', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            enumIdArb,
            valuesObjectArb,
            fc.oneof(
              fc.string(),
              fc.constant(null),
              fc.constant(undefined),
              fc.integer(),
              fc.object(),
              fc.array(fc.anything())
            )
          ),
          ([enumId, values, anyValue]) => {
            clearRegistry();
            const id = uniqueId(enumId);
            const brandedEnum = createBrandedEnum(id, values);

            // Should never throw
            expect(() => safeParseEnum(anyValue, brandedEnum)).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('never throws even with invalid enum object', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.anything(),
            fc.oneof(
              fc.constant(null),
              fc.constant(undefined),
              fc.integer(),
              fc.object(),
              fc.constant({})
            )
          ),
          ([anyValue, notAnEnum]) => {
            // Should never throw
            expect(() =>
              safeParseEnum(
                anyValue,
                notAnEnum as Parameters<typeof safeParseEnum>[1]
              )
            ).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
