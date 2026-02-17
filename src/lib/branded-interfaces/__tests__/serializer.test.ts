/**
 * Property-based tests for branded-interfaces serializer module.
 *
 * Feature: branded-interfaces
 * Properties 25-26: Serialization round-trip and deserialization rejection
 */

import * as fc from 'fast-check';
import { createBrandedInterface } from '../factory.js';
import { resetInterfaceRegistry } from '../registry.js';
import { interfaceSerializer } from '../serializer.js';
import {
  arbUniqueId,
  arbInterfaceSchema,
  arbMatchingData,
} from './arbitraries.js';

// =============================================================================
// Property 25: Serialization round-trip
// =============================================================================

describe('Feature: branded-interfaces, Property 25: Serialization round-trip', () => {
  /**
   * **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
   *
   * *For any* valid branded interface instance, serializing with
   * `interfaceSerializer().serialize()` then deserializing with `deserialize()`
   * should produce a value whose enumerable properties are deeply equal to the
   * original instance's enumerable properties.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('round-trips: serialize then deserialize produces equivalent enumerable properties', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbInterfaceSchema.chain((schema) =>
          arbMatchingData(schema).map((data) => ({ schema, data })),
        ),
        (id, { schema, data }) => {
          resetInterfaceRegistry();
          const def = createBrandedInterface(id, schema);
          const instance = def.create(data as Record<string, unknown>);
          const serializer = interfaceSerializer(def);

          const json = serializer.serialize(instance);
          const result = serializer.deserialize(json);

          expect(result.success).toBe(true);
          if (result.success) {
            // Enumerable properties should be deeply equal
            const originalKeys = Object.keys(instance).sort();
            const roundTrippedKeys = Object.keys(result.value).sort();
            expect(roundTrippedKeys).toEqual(originalKeys);

            for (const key of originalKeys) {
              expect(result.value[key]).toEqual(instance[key]);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


// =============================================================================
// Property 26: Deserialization rejects invalid input
// =============================================================================

describe('Feature: branded-interfaces, Property 26: Deserialization rejects invalid input', () => {
  /**
   * **Validates: Requirements 9.4**
   *
   * *For any* JSON string that does not match the interface schema,
   * `deserialize()` should return a failure result with a descriptive error.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('returns failure for invalid JSON strings', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbInterfaceSchema,
        fc.string().filter((s) => {
          try { JSON.parse(s); return false; } catch { return true; }
        }),
        (id, schema, invalidJson) => {
          const def = createBrandedInterface(id, schema);
          const serializer = interfaceSerializer(def);

          const result = serializer.deserialize(invalidJson);

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.message).toBeTruthy();
            expect(result.error.code).toBeTruthy();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns failure for data that does not match the schema', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbInterfaceSchema.filter((schema) => {
          // Ensure at least one non-optional field exists
          return Object.values(schema).some((d) => !d.optional);
        }),
        (id, schema) => {
          const def = createBrandedInterface(id, schema);
          const serializer = interfaceSerializer(def);

          // Create data with wrong types for all fields
          const wrongData: Record<string, unknown> = {};
          for (const [fieldName, descriptor] of Object.entries(schema)) {
            if (descriptor.type === 'string') wrongData[fieldName] = 42;
            else if (descriptor.type === 'number') wrongData[fieldName] = 'not-a-number';
            else if (descriptor.type === 'boolean') wrongData[fieldName] = 'not-a-boolean';
            else if (descriptor.type === 'object') wrongData[fieldName] = 'not-an-object';
            else if (descriptor.type === 'array') wrongData[fieldName] = 'not-an-array';
            else wrongData[fieldName] = 42;
          }

          const json = JSON.stringify(wrongData);
          const result = serializer.deserialize(json);

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.message).toBeTruthy();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


// =============================================================================
// Unit Tests for serializer
// =============================================================================

describe('interfaceSerializer — unit tests', () => {
  beforeEach(() => {
    resetInterfaceRegistry();
  });

  // ---------------------------------------------------------------------------
  // Requirement 9.1: interfaceSerializer returns serialize/deserialize methods
  // ---------------------------------------------------------------------------

  it('returns an object with serialize, deserialize, and deserializeOrThrow', () => {
    const def = createBrandedInterface('SerUser', {
      name: { type: 'string' },
    });
    const serializer = interfaceSerializer(def);

    expect(typeof serializer.serialize).toBe('function');
    expect(typeof serializer.deserialize).toBe('function');
    expect(typeof serializer.deserializeOrThrow).toBe('function');
  });

  // ---------------------------------------------------------------------------
  // Requirement 9.2: serialize produces JSON without Symbol metadata
  // ---------------------------------------------------------------------------

  it('serialize produces valid JSON without Symbol metadata', () => {
    const def = createBrandedInterface('SerPerson', {
      name: { type: 'string' },
      age: { type: 'number' },
    });
    const instance = def.create({ name: 'Alice', age: 30 } as Record<string, unknown>);
    const serializer = interfaceSerializer(def);

    const json = serializer.serialize(instance);
    const parsed = JSON.parse(json);

    expect(parsed).toEqual({ name: 'Alice', age: 30 });
    expect(Object.getOwnPropertySymbols(parsed)).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Requirement 9.3: deserialize validates and brands the result
  // ---------------------------------------------------------------------------

  it('deserialize returns success with branded instance for valid JSON', () => {
    const def = createBrandedInterface('SerProduct', {
      title: { type: 'string' },
      price: { type: 'number' },
    });
    const serializer = interfaceSerializer(def);

    const result = serializer.deserialize('{"title":"Widget","price":9.99}');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.title).toBe('Widget');
      expect(result.value.price).toBe(9.99);
    }
  });

  // ---------------------------------------------------------------------------
  // Requirement 9.4: deserialize rejects invalid input
  // ---------------------------------------------------------------------------

  it('deserialize returns failure for invalid JSON string', () => {
    const def = createBrandedInterface('SerInvalid1', {
      x: { type: 'string' },
    });
    const serializer = interfaceSerializer(def);

    const result = serializer.deserialize('not valid json{');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_JSON');
      expect(result.error.message).toContain('Invalid JSON');
    }
  });

  it('deserialize returns failure for wrong field types', () => {
    const def = createBrandedInterface('SerInvalid2', {
      name: { type: 'string' },
      age: { type: 'number' },
    });
    const serializer = interfaceSerializer(def);

    const result = serializer.deserialize('{"name":123,"age":"not-a-number"}');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBeTruthy();
    }
  });

  it('deserialize returns failure for missing required fields', () => {
    const def = createBrandedInterface('SerInvalid3', {
      name: { type: 'string' },
      age: { type: 'number' },
    });
    const serializer = interfaceSerializer(def);

    const result = serializer.deserialize('{"name":"Alice"}');

    expect(result.success).toBe(false);
  });

  it('deserialize returns failure for non-string non-object input', () => {
    const def = createBrandedInterface('SerInvalid4', {
      x: { type: 'string' },
    });
    const serializer = interfaceSerializer(def);

    const result = serializer.deserialize(42);

    expect(result.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Requirement 9.5: Round-trip with specific instances
  // ---------------------------------------------------------------------------

  it('round-trips a simple instance', () => {
    const def = createBrandedInterface('SerRoundTrip', {
      name: { type: 'string' },
      active: { type: 'boolean' },
      count: { type: 'number' },
    });
    const instance = def.create({ name: 'Bob', active: true, count: 5 } as Record<string, unknown>);
    const serializer = interfaceSerializer(def);

    const json = serializer.serialize(instance);
    const result = serializer.deserialize(json);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.name).toBe('Bob');
      expect(result.value.active).toBe(true);
      expect(result.value.count).toBe(5);
    }
  });

  it('round-trips an instance with optional fields present', () => {
    const def = createBrandedInterface('SerOptional', {
      name: { type: 'string' },
      bio: { type: 'string', optional: true },
    });
    const instance = def.create({ name: 'Carol', bio: 'Hello' } as Record<string, unknown>);
    const serializer = interfaceSerializer(def);

    const json = serializer.serialize(instance);
    const result = serializer.deserialize(json);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.name).toBe('Carol');
      expect(result.value.bio).toBe('Hello');
    }
  });

  it('round-trips an instance with nullable fields set to null', () => {
    const def = createBrandedInterface('SerNullable', {
      name: { type: 'string' },
      nickname: { type: 'string', nullable: true },
    });
    const instance = def.create({ name: 'Dave', nickname: null } as Record<string, unknown>);
    const serializer = interfaceSerializer(def);

    const json = serializer.serialize(instance);
    const result = serializer.deserialize(json);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.name).toBe('Dave');
      expect(result.value.nickname).toBeNull();
    }
  });

  // ---------------------------------------------------------------------------
  // deserializeOrThrow
  // ---------------------------------------------------------------------------

  it('deserializeOrThrow returns branded instance for valid JSON', () => {
    const def = createBrandedInterface('SerThrowOk', {
      x: { type: 'string' },
    });
    const serializer = interfaceSerializer(def);

    const result = serializer.deserializeOrThrow('{"x":"hello"}');
    expect(result.x).toBe('hello');
  });

  it('deserializeOrThrow throws for invalid JSON', () => {
    const def = createBrandedInterface('SerThrowBad', {
      x: { type: 'string' },
    });
    const serializer = interfaceSerializer(def);

    expect(() => serializer.deserializeOrThrow('not json')).toThrow();
  });

  it('deserializeOrThrow throws for schema mismatch', () => {
    const def = createBrandedInterface('SerThrowMismatch', {
      x: { type: 'string' },
    });
    const serializer = interfaceSerializer(def);

    expect(() => serializer.deserializeOrThrow('{"x":42}')).toThrow();
  });
});
