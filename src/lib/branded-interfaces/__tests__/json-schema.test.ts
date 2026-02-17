/**
 * Unit tests for JSON Schema generation from branded interface definitions.
 *
 * Feature: branded-interfaces
 * Tests: interfaceToJsonSchema()
 */

import { interfaceToJsonSchema } from '../json-schema.js';
import { createBrandedInterface } from '../factory.js';
import { resetInterfaceRegistry } from '../registry.js';
import { createBrandedEnum } from '../../factory.js';
import { resetRegistry } from '../../registry.js';
import { createBrandedPrimitive } from '../factory.js';
import type { InterfaceSchema } from '../types.js';

// =============================================================================
// Unit Tests for interfaceToJsonSchema
// =============================================================================

describe('interfaceToJsonSchema — unit tests', () => {
  beforeEach(() => {
    resetInterfaceRegistry();
    resetRegistry();
  });

  // ---------------------------------------------------------------------------
  // Requirement 10.1: Returns a valid JSON Schema object
  // ---------------------------------------------------------------------------

  it('returns a valid JSON Schema object with correct structure', () => {
    const def = createBrandedInterface('SimpleUser', {
      name: { type: 'string' },
      age: { type: 'number' },
    });

    const schema = interfaceToJsonSchema(def);

    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema.type).toBe('object');
    expect(schema.title).toBe('SimpleUser');
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties).toBeDefined();
    expect(schema.required).toBeDefined();
  });

  it('uses draft-07 schema URL when specified', () => {
    const def = createBrandedInterface('Draft07User', {
      name: { type: 'string' },
    });

    const schema = interfaceToJsonSchema(def, { draft: '07' });

    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
  });

  it('defaults to draft 2020-12 when no draft option is provided', () => {
    const def = createBrandedInterface('DefaultDraft', {
      x: { type: 'string' },
    });

    const schema = interfaceToJsonSchema(def);

    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
  });

  // ---------------------------------------------------------------------------
  // Requirement 10.2: Maps field types to JSON Schema types
  // ---------------------------------------------------------------------------

  it('maps string fields to { type: "string" }', () => {
    const def = createBrandedInterface('StringField', {
      name: { type: 'string' },
    });

    const schema = interfaceToJsonSchema(def);

    expect(schema.properties['name']).toEqual({ type: 'string' });
  });

  it('maps number fields to { type: "number" }', () => {
    const def = createBrandedInterface('NumberField', {
      count: { type: 'number' },
    });

    const schema = interfaceToJsonSchema(def);

    expect(schema.properties['count']).toEqual({ type: 'number' });
  });

  it('maps boolean fields to { type: "boolean" }', () => {
    const def = createBrandedInterface('BoolField', {
      active: { type: 'boolean' },
    });

    const schema = interfaceToJsonSchema(def);

    expect(schema.properties['active']).toEqual({ type: 'boolean' });
  });

  it('maps object fields to { type: "object" }', () => {
    const def = createBrandedInterface('ObjField', {
      meta: { type: 'object' },
    });

    const schema = interfaceToJsonSchema(def);

    expect(schema.properties['meta']).toEqual({ type: 'object' });
  });

  it('maps array fields to { type: "array" }', () => {
    const def = createBrandedInterface('ArrField', {
      tags: { type: 'array' },
    });

    const schema = interfaceToJsonSchema(def);

    expect(schema.properties['tags']).toEqual({ type: 'array' });
  });

  it('maps all field types in a single schema', () => {
    const def = createBrandedInterface('AllTypes', {
      s: { type: 'string' },
      n: { type: 'number' },
      b: { type: 'boolean' },
      o: { type: 'object' },
      a: { type: 'array' },
    });

    const schema = interfaceToJsonSchema(def);

    expect(schema.properties['s']).toEqual({ type: 'string' });
    expect(schema.properties['n']).toEqual({ type: 'number' });
    expect(schema.properties['b']).toEqual({ type: 'boolean' });
    expect(schema.properties['o']).toEqual({ type: 'object' });
    expect(schema.properties['a']).toEqual({ type: 'array' });
  });

  // ---------------------------------------------------------------------------
  // Requirement 10.3: branded-interface refs emit enum constraint
  // ---------------------------------------------------------------------------

  it('emits enum constraint for branded-enum ref fields', () => {
    const _colorEnum = createBrandedEnum('Color', {
      Red: 'red',
      Green: 'green',
      Blue: 'blue',
    } as const);

    const def = createBrandedInterface('WithEnum', {
      color: { type: 'branded-enum', ref: 'Color' },
    });

    const schema = interfaceToJsonSchema(def);

    const colorProp = schema.properties['color'] as { enum: string[] };
    expect(colorProp.enum).toBeDefined();
    expect(colorProp.enum.sort()).toEqual(['blue', 'green', 'red']);
  });

  it('emits enum constraint with null for nullable branded-enum ref', () => {
    const _statusEnum = createBrandedEnum('Status', {
      Active: 'active',
      Inactive: 'inactive',
    } as const);

    const def = createBrandedInterface('WithNullableEnum', {
      status: { type: 'branded-enum', ref: 'Status', nullable: true },
    });

    const schema = interfaceToJsonSchema(def);

    const statusProp = schema.properties['status'] as { enum: (string | null)[] };
    expect(statusProp.enum).toBeDefined();
    expect(statusProp.enum).toContain('active');
    expect(statusProp.enum).toContain('inactive');
    expect(statusProp.enum).toContain(null);
  });

  it('falls back to string type when enum ref is not found', () => {
    const def = createBrandedInterface('MissingEnum', {
      value: { type: 'branded-enum', ref: 'NonExistentEnum' },
    });

    const schema = interfaceToJsonSchema(def);

    expect(schema.properties['value']).toEqual({ type: 'string' });
  });

  // ---------------------------------------------------------------------------
  // Requirement 10.4: Format annotations for branded-primitive refinements
  // ---------------------------------------------------------------------------

  it('emits format "email" for Email refinement ref', () => {
    createBrandedPrimitive<string>('Email', 'string', (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));

    const def = createBrandedInterface('WithEmail', {
      email: { type: 'branded-primitive', ref: 'Email' },
    });

    const schema = interfaceToJsonSchema(def);

    expect(schema.properties['email']).toEqual({ type: 'string', format: 'email' });
  });

  it('emits format "uuid" for Uuid refinement ref', () => {
    createBrandedPrimitive<string>('Uuid', 'string', (v) => /^[0-9a-f]{8}-/.test(v));

    const def = createBrandedInterface('WithUuid', {
      id: { type: 'branded-primitive', ref: 'Uuid' },
    });

    const schema = interfaceToJsonSchema(def);

    expect(schema.properties['id']).toEqual({ type: 'string', format: 'uuid' });
  });

  it('emits format "uri" for Url refinement ref', () => {
    createBrandedPrimitive<string>('Url', 'string', (v) => { try { new URL(v); return true; } catch { return false; } });

    const def = createBrandedInterface('WithUrl', {
      website: { type: 'branded-primitive', ref: 'Url' },
    });

    const schema = interfaceToJsonSchema(def);

    expect(schema.properties['website']).toEqual({ type: 'string', format: 'uri' });
  });

  it('emits no format for unknown branded-primitive ref', () => {
    createBrandedPrimitive<string>('CustomPrimitive', 'string', (v) => v.length > 0);

    const def = createBrandedInterface('WithCustomPrim', {
      value: { type: 'branded-primitive', ref: 'CustomPrimitive' },
    });

    const schema = interfaceToJsonSchema(def);

    expect(schema.properties['value']).toEqual({ type: 'string' });
  });

  // ---------------------------------------------------------------------------
  // Requirement 10.5: Optional and nullable handling
  // ---------------------------------------------------------------------------

  it('includes non-optional fields in required array', () => {
    const def = createBrandedInterface('RequiredFields', {
      name: { type: 'string' },
      age: { type: 'number' },
    });

    const schema = interfaceToJsonSchema(def);

    expect(schema.required.sort()).toEqual(['age', 'name']);
  });

  it('excludes optional fields from required array', () => {
    const def = createBrandedInterface('OptionalFields', {
      name: { type: 'string' },
      nickname: { type: 'string', optional: true },
    });

    const schema = interfaceToJsonSchema(def);

    expect(schema.required).toEqual(['name']);
    expect(schema.required).not.toContain('nickname');
  });

  it('represents nullable fields as type union [type, "null"]', () => {
    const def = createBrandedInterface('NullableFields', {
      name: { type: 'string', nullable: true },
      count: { type: 'number', nullable: true },
    });

    const schema = interfaceToJsonSchema(def);

    expect(schema.properties['name']).toEqual({ type: ['string', 'null'] });
    expect(schema.properties['count']).toEqual({ type: ['number', 'null'] });
  });

  it('handles fields that are both optional and nullable', () => {
    const def = createBrandedInterface('OptNullable', {
      bio: { type: 'string', optional: true, nullable: true },
      score: { type: 'number' },
    });

    const schema = interfaceToJsonSchema(def);

    expect(schema.required).toEqual(['score']);
    expect(schema.properties['bio']).toEqual({ type: ['string', 'null'] });
  });

  it('handles nullable branded-interface ref as type union', () => {
    const def = createBrandedInterface('NullableRef', {
      nested: { type: 'branded-interface', ref: 'SomeInterface', nullable: true },
    });

    const schema = interfaceToJsonSchema(def);

    expect(schema.properties['nested']).toEqual({ type: ['object', 'null'] });
  });

  it('handles nullable branded-primitive ref as type union', () => {
    createBrandedPrimitive<string>('NullableEmail', 'string', (v) => v.includes('@'));

    const def = createBrandedInterface('NullablePrimRef', {
      email: { type: 'branded-primitive', ref: 'Email', nullable: true },
    });

    const schema = interfaceToJsonSchema(def);

    expect(schema.properties['email']).toEqual({ type: ['string', 'null'], format: 'email' });
  });

  it('handles empty schema', () => {
    const def = createBrandedInterface('EmptySchema', {} as InterfaceSchema);

    const schema = interfaceToJsonSchema(def);

    expect(schema.properties).toEqual({});
    expect(schema.required).toEqual([]);
  });
});


// =============================================================================
// Property 27: JSON Schema correctness
// =============================================================================

import * as fc from 'fast-check';
import {
  arbUniqueId,
  arbInterfaceSchema,
} from './arbitraries.js';

describe('Feature: branded-interfaces, Property 27: JSON Schema correctness', () => {
  /**
   * **Validates: Requirements 10.1, 10.2, 10.5**
   *
   * *For any* branded interface definition, `interfaceToJsonSchema()` should
   * produce an object with `type: "object"`, `properties` matching the field
   * schema types, `required` array containing only non-optional field names,
   * and nullable fields represented as type unions.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
    resetRegistry();
  });

  const expectedJsonType: Record<string, string> = {
    string: 'string',
    number: 'number',
    boolean: 'boolean',
    object: 'object',
    array: 'array',
  };

  it('produces a valid JSON Schema with correct structure, types, required, and nullable handling', () => {
    fc.assert(
      fc.property(arbUniqueId, arbInterfaceSchema, (id, schema) => {
        const def = createBrandedInterface(id, schema);
        const jsonSchema = interfaceToJsonSchema(def);

        // Must have type: "object"
        expect(jsonSchema.type).toBe('object');
        expect(jsonSchema.$schema).toBeTruthy();
        expect(jsonSchema.title).toBe(id);

        // Properties should match field schema types
        for (const [fieldName, descriptor] of Object.entries(schema)) {
          const prop = jsonSchema.properties[fieldName] as Record<string, unknown>;
          expect(prop).toBeDefined();

          const expected = expectedJsonType[descriptor.type] ?? 'string';

          if (descriptor.nullable) {
            // Nullable fields should be type union [type, "null"]
            expect(prop['type']).toEqual([expected, 'null']);
          } else {
            expect(prop['type']).toBe(expected);
          }
        }

        // Required array should contain only non-optional field names
        const expectedRequired = Object.entries(schema)
          .filter(([, d]) => !d.optional)
          .map(([name]) => name)
          .sort();
        expect([...jsonSchema.required].sort()).toEqual(expectedRequired);

        // Optional fields should NOT be in required
        for (const [fieldName, descriptor] of Object.entries(schema)) {
          if (descriptor.optional) {
            expect(jsonSchema.required).not.toContain(fieldName);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});

// =============================================================================
// Property 28: JSON Schema enum references
// =============================================================================

describe('Feature: branded-interfaces, Property 28: JSON Schema enum references', () => {
  /**
   * **Validates: Requirements 10.3**
   *
   * *For any* branded interface definition with a field referencing a branded
   * enum, the generated JSON Schema property should contain an `enum` array
   * with exactly the values from the referenced enum.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
    resetRegistry();
  });

  it('emits enum constraint with exactly the values from the referenced branded enum', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbUniqueId,
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z]/.test(s)), {
          minLength: 1,
          maxLength: 5,
        }),
        (interfaceId, enumId, enumValues) => {
          // Create a branded enum with the generated values
          const enumObj: Record<string, string> = {};
          for (const v of enumValues) {
            enumObj[v] = v;
          }
          createBrandedEnum(enumId, enumObj as Record<string, string>);

          // Create an interface with a branded-enum ref field
          const def = createBrandedInterface(interfaceId, {
            status: { type: 'branded-enum', ref: enumId },
          });

          const jsonSchema = interfaceToJsonSchema(def);
          const statusProp = jsonSchema.properties['status'] as { enum: string[] };

          expect(statusProp.enum).toBeDefined();
          expect([...statusProp.enum].sort()).toEqual([...enumValues].sort());
        },
      ),
      { numRuns: 100 },
    );
  });
});
