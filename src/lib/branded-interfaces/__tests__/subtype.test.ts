/**
 * Property-based tests for branded-interfaces structural subtyping.
 *
 * Feature: branded-interfaces
 * Property 35: Structural subtyping correctness
 */

import * as fc from 'fast-check';
import { isSubtype } from '../subtype.js';
import { createBrandedInterface } from '../factory.js';
import { resetInterfaceRegistry } from '../registry.js';
import type { InterfaceSchema, FieldDescriptor } from '../types.js';
import { arbUniqueId, arbInterfaceSchema, arbFieldDescriptor } from './arbitraries.js';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Generates extra fields with a prefix to avoid collisions with existing schema.
 */
function arbExtraFields(prefix: string): fc.Arbitrary<InterfaceSchema> {
  return fc
    .array(
      fc.tuple(
        fc
          .string({ minLength: 1, maxLength: 10 })
          .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s))
          .map((s) => `${prefix}${s}`),
        arbFieldDescriptor,
      ),
      { minLength: 1, maxLength: 5 },
    )
    .map((entries) => {
      const schema: Record<string, FieldDescriptor> = {};
      for (const [name, desc] of entries) {
        schema[name] = desc;
      }
      return schema as InterfaceSchema;
    })
    .filter((s) => Object.keys(s).length >= 1);
}

// =============================================================================
// Property 35: Structural subtyping correctness
// =============================================================================

describe('Feature: branded-interfaces, Property 35: Structural subtyping correctness', () => {
  /**
   * **Validates: Requirements 16.1, 16.2, 16.3**
   *
   * *For any* two branded interface definitions, `isSubtype(A, B)` should return
   * `true` if and only if A's schema contains every field in B's schema with a
   * compatible type.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('superset schema is a subtype of the base schema', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbUniqueId,
        arbInterfaceSchema,
        arbExtraFields('extra_'),
        (baseId, superId, baseSchema, extraFields) => {
          // Create a superset by adding extra fields to the base
          const supersetSchema: InterfaceSchema = {
            ...baseSchema,
            ...extraFields,
          };

          const baseDef = createBrandedInterface(baseId, baseSchema);
          const superDef = createBrandedInterface(superId, supersetSchema);

          // Superset contains all base fields → is a subtype
          expect(isSubtype(superDef, baseDef)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('subset schema (missing fields) is NOT a subtype of the full schema', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbUniqueId,
        arbInterfaceSchema.filter((s) => Object.keys(s).length >= 2),
        (fullId, subsetId, fullSchema) => {
          const fieldNames = Object.keys(fullSchema);
          // Remove the last field to create a strict subset
          const subsetSchema: Record<string, FieldDescriptor> = {};
          for (let i = 0; i < fieldNames.length - 1; i++) {
            subsetSchema[fieldNames[i]] = fullSchema[fieldNames[i]];
          }

          const fullDef = createBrandedInterface(fullId, fullSchema);
          const subsetDef = createBrandedInterface(
            subsetId,
            subsetSchema as InterfaceSchema,
          );

          // Subset is missing fields → NOT a subtype of full
          expect(isSubtype(subsetDef, fullDef)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('schema with a changed field type is NOT a subtype', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbUniqueId,
        arbInterfaceSchema,
        (origId, changedId, schema) => {
          const fieldNames = Object.keys(schema);
          const targetField = fieldNames[0];
          const origType = schema[targetField].type;

          // Pick a different type
          const allTypes: FieldDescriptor['type'][] = [
            'string',
            'number',
            'boolean',
            'object',
            'array',
          ];
          const differentType = allTypes.find((t) => t !== origType) ?? 'string';

          const changedSchema: Record<string, FieldDescriptor> = { ...schema };
          changedSchema[targetField] = {
            ...schema[targetField],
            type: differentType,
          };

          const origDef = createBrandedInterface(origId, schema);
          const changedDef = createBrandedInterface(
            changedId,
            changedSchema as InterfaceSchema,
          );

          // Changed type → NOT a subtype
          expect(isSubtype(changedDef, origDef)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('identical schemas are subtypes of each other', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbUniqueId,
        arbInterfaceSchema,
        (idA, idB, schema) => {
          const defA = createBrandedInterface(idA, schema);
          const defB = createBrandedInterface(idB, schema);

          // Same schema → mutual subtypes
          expect(isSubtype(defA, defB)).toBe(true);
          expect(isSubtype(defB, defA)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});


// =============================================================================
// Unit Tests for isSubtype
// =============================================================================

describe('isSubtype — unit tests', () => {
  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('returns true when candidate has all supertype fields with matching types', () => {
    const supertype = createBrandedInterface('SuperUser', {
      name: { type: 'string' },
      age: { type: 'number' },
    });
    const candidate = createBrandedInterface('SubUser', {
      name: { type: 'string' },
      age: { type: 'number' },
      email: { type: 'string' },
    });

    expect(isSubtype(candidate, supertype)).toBe(true);
  });

  it('returns false when candidate is missing a supertype field', () => {
    const supertype = createBrandedInterface('FullShape', {
      x: { type: 'number' },
      y: { type: 'number' },
      z: { type: 'number' },
    });
    const candidate = createBrandedInterface('PartialShape', {
      x: { type: 'number' },
      y: { type: 'number' },
    });

    expect(isSubtype(candidate, supertype)).toBe(false);
  });

  it('returns false when a shared field has an incompatible type', () => {
    const supertype = createBrandedInterface('TypedA', {
      value: { type: 'string' },
    });
    const candidate = createBrandedInterface('TypedB', {
      value: { type: 'number' },
    });

    expect(isSubtype(candidate, supertype)).toBe(false);
  });

  it('returns true for identical schemas', () => {
    const defA = createBrandedInterface('IdenticalA', {
      foo: { type: 'boolean' },
      bar: { type: 'string' },
    });
    const defB = createBrandedInterface('IdenticalB', {
      foo: { type: 'boolean' },
      bar: { type: 'string' },
    });

    expect(isSubtype(defA, defB)).toBe(true);
    expect(isSubtype(defB, defA)).toBe(true);
  });

  it('returns false when ref values differ', () => {
    const supertype = createBrandedInterface('RefSuper', {
      status: { type: 'branded-interface', ref: 'StatusEnum' },
    });
    const candidate = createBrandedInterface('RefCandidate', {
      status: { type: 'branded-interface', ref: 'DifferentEnum' },
    });

    expect(isSubtype(candidate, supertype)).toBe(false);
  });

  it('returns true when ref values match', () => {
    const supertype = createBrandedInterface('RefMatchSuper', {
      status: { type: 'branded-interface', ref: 'StatusEnum' },
    });
    const candidate = createBrandedInterface('RefMatchCandidate', {
      status: { type: 'branded-interface', ref: 'StatusEnum' },
      extra: { type: 'string' },
    });

    expect(isSubtype(candidate, supertype)).toBe(true);
  });
});
