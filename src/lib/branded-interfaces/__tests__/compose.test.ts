/**
 * Property-based tests for branded-interfaces composition module.
 *
 * Feature: branded-interfaces
 * Properties 15-18: Composition and extension tests
 */

import * as fc from 'fast-check';
import { composeInterfaces, extendInterface } from '../compose.js';
import { createBrandedInterface } from '../factory.js';
import { resetInterfaceRegistry } from '../registry.js';
import type { InterfaceSchema, FieldDescriptor } from '../types.js';
import { arbUniqueId, arbFieldDescriptor } from './arbitraries.js';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Generates a schema where all field names are prefixed with the given string.
 * This ensures non-overlapping field names between two schemas.
 */
function arbPrefixedSchema(prefix: string): fc.Arbitrary<InterfaceSchema> {
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
// Property 15: Composition produces union of fields
// =============================================================================

describe('Feature: branded-interfaces, Property 15: Composition produces union of fields', () => {
  /**
   * **Validates: Requirements 6.1**
   *
   * *For any* set of branded interface definitions with non-overlapping field names,
   * `composeInterfaces()` should produce a definition whose schema contains exactly
   * the union of all source fields.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('composed schema contains exactly the union of all source fields', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbUniqueId,
        arbUniqueId,
        arbPrefixedSchema('a_'),
        arbPrefixedSchema('b_'),
        (composeId, idA, idB, schemaA, schemaB) => {
          const defA = createBrandedInterface(idA, schemaA);
          const defB = createBrandedInterface(idB, schemaB);

          const composed = composeInterfaces(composeId, defA, defB);

          const expectedFields = new Set([
            ...Object.keys(schemaA),
            ...Object.keys(schemaB),
          ]);
          const actualFields = new Set(Object.keys(composed.schema));

          expect(actualFields).toEqual(expectedFields);

          // Each field descriptor should match the source
          for (const field of Object.keys(schemaA)) {
            expect(composed.schema[field].type).toBe(schemaA[field].type);
          }
          for (const field of Object.keys(schemaB)) {
            expect(composed.schema[field].type).toBe(schemaB[field].type);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// =============================================================================
// Property 16: Composition rejects duplicate fields
// =============================================================================

describe('Feature: branded-interfaces, Property 16: Composition rejects duplicate fields', () => {
  /**
   * **Validates: Requirements 6.2**
   *
   * *For any* set of branded interface definitions with at least one overlapping
   * field name, `composeInterfaces()` should throw an error identifying the
   * conflicting field.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('throws when definitions share a field name', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbUniqueId,
        arbUniqueId,
        fc
          .string({ minLength: 1, maxLength: 10 })
          .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s)),
        arbFieldDescriptor,
        arbFieldDescriptor,
        (composeId, idA, idB, sharedField, descA, descB) => {
          const schemaA: InterfaceSchema = { [sharedField]: descA };
          const schemaB: InterfaceSchema = { [sharedField]: descB };

          const defA = createBrandedInterface(idA, schemaA);
          const defB = createBrandedInterface(idB, schemaB);

          expect(() => composeInterfaces(composeId, defA, defB)).toThrow(
            /[Dd]uplicate field/,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

// =============================================================================
// Property 17: Extension adds fields to base
// =============================================================================

describe('Feature: branded-interfaces, Property 17: Extension adds fields to base', () => {
  /**
   * **Validates: Requirements 6.3**
   *
   * *For any* branded interface definition and additional fields with non-overlapping
   * names, `extendInterface()` should produce a definition whose schema contains all
   * base fields plus all additional fields.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('extended schema contains all base fields plus additional fields', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbUniqueId,
        arbPrefixedSchema('base_'),
        arbPrefixedSchema('ext_'),
        (baseId, extId, baseSchema, extFields) => {
          const baseDef = createBrandedInterface(baseId, baseSchema);
          const extended = extendInterface(baseDef, extId, extFields);

          const expectedFields = new Set([
            ...Object.keys(baseSchema),
            ...Object.keys(extFields),
          ]);
          const actualFields = new Set(Object.keys(extended.schema));

          expect(actualFields).toEqual(expectedFields);

          // Base fields preserved
          for (const field of Object.keys(baseSchema)) {
            expect(extended.schema[field].type).toBe(baseSchema[field].type);
          }
          // Extension fields present
          for (const field of Object.keys(extFields)) {
            expect(extended.schema[field].type).toBe(extFields[field].type);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// =============================================================================
// Property 18: Extension rejects conflicting fields
// =============================================================================

describe('Feature: branded-interfaces, Property 18: Extension rejects conflicting fields', () => {
  /**
   * **Validates: Requirements 6.4**
   *
   * *For any* branded interface definition and additional fields where at least one
   * name conflicts with a base field, `extendInterface()` should throw.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('throws when additional fields conflict with base fields', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbUniqueId,
        fc
          .string({ minLength: 1, maxLength: 10 })
          .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s)),
        arbFieldDescriptor,
        arbFieldDescriptor,
        (baseId, extId, sharedField, baseDesc, extDesc) => {
          const baseSchema: InterfaceSchema = { [sharedField]: baseDesc };
          const baseDef = createBrandedInterface(baseId, baseSchema);

          const additionalFields: InterfaceSchema = { [sharedField]: extDesc };

          expect(() => extendInterface(baseDef, extId, additionalFields)).toThrow(
            /conflicts/i,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});


// =============================================================================
// Unit Tests for composeInterfaces and extendInterface
// =============================================================================

describe('composeInterfaces — unit tests', () => {
  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('composes two non-overlapping definitions into one', () => {
    const defA = createBrandedInterface('PersonName', {
      firstName: { type: 'string' },
      lastName: { type: 'string' },
    });
    const defB = createBrandedInterface('PersonAge', {
      age: { type: 'number' },
    });

    const composed = composeInterfaces('FullPerson', defA, defB);

    expect(Object.keys(composed.schema).sort()).toEqual(['age', 'firstName', 'lastName']);
    expect(composed.schema['firstName'].type).toBe('string');
    expect(composed.schema['age'].type).toBe('number');
    expect(composed.id).toBe('FullPerson');
  });

  it('composes three non-overlapping definitions', () => {
    const defA = createBrandedInterface('NamePart', { name: { type: 'string' } });
    const defB = createBrandedInterface('AgePart', { age: { type: 'number' } });
    const defC = createBrandedInterface('ActivePart', { active: { type: 'boolean' } });

    const composed = composeInterfaces('Combined3', defA, defB, defC);

    expect(Object.keys(composed.schema).sort()).toEqual(['active', 'age', 'name']);
  });

  it('throws on duplicate field names across definitions', () => {
    const defA = createBrandedInterface('Left', { shared: { type: 'string' } });
    const defB = createBrandedInterface('Right', { shared: { type: 'number' } });

    expect(() => composeInterfaces('Merged', defA, defB)).toThrow(/[Dd]uplicate field.*shared/);
  });

  it('composed definition can create valid instances', () => {
    const defA = createBrandedInterface('CmpA', { x: { type: 'number' } });
    const defB = createBrandedInterface('CmpB', { y: { type: 'string' } });

    const composed = composeInterfaces('CmpAB', defA, defB);
    const instance = composed.create({ x: 1, y: 'hello' } as Record<string, unknown>);

    expect(instance.x).toBe(1);
    expect(instance.y).toBe('hello');
  });
});

describe('extendInterface — unit tests', () => {
  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('extends a base definition with additional fields', () => {
    const base = createBrandedInterface('BaseUser', {
      name: { type: 'string' },
    });

    const extended = extendInterface(base, 'ExtendedUser', {
      email: { type: 'string' },
      age: { type: 'number' },
    });

    expect(Object.keys(extended.schema).sort()).toEqual(['age', 'email', 'name']);
    expect(extended.schema['name'].type).toBe('string');
    expect(extended.schema['email'].type).toBe('string');
    expect(extended.schema['age'].type).toBe('number');
  });

  it('throws when additional field conflicts with base field', () => {
    const base = createBrandedInterface('BaseItem', {
      id: { type: 'number' },
      label: { type: 'string' },
    });

    expect(() =>
      extendInterface(base, 'ExtItem', { label: { type: 'number' } })
    ).toThrow(/conflicts/i);
  });

  it('extended definition can create valid instances', () => {
    const base = createBrandedInterface('ExtBase', { a: { type: 'string' } });
    const extended = extendInterface(base, 'ExtDerived', { b: { type: 'number' } });

    const instance = extended.create({ a: 'hi', b: 42 } as Record<string, unknown>);
    expect(instance.a).toBe('hi');
    expect(instance.b).toBe(42);
  });
});
