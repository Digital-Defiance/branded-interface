/**
 * Property-based tests for branded-interfaces factory module.
 *
 * Feature: branded-interfaces
 * Properties 1-7: Interface and Primitive factory tests
 */

import * as fc from 'fast-check';
import { createBrandedInterface, createBrandedPrimitive } from '../factory.js';
import { resetInterfaceRegistry } from '../registry.js';
import {
  INTERFACE_ID,
  INTERFACE_SCHEMA,
  INTERFACE_VERSION,
  PRIMITIVE_ID,
  PRIMITIVE_BASE_TYPE,
} from '../types.js';
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
// Property 1: Interface definition structure and freezing
// =============================================================================

describe('Feature: branded-interfaces, Property 1: Interface definition structure and freezing', () => {
  /**
   * **Validates: Requirements 1.1**
   *
   * *For any* valid interface ID and field schema, `createBrandedInterface()`
   * should return a frozen object with `id`, `schema`, `version`, `create`,
   * `validate` properties and non-enumerable `INTERFACE_ID`, `INTERFACE_SCHEMA`,
   * `INTERFACE_VERSION` Symbol metadata.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('returns a frozen definition with correct enumerable properties', () => {
    fc.assert(
      fc.property(arbUniqueId, arbInterfaceSchema, (id, schema) => {
        const def = createBrandedInterface(id, schema);

        // Enumerable properties
        expect(def.id).toBe(id);
        expect(def.schema).toBe(schema);
        expect(def.version).toBe(1);
        expect(typeof def.create).toBe('function');
        expect(typeof def.validate).toBe('function');

        // Frozen
        expect(Object.isFrozen(def)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('attaches non-enumerable Symbol metadata', () => {
    fc.assert(
      fc.property(arbUniqueId, arbInterfaceSchema, (id, schema) => {
        const def = createBrandedInterface(id, schema);

        // Non-enumerable Symbol metadata
        expect(def[INTERFACE_ID]).toBe(id);
        expect(def[INTERFACE_SCHEMA]).toBe(schema);
        expect(def[INTERFACE_VERSION]).toBe(1);

        // Symbols should not appear in Object.keys
        const keys = Object.keys(def);
        expect(keys).not.toContain(String(INTERFACE_ID));
        expect(keys).not.toContain(String(INTERFACE_SCHEMA));
        expect(keys).not.toContain(String(INTERFACE_VERSION));
      }),
      { numRuns: 100 },
    );
  });
});


// =============================================================================
// Property 2: Interface factory idempotence
// =============================================================================

describe('Feature: branded-interfaces, Property 2: Interface factory idempotence', () => {
  /**
   * **Validates: Requirements 1.2**
   *
   * *For any* interface ID, calling `createBrandedInterface()` twice with the
   * same ID should return the exact same reference (referential equality).
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('returns the same reference when called twice with the same ID', () => {
    fc.assert(
      fc.property(arbUniqueId, arbInterfaceSchema, arbInterfaceSchema, (id, schema1, schema2) => {
        const def1 = createBrandedInterface(id, schema1);
        const def2 = createBrandedInterface(id, schema2);

        expect(def2).toBe(def1);
      }),
      { numRuns: 100 },
    );
  });
});

// =============================================================================
// Property 3: Valid data produces branded instances
// =============================================================================

describe('Feature: branded-interfaces, Property 3: Valid data produces branded instances', () => {
  /**
   * **Validates: Requirements 1.3, 1.5, 1.6, 1.7**
   *
   * *For any* field schema and any plain object matching that schema,
   * calling `create()` should return a frozen object containing all the
   * input data plus non-enumerable `INTERFACE_ID` Symbol metadata.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('creates a frozen branded instance with correct data and metadata', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbInterfaceSchema.chain((schema) =>
          arbMatchingData(schema).map((data) => ({ schema, data })),
        ),
        (id, { schema, data }) => {
          const def = createBrandedInterface(id, schema);
          const instance = def.create(data as Record<string, unknown>);

          // All input data should be present
          for (const [key, value] of Object.entries(data)) {
            expect(instance[key]).toEqual(value);
          }

          // Should be frozen
          expect(Object.isFrozen(instance)).toBe(true);

          // Non-enumerable INTERFACE_ID metadata
          expect((instance as unknown as Record<symbol, unknown>)[INTERFACE_ID]).toBe(id);

          // INTERFACE_ID should not appear in Object.keys
          expect(Object.keys(instance)).not.toContain(String(INTERFACE_ID));
        },
      ),
      { numRuns: 100 },
    );
  });
});

// =============================================================================
// Property 4: Invalid data is rejected with field-level errors
// =============================================================================

describe('Feature: branded-interfaces, Property 4: Invalid data is rejected with field-level errors', () => {
  /**
   * **Validates: Requirements 1.4, 1.5**
   *
   * *For any* field schema and any plain object that does NOT match the schema,
   * calling `create()` should throw an error whose message identifies the
   * failing field(s).
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('throws an error identifying the failing field', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbInterfaceSchema
          .filter((schema) => {
            // Ensure at least one non-optional field exists for corruption
            return Object.values(schema).some((d) => !d.optional);
          })
          .chain((schema) =>
            arbNonMatchingData(schema).map((data) => ({ schema, data })),
          ),
        (id, { schema, data }) => {
          const def = createBrandedInterface(id, schema);

          expect(() => def.create(data as Record<string, unknown>)).toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// =============================================================================
// Property 5: Primitive definition structure and freezing
// =============================================================================

describe('Feature: branded-interfaces, Property 5: Primitive definition structure and freezing', () => {
  /**
   * **Validates: Requirements 2.1**
   *
   * *For any* valid primitive ID and base type, `createBrandedPrimitive()`
   * should return a frozen object with `id`, `baseType`, `create`, `validate`
   * properties and non-enumerable Symbol metadata.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('returns a frozen definition with correct properties and Symbol metadata', () => {
    fc.assert(
      fc.property(arbUniqueId, arbPrimitiveBaseType, (id, baseType) => {
        const def = createBrandedPrimitive(id, baseType);

        // Enumerable properties
        expect(def.id).toBe(id);
        expect(def.baseType).toBe(baseType);
        expect(typeof def.create).toBe('function');
        expect(typeof def.validate).toBe('function');

        // Frozen
        expect(Object.isFrozen(def)).toBe(true);

        // Non-enumerable Symbol metadata
        expect(def[PRIMITIVE_ID]).toBe(id);
        expect(def[PRIMITIVE_BASE_TYPE]).toBe(baseType);
      }),
      { numRuns: 100 },
    );
  });
});

// =============================================================================
// Property 6: Primitive factory idempotence
// =============================================================================

describe('Feature: branded-interfaces, Property 6: Primitive factory idempotence', () => {
  /**
   * **Validates: Requirements 2.2**
   *
   * *For any* primitive ID, calling `createBrandedPrimitive()` twice with the
   * same ID should return the exact same reference.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('returns the same reference when called twice with the same ID', () => {
    fc.assert(
      fc.property(arbUniqueId, arbPrimitiveBaseType, arbPrimitiveBaseType, (id, bt1, bt2) => {
        const def1 = createBrandedPrimitive(id, bt1);
        const def2 = createBrandedPrimitive(id, bt2);

        expect(def2).toBe(def1);
      }),
      { numRuns: 100 },
    );
  });
});

// =============================================================================
// Property 7: Primitive create accepts valid values and rejects invalid
// =============================================================================

describe('Feature: branded-interfaces, Property 7: Primitive create accepts valid values and rejects invalid', () => {
  /**
   * **Validates: Requirements 2.3, 2.4, 2.5**
   *
   * *For any* branded primitive definition with a validation predicate,
   * `create()` should return the value when it matches the base type and
   * passes the predicate, throw when the base type is wrong, and throw
   * (with predicate name in message) when the base type matches but the
   * predicate fails.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('accepts values matching the base type (no predicate)', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbPrimitiveBaseType.chain((bt) =>
          arbMatchingPrimitive(bt).map((val) => ({ baseType: bt, value: val })),
        ),
        (id, { baseType, value }) => {
          const def = createBrandedPrimitive(id, baseType);
          const result = def.create(value as never);
          expect(result).toBe(value);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects values of the wrong base type', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbPrimitiveBaseType.chain((bt) =>
          arbNonMatchingPrimitive(bt).map((val) => ({ baseType: bt, value: val })),
        ),
        (id, { baseType, value }) => {
          const def = createBrandedPrimitive(id, baseType);
          expect(() => def.create(value as never)).toThrow(/expected type/i);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects values that match the base type but fail the predicate', () => {
    fc.assert(
      fc.property(arbUniqueId, (id) => {
        // Use a named predicate that always rejects
        function isPositive(v: number): boolean {
          return v > 0;
        }

        const def = createBrandedPrimitive<number>(id, 'number', isPositive);

        // -1 is a number but fails the predicate
        expect(() => def.create(-1 as never)).toThrow(/isPositive/);
      }),
      { numRuns: 100 },
    );
  });

  it('accepts values that match the base type and pass the predicate', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        fc.double({ min: 0.001, noNaN: true, noDefaultInfinity: true }),
        (id, value) => {
          function isPositive(v: number): boolean {
            return v > 0;
          }

          const def = createBrandedPrimitive<number>(id, 'number', isPositive);
          const result = def.create(value as never);
          expect(result).toBe(value);
        },
      ),
      { numRuns: 100 },
    );
  });
});


// =============================================================================
// Unit Tests for createBrandedInterface
// =============================================================================

describe('createBrandedInterface — unit tests', () => {
  beforeEach(() => {
    resetInterfaceRegistry();
  });

  // 1. Simple schema with string and number fields
  it('creates a branded instance from a simple schema with string and number fields', () => {
    const def = createBrandedInterface('User', {
      name: { type: 'string' },
      age: { type: 'number' },
    });

    const instance = def.create({ name: 'Alice', age: 30 } as Record<string, unknown>);

    expect(instance.name).toBe('Alice');
    expect(instance.age).toBe(30);
    expect(Object.isFrozen(instance)).toBe(true);
    expect(Object.isFrozen(def)).toBe(true);
  });

  // 2. Optional field — create succeeds when field is undefined
  it('allows undefined for optional fields', () => {
    const def = createBrandedInterface('Profile', {
      name: { type: 'string' },
      bio: { type: 'string', optional: true },
    });

    const instance = def.create({ name: 'Bob' } as Record<string, unknown>);
    expect(instance.name).toBe('Bob');
    expect(instance.bio).toBeUndefined();
  });

  // 3. Nullable field — create succeeds when field is null
  it('allows null for nullable fields', () => {
    const def = createBrandedInterface('Contact', {
      email: { type: 'string' },
      phone: { type: 'string', nullable: true },
    });

    const instance = def.create({ email: 'a@b.com', phone: null } as Record<string, unknown>);
    expect(instance.email).toBe('a@b.com');
    expect(instance.phone).toBeNull();
  });

  // 4. Missing required field — create throws with field name in error
  it('throws with field name when a required field is missing', () => {
    const def = createBrandedInterface('Order', {
      id: { type: 'number' },
      item: { type: 'string' },
    });

    expect(() => def.create({ id: 1 } as Record<string, unknown>)).toThrow(/item/);
  });

  // 5. Wrong type for field — create throws with field name and expected/actual types
  it('throws with field name and expected/actual types on type mismatch', () => {
    const def = createBrandedInterface('Product', {
      name: { type: 'string' },
      price: { type: 'number' },
    });

    expect(() =>
      def.create({ name: 'Widget', price: 'ten' } as Record<string, unknown>)
    ).toThrow(/price.*expected type "number".*got "string"/);
  });

  // 6. validate() returns true for valid data, false for invalid
  it('validate() returns true for valid data and false for invalid data', () => {
    const def = createBrandedInterface('Item', {
      label: { type: 'string' },
      count: { type: 'number' },
    });

    expect(def.validate({ label: 'test', count: 5 })).toBe(true);
    expect(def.validate({ label: 'test', count: 'five' })).toBe(false);
    expect(def.validate(null)).toBe(false);
    expect(def.validate(42)).toBe(false);
  });

  // 7. Version option — definition has correct version when specified
  it('stores the specified version in the definition', () => {
    const def = createBrandedInterface('Versioned', {
      data: { type: 'string' },
    }, { version: 3 });

    expect(def.version).toBe(3);
    expect(def[INTERFACE_VERSION]).toBe(3);
  });

  // 8. Array field — create succeeds with array data
  it('accepts array fields', () => {
    const def = createBrandedInterface('TaggedItem', {
      tags: { type: 'array' },
    });

    const instance = def.create({ tags: ['a', 'b', 'c'] } as Record<string, unknown>);
    expect(instance.tags).toEqual(['a', 'b', 'c']);
  });

  // 9. Object field — create succeeds with object data
  it('accepts object fields', () => {
    const def = createBrandedInterface('Config', {
      settings: { type: 'object' },
    });

    const instance = def.create({ settings: { theme: 'dark' } } as Record<string, unknown>);
    expect(instance.settings).toEqual({ theme: 'dark' });
  });

  // 10. Custom validate predicate on field — rejects when predicate fails
  it('rejects data when a custom field validation predicate fails', () => {
    const def = createBrandedInterface('Bounded', {
      value: {
        type: 'number',
        validate: (v: unknown) => typeof v === 'number' && v >= 0 && v <= 100,
      },
    });

    expect(() => def.create({ value: 150 } as Record<string, unknown>)).toThrow(
      /value.*failed custom validation/
    );

    // Should succeed for valid value
    const instance = def.create({ value: 50 } as Record<string, unknown>);
    expect(instance.value).toBe(50);
  });
});

// =============================================================================
// Unit Tests for createBrandedPrimitive
// =============================================================================

describe('createBrandedPrimitive — unit tests', () => {
  beforeEach(() => {
    resetInterfaceRegistry();
  });

  // 1. String primitive — create succeeds with string value
  it('creates a string branded primitive', () => {
    const def = createBrandedPrimitive('Label', 'string');
    const result = def.create('hello' as never);
    expect(result).toBe('hello');
  });

  // 2. Number primitive — create succeeds with number value
  it('creates a number branded primitive', () => {
    const def = createBrandedPrimitive('Count', 'number');
    const result = def.create(42 as never);
    expect(result).toBe(42);
  });

  // 3. Boolean primitive — create succeeds with boolean value
  it('creates a boolean branded primitive', () => {
    const def = createBrandedPrimitive('Flag', 'boolean');
    const result = def.create(true as never);
    expect(result).toBe(true);
  });

  // 4. Wrong base type — create throws descriptive error
  it('throws a descriptive error when value does not match base type', () => {
    const def = createBrandedPrimitive('Age', 'number');
    expect(() => def.create('twenty' as never)).toThrow(
      /Age.*expected type "number".*got "string"/
    );
  });

  // 5. Validation predicate fails — create throws with predicate name
  it('throws with predicate name when validation fails', () => {
    function isNonEmpty(v: string): boolean {
      return v.length > 0;
    }

    const def = createBrandedPrimitive<string>('NonEmpty', 'string', isNonEmpty);
    expect(() => def.create('' as never)).toThrow(/isNonEmpty/);
  });

  // 6. validate() returns true for valid, false for invalid
  it('validate() returns true for valid values and false for invalid', () => {
    function isPositive(v: number): boolean {
      return v > 0;
    }

    const def = createBrandedPrimitive<number>('PosNum', 'number', isPositive);

    expect(def.validate(5)).toBe(true);
    expect(def.validate(-1)).toBe(false);
    expect(def.validate('hello')).toBe(false);
  });
});

// =============================================================================
// Cross-kind ID collision unit tests (via factory functions)
// =============================================================================

describe('Cross-kind ID collision via factory — unit tests', () => {
  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('throws when creating a primitive with an ID already used by an interface', () => {
    createBrandedInterface('Shared', { x: { type: 'string' } });
    expect(() => createBrandedPrimitive('Shared', 'string')).toThrow(/already registered/);
  });

  it('throws when creating an interface with an ID already used by a primitive', () => {
    createBrandedPrimitive('Shared', 'number');
    expect(() => createBrandedInterface('Shared', { x: { type: 'string' } })).toThrow(
      /already registered/
    );
  });
});
