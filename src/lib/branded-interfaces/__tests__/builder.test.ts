import { createBuilder } from '../builder.js';
import { resetInterfaceRegistry, getInterfaceById } from '../registry.js';

let idCounter = 0;
function uniqueId(prefix = 'Builder'): string {
  return `${prefix}_${Date.now()}_${idCounter++}`;
}

beforeEach(() => {
  resetInterfaceRegistry();
});

describe('createBuilder', () => {
  it('should build a definition with a single field', () => {
    const id = uniqueId();
    const def = createBuilder(id)
      .field('name', { type: 'string' })
      .build();

    expect(def.id).toBe(id);
    expect(def.schema).toEqual({ name: { type: 'string' } });
  });

  it('should build a definition with multiple fields', () => {
    const id = uniqueId();
    const def = createBuilder(id)
      .field('name', { type: 'string' })
      .field('age', { type: 'number' })
      .field('active', { type: 'boolean' })
      .build();

    expect(Object.keys(def.schema)).toHaveLength(3);
    expect(def.schema['name'].type).toBe('string');
    expect(def.schema['age'].type).toBe('number');
    expect(def.schema['active'].type).toBe('boolean');
  });

  it('should mark optional fields with optional: true', () => {
    const id = uniqueId();
    const def = createBuilder(id)
      .field('name', { type: 'string' })
      .optional('nickname', { type: 'string' })
      .build();

    expect(def.schema['name'].optional).toBeUndefined();
    expect(def.schema['nickname'].optional).toBe(true);
  });

  it('should throw if build() is called with no fields', () => {
    const id = uniqueId();
    expect(() => createBuilder(id).build()).toThrow(/no fields defined/i);
  });

  it('should produce a definition that creates valid instances', () => {
    const id = uniqueId();
    const def = createBuilder(id)
      .field('x', { type: 'number' })
      .build();

    const instance = def.create({ x: 42 } as Record<string, unknown>);
    expect(instance.x).toBe(42);
  });

  it('should produce a definition registered in the registry', () => {
    const id = uniqueId();
    createBuilder(id)
      .field('v', { type: 'string' })
      .build();

    const entry = getInterfaceById(id);
    expect(entry).toBeDefined();
    expect(entry!.kind).toBe('interface');
  });

  it('should be immutable — each call returns a new builder', () => {
    const id = uniqueId();
    const b1 = createBuilder(id);
    const b2 = b1.field('a', { type: 'string' });
    const b3 = b2.field('b', { type: 'number' });

    // b1 still has no fields
    expect(() => b1.build()).toThrow(/no fields defined/i);

    // b2 has only 'a'
    const id2 = uniqueId();
    const def2 = createBuilder(id2).field('a', { type: 'string' }).build();
    expect(Object.keys(def2.schema)).toEqual(['a']);

    // b3 has both
    const def3 = b3.build();
    expect(Object.keys(def3.schema).sort()).toEqual(['a', 'b']);
  });

  it('should support nullable fields via descriptor', () => {
    const id = uniqueId();
    const def = createBuilder(id)
      .field('value', { type: 'string', nullable: true })
      .build();

    expect(def.schema['value'].nullable).toBe(true);
    const instance = def.create({ value: null } as unknown as Record<string, unknown>);
    expect(instance.value).toBeNull();
  });

  it('should support optional fields that accept undefined', () => {
    const id = uniqueId();
    const def = createBuilder(id)
      .field('required', { type: 'string' })
      .optional('extra', { type: 'number' })
      .build();

    const instance = def.create({ required: 'hello' } as Record<string, unknown>);
    expect(instance.required).toBe('hello');
  });
});

import * as fc from 'fast-check';
import { arbUniqueId, arbFieldDescriptor } from './arbitraries.js';

// =============================================================================
// Property 34: Builder accumulates fields and builds correctly
// **Validates: Requirements 15.2, 15.3, 15.4**
// =============================================================================

describe('Property 34: Builder accumulates fields and builds correctly', () => {
  it('should produce a definition whose schema matches the accumulated fields with correct optional flags', () => {
    // Generate a list of unique field entries (name + descriptor + isOptional)
    const arbFieldEntry = fc.record({
      name: fc
        .string({ minLength: 1, maxLength: 20 })
        .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s)),
      descriptor: arbFieldDescriptor,
      isOptional: fc.boolean(),
    });

    fc.assert(
      fc.property(
        arbUniqueId,
        fc.array(arbFieldEntry, { minLength: 1, maxLength: 8 }).map((entries) => {
          // Deduplicate by name, keeping the first occurrence
          const seen = new Set<string>();
          return entries.filter((e) => {
            if (seen.has(e.name)) return false;
            seen.add(e.name);
            return true;
          });
        }).filter((entries) => entries.length >= 1),
        (id, fieldEntries) => {
          resetInterfaceRegistry();

          let builder = createBuilder(id);

          for (const entry of fieldEntries) {
            if (entry.isOptional) {
              builder = builder.optional(entry.name, { type: entry.descriptor.type, nullable: entry.descriptor.nullable });
            } else {
              builder = builder.field(entry.name, entry.descriptor);
            }
          }

          const def = builder.build();

          // Verify the schema has exactly the right fields
          const schemaKeys = Object.keys(def.schema).sort();
          const expectedKeys = fieldEntries.map((e) => e.name).sort();
          expect(schemaKeys).toEqual(expectedKeys);

          // Verify optional flags
          for (const entry of fieldEntries) {
            if (entry.isOptional) {
              expect(def.schema[entry.name].optional).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
