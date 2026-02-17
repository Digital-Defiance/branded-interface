/**
 * Property-based tests for branded-interfaces diff and intersect module.
 *
 * Feature: branded-interfaces
 * Properties 23-24: Diff and intersect tests
 */

import * as fc from 'fast-check';
import { interfaceDiff, interfaceIntersect } from '../diff.js';
import { createBrandedInterface } from '../factory.js';
import { resetInterfaceRegistry } from '../registry.js';
import type { InterfaceSchema, FieldDescriptor } from '../types.js';
import { arbUniqueId, arbFieldDescriptor } from './arbitraries.js';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Generates a schema where all field names are prefixed with the given string.
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
// Property 23: Diff partitions fields correctly
// =============================================================================

describe('Feature: branded-interfaces, Property 23: Diff partitions fields correctly', () => {
  /**
   * **Validates: Requirements 8.1**
   *
   * *For any* two branded interface definitions, `interfaceDiff()` should return
   * `onlyInFirst`, `onlyInSecond`, and `inBoth` such that their field names form
   * a partition of the union of all field names from both definitions.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('diff partitions cover the union of all fields with no overlap', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbUniqueId,
        arbPrefixedSchema('x_'),
        arbPrefixedSchema('y_'),
        // Also generate some shared fields
        fc.array(
          fc.tuple(
            fc
              .string({ minLength: 1, maxLength: 10 })
              .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s))
              .map((s) => `shared_${s}`),
            arbFieldDescriptor,
            arbFieldDescriptor,
          ),
          { minLength: 0, maxLength: 3 },
        ),
        (idA, idB, schemaOnlyA, schemaOnlyB, sharedEntries) => {
          // Build schemas with unique-to-A, unique-to-B, and shared fields
          const schemaA: Record<string, FieldDescriptor> = { ...schemaOnlyA };
          const schemaB: Record<string, FieldDescriptor> = { ...schemaOnlyB };

          for (const [name, descA, descB] of sharedEntries) {
            schemaA[name] = descA;
            schemaB[name] = descB;
          }

          const defA = createBrandedInterface(idA, schemaA as InterfaceSchema);
          const defB = createBrandedInterface(idB, schemaB as InterfaceSchema);

          const diff = interfaceDiff(defA, defB);

          // Collect all field names from the three partitions
          const onlyFirstFields = new Set(diff.onlyInFirst.map((e) => e.field));
          const onlySecondFields = new Set(diff.onlyInSecond.map((e) => e.field));
          const inBothFields = new Set(diff.inBoth.map((e) => e.field));

          // Union of all partitions should equal union of both schemas
          const allPartitioned = new Set([
            ...onlyFirstFields,
            ...onlySecondFields,
            ...inBothFields,
          ]);
          const allFields = new Set([
            ...Object.keys(schemaA),
            ...Object.keys(schemaB),
          ]);

          expect(allPartitioned).toEqual(allFields);

          // No overlap between partitions
          for (const f of onlyFirstFields) {
            expect(onlySecondFields.has(f)).toBe(false);
            expect(inBothFields.has(f)).toBe(false);
          }
          for (const f of onlySecondFields) {
            expect(onlyFirstFields.has(f)).toBe(false);
            expect(inBothFields.has(f)).toBe(false);
          }
          for (const f of inBothFields) {
            expect(onlyFirstFields.has(f)).toBe(false);
            expect(onlySecondFields.has(f)).toBe(false);
          }

          // onlyInFirst fields should be in A but not B
          for (const f of onlyFirstFields) {
            expect(f in schemaA).toBe(true);
            expect(f in schemaB).toBe(false);
          }

          // onlyInSecond fields should be in B but not A
          for (const f of onlySecondFields) {
            expect(f in schemaB).toBe(true);
            expect(f in schemaA).toBe(false);
          }

          // inBoth fields should be in both A and B
          for (const f of inBothFields) {
            expect(f in schemaA).toBe(true);
            expect(f in schemaB).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// =============================================================================
// Property 24: Intersect produces compatible shared fields and reports conflicts
// =============================================================================

describe('Feature: branded-interfaces, Property 24: Intersect produces compatible shared fields and reports conflicts', () => {
  /**
   * **Validates: Requirements 8.2, 8.3**
   *
   * *For any* two branded interface definitions, `interfaceIntersect()` should
   * produce a definition containing only fields present in both with compatible
   * types, and a `conflicts` list containing fields present in both with
   * incompatible types. The union of intersected fields and conflicted fields
   * should equal the set of fields present in both definitions.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('intersected + conflicted fields equal the set of shared fields', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbUniqueId,
        arbUniqueId,
        // Generate two schemas with some overlapping fields
        fc.tuple(
          arbPrefixedSchema('p_'),
          arbPrefixedSchema('q_'),
          // Compatible shared fields (same type)
          fc.array(
            fc.tuple(
              fc
                .string({ minLength: 1, maxLength: 10 })
                .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s))
                .map((s) => `compat_${s}`),
              arbFieldDescriptor,
            ),
            { minLength: 0, maxLength: 3 },
          ),
          // Incompatible shared fields (different types)
          fc.array(
            fc.tuple(
              fc
                .string({ minLength: 1, maxLength: 10 })
                .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s))
                .map((s) => `incompat_${s}`),
              fc.constantFrom('string', 'number', 'boolean') as fc.Arbitrary<FieldDescriptor['type']>,
              fc.constantFrom('string', 'number', 'boolean') as fc.Arbitrary<FieldDescriptor['type']>,
            )
            .filter(([, t1, t2]) => t1 !== t2),
            { minLength: 0, maxLength: 3 },
          ),
        ),
        (idA, idB, intersectId, [schemaOnlyA, schemaOnlyB, compatEntries, incompatEntries]) => {
          const schemaA: Record<string, FieldDescriptor> = { ...schemaOnlyA };
          const schemaB: Record<string, FieldDescriptor> = { ...schemaOnlyB };

          // Add compatible shared fields (same descriptor in both)
          for (const [name, desc] of compatEntries) {
            schemaA[name] = desc;
            schemaB[name] = desc;
          }

          // Add incompatible shared fields (different types)
          for (const [name, typeA, typeB] of incompatEntries) {
            schemaA[name] = { type: typeA };
            schemaB[name] = { type: typeB };
          }

          const defA = createBrandedInterface(idA, schemaA as InterfaceSchema);
          const defB = createBrandedInterface(idB, schemaB as InterfaceSchema);

          const result = interfaceIntersect(defA, defB, intersectId);

          // Collect shared fields from both schemas
          const fieldsInA = new Set(Object.keys(schemaA));
          const sharedFields = new Set(
            Object.keys(schemaB).filter((f) => fieldsInA.has(f)),
          );

          // Intersected definition fields + conflict fields = shared fields
          const intersectedFields = new Set(Object.keys(result.definition.schema));
          const conflictFields = new Set(result.conflicts.map((c) => c.field));

          const combined = new Set([...intersectedFields, ...conflictFields]);
          expect(combined).toEqual(sharedFields);

          // No overlap between intersected and conflicted
          for (const f of intersectedFields) {
            expect(conflictFields.has(f)).toBe(false);
          }

          // Compatible shared fields should be in the definition
          for (const [name] of compatEntries) {
            expect(intersectedFields.has(name)).toBe(true);
          }

          // Incompatible shared fields should be in conflicts
          for (const [name] of incompatEntries) {
            expect(conflictFields.has(name)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


// =============================================================================
// Unit Tests for interfaceDiff and interfaceIntersect
// =============================================================================

describe('interfaceDiff — unit tests', () => {
  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('partitions overlapping definitions correctly', () => {
    const defA = createBrandedInterface('DiffA', {
      name: { type: 'string' },
      age: { type: 'number' },
      shared: { type: 'boolean' },
    });
    const defB = createBrandedInterface('DiffB', {
      shared: { type: 'boolean' },
      email: { type: 'string' },
    });

    const diff = interfaceDiff(defA, defB);

    expect(diff.onlyInFirst.map((e) => e.field).sort()).toEqual(['age', 'name']);
    expect(diff.onlyInSecond.map((e) => e.field)).toEqual(['email']);
    expect(diff.inBoth.map((e) => e.field)).toEqual(['shared']);
  });

  it('handles non-overlapping definitions', () => {
    const defA = createBrandedInterface('NoOverlapA', {
      x: { type: 'string' },
    });
    const defB = createBrandedInterface('NoOverlapB', {
      y: { type: 'number' },
    });

    const diff = interfaceDiff(defA, defB);

    expect(diff.onlyInFirst.map((e) => e.field)).toEqual(['x']);
    expect(diff.onlyInSecond.map((e) => e.field)).toEqual(['y']);
    expect(diff.inBoth).toEqual([]);
  });

  it('handles identical schemas', () => {
    const defA = createBrandedInterface('IdentA', {
      a: { type: 'string' },
      b: { type: 'number' },
    });
    const defB = createBrandedInterface('IdentB', {
      a: { type: 'string' },
      b: { type: 'number' },
    });

    const diff = interfaceDiff(defA, defB);

    expect(diff.onlyInFirst).toEqual([]);
    expect(diff.onlyInSecond).toEqual([]);
    expect(diff.inBoth.map((e) => e.field).sort()).toEqual(['a', 'b']);
  });
});

describe('interfaceIntersect — unit tests', () => {
  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('intersects compatible shared fields into a new definition', () => {
    const defA = createBrandedInterface('IntA', {
      name: { type: 'string' },
      age: { type: 'number' },
    });
    const defB = createBrandedInterface('IntB', {
      name: { type: 'string' },
      email: { type: 'string' },
    });

    const result = interfaceIntersect(defA, defB, 'IntAB');

    expect(Object.keys(result.definition.schema)).toEqual(['name']);
    expect(result.definition.schema['name'].type).toBe('string');
    expect(result.conflicts).toEqual([]);
  });

  it('reports incompatible shared fields as conflicts', () => {
    const defA = createBrandedInterface('ConflictA', {
      value: { type: 'string' },
      count: { type: 'number' },
    });
    const defB = createBrandedInterface('ConflictB', {
      value: { type: 'number' },
      count: { type: 'number' },
    });

    const result = interfaceIntersect(defA, defB, 'ConflictAB');

    expect(Object.keys(result.definition.schema)).toEqual(['count']);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].field).toBe('value');
    expect(result.conflicts[0].first.type).toBe('string');
    expect(result.conflicts[0].second.type).toBe('number');
  });

  it('handles no shared fields — empty intersection', () => {
    const defA = createBrandedInterface('DisjointA', {
      x: { type: 'string' },
    });
    const defB = createBrandedInterface('DisjointB', {
      y: { type: 'number' },
    });

    const result = interfaceIntersect(defA, defB, 'DisjointAB');

    expect(Object.keys(result.definition.schema)).toEqual([]);
    expect(result.conflicts).toEqual([]);
  });
});
