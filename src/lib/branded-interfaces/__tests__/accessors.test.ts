/**
 * Property-based tests for metadata accessors.
 *
 * Feature: branded-interfaces
 * Property 14: Metadata accessors return correct values
 */

import * as fc from 'fast-check';
import { createBrandedInterface } from '../factory.js';
import { resetInterfaceRegistry } from '../registry.js';
import {
  getInterfaceId,
  getInterfaceSchema,
  getInterfaceFields,
  interfaceFieldCount,
} from '../accessors.js';
import { INTERFACE_ID } from '../types.js';
import {
  arbUniqueId,
  arbInterfaceSchema,
  arbMatchingData,
} from './arbitraries.js';

// =============================================================================
// Property 14: Metadata accessors return correct values
// =============================================================================

describe('Feature: branded-interfaces, Property 14: Metadata accessors return correct values', () => {
  /**
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
   *
   * *For any* created branded interface definition with schema S:
   * - `getInterfaceId()` should return the definition's ID
   * - `getInterfaceSchema()` should return S
   * - `getInterfaceFields()` should return the keys of S
   * - `interfaceFieldCount()` should return the number of keys in S
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  // ---------------------------------------------------------------------------
  // Accessors on definitions
  // ---------------------------------------------------------------------------

  it('getInterfaceId returns the definition ID', () => {
    fc.assert(
      fc.property(arbUniqueId, arbInterfaceSchema, (id, schema) => {
        const def = createBrandedInterface(id, schema);
        expect(getInterfaceId(def)).toBe(id);
      }),
      { numRuns: 100 },
    );
  });

  it('getInterfaceSchema returns the schema from the definition', () => {
    fc.assert(
      fc.property(arbUniqueId, arbInterfaceSchema, (id, schema) => {
        const def = createBrandedInterface(id, schema);
        expect(getInterfaceSchema(def)).toBe(schema);
      }),
      { numRuns: 100 },
    );
  });

  it('getInterfaceFields returns the keys of the schema', () => {
    fc.assert(
      fc.property(arbUniqueId, arbInterfaceSchema, (id, schema) => {
        const def = createBrandedInterface(id, schema);
        const fields = getInterfaceFields(def);
        expect(fields).toBeDefined();
        expect(fields!.sort()).toEqual(Object.keys(schema).sort());
      }),
      { numRuns: 100 },
    );
  });

  it('interfaceFieldCount returns the number of keys in the schema', () => {
    fc.assert(
      fc.property(arbUniqueId, arbInterfaceSchema, (id, schema) => {
        const def = createBrandedInterface(id, schema);
        expect(interfaceFieldCount(def)).toBe(Object.keys(schema).length);
      }),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // Accessors on branded instances
  // ---------------------------------------------------------------------------

  it('getInterfaceId returns the ID from a branded instance', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbInterfaceSchema.chain((schema) =>
          arbMatchingData(schema).map((data) => ({ schema, data })),
        ),
        (id, { schema, data }) => {
          const def = createBrandedInterface(id, schema);
          const instance = def.create(data as Record<string, unknown>);
          expect(getInterfaceId(instance)).toBe(id);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('getInterfaceSchema returns the schema from a branded instance', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbInterfaceSchema.chain((schema) =>
          arbMatchingData(schema).map((data) => ({ schema, data })),
        ),
        (id, { schema, data }) => {
          const def = createBrandedInterface(id, schema);
          const instance = def.create(data as Record<string, unknown>);
          expect(getInterfaceSchema(instance)).toBe(schema);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('getInterfaceFields returns the keys from a branded instance', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbInterfaceSchema.chain((schema) =>
          arbMatchingData(schema).map((data) => ({ schema, data })),
        ),
        (id, { schema, data }) => {
          const def = createBrandedInterface(id, schema);
          const instance = def.create(data as Record<string, unknown>);
          const fields = getInterfaceFields(instance);
          expect(fields).toBeDefined();
          expect(fields!.sort()).toEqual(Object.keys(schema).sort());
        },
      ),
      { numRuns: 100 },
    );
  });

  it('interfaceFieldCount returns the correct count from a branded instance', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbInterfaceSchema.chain((schema) =>
          arbMatchingData(schema).map((data) => ({ schema, data })),
        ),
        (id, { schema, data }) => {
          const def = createBrandedInterface(id, schema);
          const instance = def.create(data as Record<string, unknown>);
          expect(interfaceFieldCount(instance)).toBe(Object.keys(schema).length);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // Accessors on non-branded values return undefined
  // ---------------------------------------------------------------------------

  it('all accessors return undefined for non-branded values', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.double({ noNaN: true }),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined),
          fc.constant({}),
          fc.constant([]),
        ),
        (value) => {
          expect(getInterfaceId(value)).toBeUndefined();
          expect(getInterfaceSchema(value)).toBeUndefined();
          expect(getInterfaceFields(value)).toBeUndefined();
          expect(interfaceFieldCount(value)).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// =============================================================================
// Unit Tests: Accessors with specific examples
// =============================================================================

describe('Unit Tests: Accessors', () => {
  /**
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
   *
   * Tests accessors with definitions, branded instances, and non-definition objects.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  const schema = {
    name: { type: 'string' as const },
    age: { type: 'number' as const },
    active: { type: 'boolean' as const },
  };

  // ---------------------------------------------------------------------------
  // getInterfaceId
  // ---------------------------------------------------------------------------

  describe('getInterfaceId', () => {
    it('returns ID on a definition', () => {
      const def = createBrandedInterface('AccDef1', schema);
      expect(getInterfaceId(def)).toBe('AccDef1');
    });

    it('returns ID on a branded instance', () => {
      const def = createBrandedInterface('AccInst1', schema);
      const instance = def.create({ name: 'Alice', age: 30, active: true });
      expect(getInterfaceId(instance)).toBe('AccInst1');
    });

    it('returns undefined on a plain object', () => {
      expect(getInterfaceId({ name: 'Alice' })).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // getInterfaceSchema
  // ---------------------------------------------------------------------------

  describe('getInterfaceSchema', () => {
    it('returns schema on a definition', () => {
      const def = createBrandedInterface('AccSchema1', schema);
      expect(getInterfaceSchema(def)).toBe(schema);
    });
  });

  // ---------------------------------------------------------------------------
  // getInterfaceFields
  // ---------------------------------------------------------------------------

  describe('getInterfaceFields', () => {
    it('returns field names on a definition', () => {
      const def = createBrandedInterface('AccFields1', schema);
      const fields = getInterfaceFields(def);
      expect(fields).toBeDefined();
      expect(fields!.sort()).toEqual(['active', 'age', 'name']);
    });
  });

  // ---------------------------------------------------------------------------
  // interfaceFieldCount
  // ---------------------------------------------------------------------------

  describe('interfaceFieldCount', () => {
    it('returns count on a definition', () => {
      const def = createBrandedInterface('AccCount1', schema);
      expect(interfaceFieldCount(def)).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // All accessors return undefined for non-branded values
  // ---------------------------------------------------------------------------

  describe('all accessors return undefined for non-branded values', () => {
    it.each([null, undefined, 42, 'hello'])('returns undefined for %p', (value) => {
      expect(getInterfaceId(value)).toBeUndefined();
      expect(getInterfaceSchema(value)).toBeUndefined();
      expect(getInterfaceFields(value)).toBeUndefined();
      expect(interfaceFieldCount(value)).toBeUndefined();
    });
  });
});
