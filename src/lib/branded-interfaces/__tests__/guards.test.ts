/**
 * Property-based tests for type guards and safe parsing.
 *
 * Feature: branded-interfaces
 * Property 11: Type guard consistency
 * Property 12: Safe parse brands unbranded valid objects
 * Property 13: Primitive type guard correctness
 */

import * as fc from 'fast-check';
import { createBrandedInterface, createBrandedPrimitive } from '../factory.js';
import { resetInterfaceRegistry } from '../registry.js';
import { isOfInterface, assertOfInterface, safeParseInterface, isOfPrimitive } from '../guards.js';
import { INTERFACE_ID } from '../types.js';
import {
  arbUniqueId,
  arbInterfaceSchema,
  arbMatchingData,
  arbNonMatchingData,
  arbPrimitiveBaseType,
  arbMatchingPrimitive,
  arbNonMatchingPrimitive,
} from './arbitraries.js';

// =============================================================================
// Property 11: Type guard consistency
// =============================================================================

describe('Feature: branded-interfaces, Property 11: Type guard consistency', () => {
  /**
   * **Validates: Requirements 4.1, 4.2**
   *
   * *For any* value and branded interface definition, `isOfInterface()` should
   * return `true` if and only if the value is a branded instance of that definition.
   * `assertOfInterface()` should throw if and only if `isOfInterface()` returns `false`.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('isOfInterface returns true for branded instances created by the definition', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbInterfaceSchema.chain((schema) =>
          arbMatchingData(schema).map((data) => ({ schema, data })),
        ),
        (id, { schema, data }) => {
          const def = createBrandedInterface(id, schema);
          const instance = def.create(data as Record<string, unknown>);

          expect(isOfInterface(instance, def)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('isOfInterface returns false for plain (unbranded) objects', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbInterfaceSchema.chain((schema) =>
          arbMatchingData(schema).map((data) => ({ schema, data })),
        ),
        (id, { schema, data }) => {
          const def = createBrandedInterface(id, schema);

          // Plain object matching the schema but not branded
          expect(isOfInterface(data, def)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('isOfInterface returns false for non-object values', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbInterfaceSchema,
        fc.oneof(fc.string(), fc.double({ noNaN: true }), fc.boolean(), fc.constant(null), fc.constant(undefined)),
        (id, schema, value) => {
          const def = createBrandedInterface(id, schema);
          expect(isOfInterface(value, def)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('isOfInterface returns false for instances branded by a different definition', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbUniqueId,
        arbInterfaceSchema.chain((schema) =>
          arbMatchingData(schema).map((data) => ({ schema, data })),
        ),
        (id1, id2, { schema, data }) => {
          // Ensure different IDs
          fc.pre(id1 !== id2);

          const def1 = createBrandedInterface(id1, schema);
          const def2 = createBrandedInterface(id2, schema);
          const instance = def1.create(data as Record<string, unknown>);

          expect(isOfInterface(instance, def2)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('assertOfInterface does not throw for branded instances', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbInterfaceSchema.chain((schema) =>
          arbMatchingData(schema).map((data) => ({ schema, data })),
        ),
        (id, { schema, data }) => {
          const def = createBrandedInterface(id, schema);
          const instance = def.create(data as Record<string, unknown>);

          expect(() => assertOfInterface(instance, def)).not.toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('assertOfInterface throws for non-branded values', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbInterfaceSchema.chain((schema) =>
          arbMatchingData(schema).map((data) => ({ schema, data })),
        ),
        (id, { schema, data }) => {
          const def = createBrandedInterface(id, schema);

          // Plain object — not branded
          expect(() => assertOfInterface(data, def)).toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('assertOfInterface throws iff isOfInterface returns false', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbInterfaceSchema.chain((schema) =>
          arbMatchingData(schema).map((data) => ({ schema, data })),
        ),
        fc.boolean(),
        (id, { schema, data }, useBranded) => {
          const def = createBrandedInterface(id, schema);
          const value = useBranded
            ? def.create(data as Record<string, unknown>)
            : data;

          const isGuardTrue = isOfInterface(value, def);

          if (isGuardTrue) {
            expect(() => assertOfInterface(value, def)).not.toThrow();
          } else {
            expect(() => assertOfInterface(value, def)).toThrow();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


// =============================================================================
// Property 12: Safe parse brands unbranded valid objects
// =============================================================================

describe('Feature: branded-interfaces, Property 12: Safe parse brands unbranded valid objects', () => {
  /**
   * **Validates: Requirements 4.3, 4.5**
   *
   * *For any* branded interface definition and any value, `safeParseInterface()`
   * should return `{ success: true }` with a branded value when the input matches
   * the schema (whether already branded or plain), and `{ success: false }` with
   * error details otherwise.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('returns success with branded value for plain matching objects', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbInterfaceSchema.chain((schema) =>
          arbMatchingData(schema).map((data) => ({ schema, data })),
        ),
        (id, { schema, data }) => {
          const def = createBrandedInterface(id, schema);
          const result = safeParseInterface(data, def);

          expect(result.success).toBe(true);
          if (result.success) {
            // The result value should be branded
            expect((result.value as Record<symbol, unknown>)[INTERFACE_ID]).toBe(id);
            // All original data should be present
            for (const [key, val] of Object.entries(data)) {
              expect(result.value[key]).toEqual(val);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns success for already-branded instances (pass-through)', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbInterfaceSchema.chain((schema) =>
          arbMatchingData(schema).map((data) => ({ schema, data })),
        ),
        (id, { schema, data }) => {
          const def = createBrandedInterface(id, schema);
          const branded = def.create(data as Record<string, unknown>);
          const result = safeParseInterface(branded, def);

          expect(result.success).toBe(true);
          if (result.success) {
            // Should be the same branded instance (pass-through)
            expect(result.value).toBe(branded);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns failure for non-matching objects', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbInterfaceSchema
          .filter((schema) => Object.values(schema).some((d) => !d.optional))
          .chain((schema) =>
            arbNonMatchingData(schema).map((data) => ({ schema, data })),
          ),
        (id, { schema, data }) => {
          const def = createBrandedInterface(id, schema);
          const result = safeParseInterface(data, def);

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error).toBeDefined();
            expect(typeof result.error.message).toBe('string');
            expect(typeof result.error.code).toBe('string');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns failure for non-object values', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbInterfaceSchema,
        fc.oneof(fc.string(), fc.double({ noNaN: true }), fc.boolean(), fc.constant(null)),
        (id, schema, value) => {
          const def = createBrandedInterface(id, schema);
          const result = safeParseInterface(value, def);

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.code).toBe('INVALID_VALUE_TYPE');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// =============================================================================
// Property 13: Primitive type guard correctness
// =============================================================================

describe('Feature: branded-interfaces, Property 13: Primitive type guard correctness', () => {
  /**
   * **Validates: Requirements 4.4**
   *
   * *For any* value and branded primitive definition, `isOfPrimitive()` should
   * return `true` if and only if the value was created by that definition's
   * `create()` function (i.e., passes the definition's validate()).
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('returns true for values that pass the definition validate()', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbPrimitiveBaseType.chain((bt) =>
          arbMatchingPrimitive(bt).map((val) => ({ baseType: bt, value: val })),
        ),
        (id, { baseType, value }) => {
          const def = createBrandedPrimitive(id, baseType);
          // No predicate, so any value of the correct type should pass
          expect(isOfPrimitive(value, def)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false for values of the wrong base type', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbPrimitiveBaseType.chain((bt) =>
          arbNonMatchingPrimitive(bt).map((val) => ({ baseType: bt, value: val })),
        ),
        (id, { baseType, value }) => {
          const def = createBrandedPrimitive(id, baseType);
          expect(isOfPrimitive(value, def)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns true only for values passing the validation predicate', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        fc.integer({ min: -1000, max: 1000 }),
        (id, value) => {
          function isPositive(v: number): boolean {
            return v > 0;
          }

          const def = createBrandedPrimitive<number>(id, 'number', isPositive);

          if (value > 0) {
            expect(isOfPrimitive(value, def)).toBe(true);
          } else {
            expect(isOfPrimitive(value, def)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('isOfPrimitive is consistent with validate()', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbPrimitiveBaseType,
        fc.oneof(
          fc.string(),
          fc.double({ noNaN: true, noDefaultInfinity: true }),
          fc.boolean(),
        ),
        (id, baseType, value) => {
          const def = createBrandedPrimitive(id, baseType);
          expect(isOfPrimitive(value, def)).toBe(def.validate(value));
        },
      ),
      { numRuns: 100 },
    );
  });
});

// =============================================================================
// Unit Tests: Guards with specific examples
// =============================================================================

describe('Unit Tests: Guards', () => {
  /**
   * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
   *
   * Tests guards with branded and non-branded values using specific examples.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  const userSchema = {
    name: { type: 'string' as const },
    age: { type: 'number' as const },
  };

  // ---------------------------------------------------------------------------
  // isOfInterface
  // ---------------------------------------------------------------------------

  describe('isOfInterface', () => {
    it('returns true for a branded instance', () => {
      const def = createBrandedInterface('UnitUser', userSchema);
      const instance = def.create({ name: 'Alice', age: 30 });
      expect(isOfInterface(instance, def)).toBe(true);
    });

    it('returns false for a plain object', () => {
      const def = createBrandedInterface('UnitUser2', userSchema);
      expect(isOfInterface({ name: 'Alice', age: 30 }, def)).toBe(false);
    });

    it('returns false for null', () => {
      const def = createBrandedInterface('UnitUser3', userSchema);
      expect(isOfInterface(null, def)).toBe(false);
    });

    it('returns false for undefined', () => {
      const def = createBrandedInterface('UnitUser4', userSchema);
      expect(isOfInterface(undefined, def)).toBe(false);
    });

    it('returns false for a string', () => {
      const def = createBrandedInterface('UnitUser5', userSchema);
      expect(isOfInterface('hello', def)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // assertOfInterface
  // ---------------------------------------------------------------------------

  describe('assertOfInterface', () => {
    it('returns the instance for a branded instance', () => {
      const def = createBrandedInterface('UnitAssert1', userSchema);
      const instance = def.create({ name: 'Bob', age: 25 });
      const result = assertOfInterface(instance, def);
      expect(result).toBe(instance);
    });

    it('throws with interface ID in message for a plain object', () => {
      const def = createBrandedInterface('UnitAssert2', userSchema);
      expect(() => assertOfInterface({ name: 'Bob', age: 25 }, def)).toThrow('UnitAssert2');
    });
  });

  // ---------------------------------------------------------------------------
  // safeParseInterface
  // ---------------------------------------------------------------------------

  describe('safeParseInterface', () => {
    it('returns success with branded value for a valid plain object', () => {
      const def = createBrandedInterface('UnitSafe1', userSchema);
      const result = safeParseInterface({ name: 'Carol', age: 40 }, def);
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.value as Record<symbol, unknown>)[INTERFACE_ID]).toBe('UnitSafe1');
        expect(result.value['name']).toBe('Carol');
        expect(result.value['age']).toBe(40);
      }
    });

    it('returns success for an already-branded instance (pass-through)', () => {
      const def = createBrandedInterface('UnitSafe2', userSchema);
      const instance = def.create({ name: 'Dave', age: 50 });
      const result = safeParseInterface(instance, def);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(instance);
      }
    });

    it('returns failure with error code for invalid data', () => {
      const def = createBrandedInterface('UnitSafe3', userSchema);
      const result = safeParseInterface({ name: 123, age: 'wrong' }, def);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBeDefined();
        expect(typeof result.error.message).toBe('string');
      }
    });

    it('returns INVALID_VALUE_TYPE for non-object values', () => {
      const def = createBrandedInterface('UnitSafe4', userSchema);

      expect(safeParseInterface('string', def)).toEqual(
        expect.objectContaining({ success: false }),
      );
      const strResult = safeParseInterface('string', def);
      if (!strResult.success) {
        expect(strResult.error.code).toBe('INVALID_VALUE_TYPE');
      }

      const nullResult = safeParseInterface(null, def);
      if (!nullResult.success) {
        expect(nullResult.error.code).toBe('INVALID_VALUE_TYPE');
      }

      const numResult = safeParseInterface(42, def);
      if (!numResult.success) {
        expect(numResult.error.code).toBe('INVALID_VALUE_TYPE');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // isOfPrimitive
  // ---------------------------------------------------------------------------

  describe('isOfPrimitive', () => {
    it('returns true for a valid value', () => {
      const def = createBrandedPrimitive<number>('UnitPrim1', 'number', (v) => v > 0);
      expect(isOfPrimitive(5, def)).toBe(true);
    });

    it('returns false for wrong type', () => {
      const def = createBrandedPrimitive<number>('UnitPrim2', 'number', (v) => v > 0);
      expect(isOfPrimitive('hello', def)).toBe(false);
    });

    it('returns false for value failing predicate', () => {
      const def = createBrandedPrimitive<number>('UnitPrim3', 'number', (v) => v > 0);
      expect(isOfPrimitive(-1, def)).toBe(false);
    });
  });
});
