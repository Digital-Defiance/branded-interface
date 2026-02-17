/**
 * Property-based tests for branded-interfaces Zod schema generation.
 *
 * Feature: branded-interfaces
 * Property 29: Zod schema correctness
 */

import * as fc from 'fast-check';
import { createBrandedInterface } from '../factory.js';
import { resetInterfaceRegistry } from '../registry.js';
import { interfaceToZodSchema } from '../zod-schema.js';
import { createBrandedEnum } from '../../factory.js';
import { resetRegistry } from '../../registry.js';
import {
  arbUniqueId,
  arbInterfaceSchema,
} from './arbitraries.js';

// =============================================================================
// Property 29: Zod schema correctness
// =============================================================================

describe('Feature: branded-interfaces, Property 29: Zod schema correctness', () => {
  /**
   * **Validates: Requirements 11.1, 11.2, 11.3, 11.4**
   *
   * *For any* branded interface definition, `interfaceToZodSchema()` should
   * produce a definition with correct Zod type mappings, optional/nullable
   * flags matching the field schema, and enum references for branded enum fields.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
    resetRegistry();
  });

  const expectedZodBase: Record<string, string> = {
    string: 'z.string()',
    number: 'z.number()',
    boolean: 'z.boolean()',
    object: 'z.object({})',
    array: 'z.array(z.unknown())',
  };

  it('produces correct Zod type mappings with matching optional/nullable flags', () => {
    fc.assert(
      fc.property(arbUniqueId, arbInterfaceSchema, (id, schema) => {
        const def = createBrandedInterface(id, schema);
        const zodSchema = interfaceToZodSchema(def);

        expect(zodSchema.interfaceId).toBe(id);

        for (const [fieldName, descriptor] of Object.entries(schema)) {
          const field = zodSchema.fields[fieldName];
          expect(field).toBeDefined();

          // Optional flag should match
          expect(field.optional).toBe(descriptor.optional === true);

          // Nullable flag should match
          expect(field.nullable).toBe(descriptor.nullable === true);

          // Zod type should be correct
          const base = expectedZodBase[descriptor.type] ?? 'z.unknown()';
          if (descriptor.nullable) {
            expect(field.zodType).toBe(`${base}.nullable()`);
          } else {
            expect(field.zodType).toBe(base);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('emits z.enum() for branded-interface ref fields with correct values', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbUniqueId,
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z]/.test(s)), {
          minLength: 1,
          maxLength: 5,
        }),
        fc.boolean(),
        (interfaceId, enumId, enumValues, nullable) => {
          // Create a branded enum
          const enumObj: Record<string, string> = {};
          for (const v of enumValues) {
            enumObj[v] = v;
          }
          createBrandedEnum(enumId, enumObj as Record<string, string>);

          // Create an interface with a branded-enum ref field
          const def = createBrandedInterface(interfaceId, {
            status: { type: 'branded-enum', ref: enumId, nullable },
          });

          const zodSchema = interfaceToZodSchema(def);
          const field = zodSchema.fields['status'];

          expect(field).toBeDefined();

          // The zodType should contain z.enum with the values
          const valuesStr = enumValues.map((v) => `'${v}'`).join(', ');
          const expectedBase = `z.enum([${valuesStr}])`;
          if (nullable) {
            expect(field.zodType).toBe(`${expectedBase}.nullable()`);
          } else {
            expect(field.zodType).toBe(expectedBase);
          }
          expect(field.nullable).toBe(nullable);
        },
      ),
      { numRuns: 100 },
    );
  });
});


// =============================================================================
// Unit Tests for interfaceToZodSchema
// =============================================================================

describe('interfaceToZodSchema — unit tests', () => {
  beforeEach(() => {
    resetInterfaceRegistry();
    resetRegistry();
  });

  // ---------------------------------------------------------------------------
  // Requirement 11.1: Returns a Zod schema definition object
  // ---------------------------------------------------------------------------

  it('returns a Zod schema definition with interfaceId and fields', () => {
    const def = createBrandedInterface('ZodUser', {
      name: { type: 'string' },
      age: { type: 'number' },
    });

    const zodSchema = interfaceToZodSchema(def);

    expect(zodSchema.interfaceId).toBe('ZodUser');
    expect(zodSchema.fields).toBeDefined();
    expect(Object.keys(zodSchema.fields).sort()).toEqual(['age', 'name']);
  });

  // ---------------------------------------------------------------------------
  // Requirement 11.2: Maps field types to Zod types
  // ---------------------------------------------------------------------------

  it('maps string fields to z.string()', () => {
    const def = createBrandedInterface('ZodStr', {
      s: { type: 'string' },
    });

    const zodSchema = interfaceToZodSchema(def);

    expect(zodSchema.fields['s'].zodType).toBe('z.string()');
  });

  it('maps number fields to z.number()', () => {
    const def = createBrandedInterface('ZodNum', {
      n: { type: 'number' },
    });

    const zodSchema = interfaceToZodSchema(def);

    expect(zodSchema.fields['n'].zodType).toBe('z.number()');
  });

  it('maps boolean fields to z.boolean()', () => {
    const def = createBrandedInterface('ZodBool', {
      b: { type: 'boolean' },
    });

    const zodSchema = interfaceToZodSchema(def);

    expect(zodSchema.fields['b'].zodType).toBe('z.boolean()');
  });

  it('maps object fields to z.object({})', () => {
    const def = createBrandedInterface('ZodObj', {
      o: { type: 'object' },
    });

    const zodSchema = interfaceToZodSchema(def);

    expect(zodSchema.fields['o'].zodType).toBe('z.object({})');
  });

  it('maps array fields to z.array(z.unknown())', () => {
    const def = createBrandedInterface('ZodArr', {
      a: { type: 'array' },
    });

    const zodSchema = interfaceToZodSchema(def);

    expect(zodSchema.fields['a'].zodType).toBe('z.array(z.unknown())');
  });

  it('maps branded-primitive fields to z.string()', () => {
    const def = createBrandedInterface('ZodPrim', {
      p: { type: 'branded-primitive', ref: 'SomePrimitive' },
    });

    const zodSchema = interfaceToZodSchema(def);

    expect(zodSchema.fields['p'].zodType).toBe('z.string()');
  });

  it('maps branded-interface fields to z.object({})', () => {
    const def = createBrandedInterface('ZodIface', {
      nested: { type: 'branded-interface', ref: 'SomeInterface' },
    });

    const zodSchema = interfaceToZodSchema(def);

    expect(zodSchema.fields['nested'].zodType).toBe('z.object({})');
  });

  // ---------------------------------------------------------------------------
  // Requirement 11.3: branded-interface refs emit z.enum()
  // ---------------------------------------------------------------------------

  it('emits z.enum() for branded-enum ref fields', () => {
    createBrandedEnum('ZodColor', {
      Red: 'red',
      Green: 'green',
      Blue: 'blue',
    } as const);

    const def = createBrandedInterface('ZodWithEnum', {
      color: { type: 'branded-enum', ref: 'ZodColor' },
    });

    const zodSchema = interfaceToZodSchema(def);

    expect(zodSchema.fields['color'].zodType).toBe("z.enum(['red', 'green', 'blue'])");
  });

  it('falls back to z.string() when enum ref is not found', () => {
    const def = createBrandedInterface('ZodMissingEnum', {
      value: { type: 'branded-enum', ref: 'NonExistent' },
    });

    const zodSchema = interfaceToZodSchema(def);

    expect(zodSchema.fields['value'].zodType).toBe('z.string()');
  });

  // ---------------------------------------------------------------------------
  // Requirement 11.4: Optional and nullable handling
  // ---------------------------------------------------------------------------

  it('marks optional fields with optional: true', () => {
    const def = createBrandedInterface('ZodOptional', {
      name: { type: 'string' },
      bio: { type: 'string', optional: true },
    });

    const zodSchema = interfaceToZodSchema(def);

    expect(zodSchema.fields['name'].optional).toBe(false);
    expect(zodSchema.fields['bio'].optional).toBe(true);
  });

  it('appends .nullable() for nullable fields', () => {
    const def = createBrandedInterface('ZodNullable', {
      name: { type: 'string', nullable: true },
      count: { type: 'number', nullable: true },
    });

    const zodSchema = interfaceToZodSchema(def);

    expect(zodSchema.fields['name'].zodType).toBe('z.string().nullable()');
    expect(zodSchema.fields['name'].nullable).toBe(true);
    expect(zodSchema.fields['count'].zodType).toBe('z.number().nullable()');
  });

  it('handles fields that are both optional and nullable', () => {
    const def = createBrandedInterface('ZodOptNull', {
      bio: { type: 'string', optional: true, nullable: true },
    });

    const zodSchema = interfaceToZodSchema(def);

    expect(zodSchema.fields['bio'].zodType).toBe('z.string().nullable()');
    expect(zodSchema.fields['bio'].optional).toBe(true);
    expect(zodSchema.fields['bio'].nullable).toBe(true);
  });

  it('appends .nullable() for nullable branded-enum ref', () => {
    createBrandedEnum('ZodStatus', {
      Active: 'active',
      Inactive: 'inactive',
    } as const);

    const def = createBrandedInterface('ZodNullEnum', {
      status: { type: 'branded-enum', ref: 'ZodStatus', nullable: true },
    });

    const zodSchema = interfaceToZodSchema(def);

    expect(zodSchema.fields['status'].zodType).toBe("z.enum(['active', 'inactive']).nullable()");
    expect(zodSchema.fields['status'].nullable).toBe(true);
  });

  it('handles empty schema', () => {
    const def = createBrandedInterface('ZodEmpty', {} as Record<string, never>);

    const zodSchema = interfaceToZodSchema(def);

    expect(zodSchema.interfaceId).toBe('ZodEmpty');
    expect(Object.keys(zodSchema.fields)).toHaveLength(0);
  });
});
