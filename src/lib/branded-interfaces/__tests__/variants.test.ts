/**
 * Property-based tests for branded-interfaces variant functions.
 *
 * Feature: branded-interfaces
 * Properties 19-22: Partial, Pick, Omit variant tests
 */

import * as fc from 'fast-check';
import { partialInterface, pickFields, omitFields } from '../compose.js';
import { createBrandedInterface } from '../factory.js';
import { resetInterfaceRegistry } from '../registry.js';
import type { InterfaceSchema } from '../types.js';
import { arbUniqueId, arbInterfaceSchema } from './arbitraries.js';

// =============================================================================
// Property 19: Partial makes all fields optional
// =============================================================================

describe('Feature: branded-interfaces, Property 19: Partial makes all fields optional', () => {
  /**
   * **Validates: Requirements 7.1**
   *
   * *For any* branded interface definition, `partialInterface()` should produce
   * a definition where every field descriptor has `optional: true`.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('all fields in the partial definition have optional: true', () => {
    fc.assert(
      fc.property(arbUniqueId, arbUniqueId, arbInterfaceSchema, (srcId, partialId, schema) => {
        const srcDef = createBrandedInterface(srcId, schema);
        const partial = partialInterface(srcDef, partialId);

        // Same field names
        expect(Object.keys(partial.schema).sort()).toEqual(
          Object.keys(schema).sort(),
        );

        // Every field is optional
        for (const [field, descriptor] of Object.entries(partial.schema)) {
          expect(descriptor.optional).toBe(true);
          // Type is preserved
          expect(descriptor.type).toBe(schema[field].type);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// =============================================================================
// Property 20: Pick retains only specified fields
// =============================================================================

describe('Feature: branded-interfaces, Property 20: Pick retains only specified fields', () => {
  /**
   * **Validates: Requirements 7.2**
   *
   * *For any* branded interface definition and any subset of its field names,
   * `pickFields()` should produce a definition whose schema contains exactly
   * those fields.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('picked schema contains exactly the specified fields', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbUniqueId,
        arbInterfaceSchema.chain((schema) => {
          const fieldNames = Object.keys(schema);
          // Pick a random non-empty subset
          return fc
            .subarray(fieldNames, { minLength: 1, maxLength: fieldNames.length })
            .map((picked) => ({ schema, picked }));
        }),
        (srcId, pickId, { schema, picked }) => {
          const srcDef = createBrandedInterface(srcId, schema);
          const pickedDef = pickFields(srcDef, pickId, picked);

          const actualFields = new Set(Object.keys(pickedDef.schema));
          const expectedFields = new Set(picked);

          expect(actualFields).toEqual(expectedFields);

          // Each picked field preserves its descriptor type
          for (const field of picked) {
            expect(pickedDef.schema[field].type).toBe(schema[field].type);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// =============================================================================
// Property 21: Omit removes only specified fields
// =============================================================================

describe('Feature: branded-interfaces, Property 21: Omit removes only specified fields', () => {
  /**
   * **Validates: Requirements 7.3**
   *
   * *For any* branded interface definition and any subset of its field names,
   * `omitFields()` should produce a definition whose schema contains all fields
   * except those specified.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('omitted schema contains all fields except the specified ones', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbUniqueId,
        arbInterfaceSchema.chain((schema) => {
          const fieldNames = Object.keys(schema);
          // Omit a random subset (can be empty, but keep at least one field remaining)
          const maxOmit = Math.max(1, fieldNames.length - 1);
          return fc
            .subarray(fieldNames, { minLength: 1, maxLength: maxOmit })
            .map((omitted) => ({ schema, omitted }));
        }),
        (srcId, omitId, { schema, omitted }) => {
          const srcDef = createBrandedInterface(srcId, schema);
          const omittedDef = omitFields(srcDef, omitId, omitted);

          const omitSet = new Set(omitted);
          const expectedFields = Object.keys(schema).filter((f) => !omitSet.has(f));
          const actualFields = Object.keys(omittedDef.schema);

          expect(new Set(actualFields)).toEqual(new Set(expectedFields));

          // Remaining fields preserve their descriptor type
          for (const field of expectedFields) {
            expect(omittedDef.schema[field].type).toBe(schema[field].type);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// =============================================================================
// Property 22: Pick and Omit reject unknown field names
// =============================================================================

describe('Feature: branded-interfaces, Property 22: Pick and Omit reject unknown field names', () => {
  /**
   * **Validates: Requirements 7.4, 7.5**
   *
   * *For any* branded interface definition and a field name not in the schema,
   * both `pickFields()` and `omitFields()` should throw a descriptive error.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('pickFields throws on unknown field name', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbUniqueId,
        arbInterfaceSchema,
        (srcId, pickId, schema) => {
          const srcDef = createBrandedInterface(srcId, schema);
          const unknownField = '__nonexistent_field__';

          expect(() => pickFields(srcDef, pickId, [unknownField])).toThrow(
            /[Uu]nknown field/,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('omitFields throws on unknown field name', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbUniqueId,
        arbInterfaceSchema,
        (srcId, omitId, schema) => {
          const srcDef = createBrandedInterface(srcId, schema);
          const unknownField = '__nonexistent_field__';

          expect(() => omitFields(srcDef, omitId, [unknownField])).toThrow(
            /[Uu]nknown field/,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});


// =============================================================================
// Unit Tests for partialInterface, pickFields, omitFields
// =============================================================================

describe('partialInterface — unit tests', () => {
  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('makes all fields optional', () => {
    const def = createBrandedInterface('FullRecord', {
      name: { type: 'string' },
      age: { type: 'number' },
      active: { type: 'boolean' },
    });

    const partial = partialInterface(def, 'PartialRecord');

    for (const descriptor of Object.values(partial.schema)) {
      expect(descriptor.optional).toBe(true);
    }
    expect(Object.keys(partial.schema).sort()).toEqual(['active', 'age', 'name']);
  });

  it('preserves field types in partial', () => {
    const def = createBrandedInterface('TypedRecord', {
      label: { type: 'string' },
      count: { type: 'number' },
    });

    const partial = partialInterface(def, 'PartialTyped');

    expect(partial.schema['label'].type).toBe('string');
    expect(partial.schema['count'].type).toBe('number');
  });

  it('partial definition accepts empty objects', () => {
    const def = createBrandedInterface('SomeFields', {
      x: { type: 'string' },
      y: { type: 'number' },
    });

    const partial = partialInterface(def, 'PartialSome');
    const instance = partial.create({} as Record<string, unknown>);

    expect(instance.x).toBeUndefined();
    expect(instance.y).toBeUndefined();
  });
});

describe('pickFields — unit tests', () => {
  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('picks only the specified fields', () => {
    const def = createBrandedInterface('PickSource', {
      a: { type: 'string' },
      b: { type: 'number' },
      c: { type: 'boolean' },
    });

    const picked = pickFields(def, 'PickedAB', ['a', 'b']);

    expect(Object.keys(picked.schema).sort()).toEqual(['a', 'b']);
    expect(picked.schema['a'].type).toBe('string');
    expect(picked.schema['b'].type).toBe('number');
  });

  it('throws on unknown field name', () => {
    const def = createBrandedInterface('PickSrc2', {
      x: { type: 'string' },
    });

    expect(() => pickFields(def, 'PickBad', ['x', 'nonexistent'])).toThrow(/[Uu]nknown field/);
  });
});

describe('omitFields — unit tests', () => {
  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('omits the specified fields', () => {
    const def = createBrandedInterface('OmitSource', {
      a: { type: 'string' },
      b: { type: 'number' },
      c: { type: 'boolean' },
    });

    const omitted = omitFields(def, 'OmittedB', ['b']);

    expect(Object.keys(omitted.schema).sort()).toEqual(['a', 'c']);
  });

  it('throws on unknown field name', () => {
    const def = createBrandedInterface('OmitSrc2', {
      x: { type: 'string' },
    });

    expect(() => omitFields(def, 'OmitBad', ['missing'])).toThrow(/[Uu]nknown field/);
  });
});
