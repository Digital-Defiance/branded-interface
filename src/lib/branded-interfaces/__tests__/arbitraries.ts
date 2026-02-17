/**
 * Shared fast-check arbitrary generators for branded-interfaces property tests.
 */

import * as fc from 'fast-check';
import type { FieldDescriptor, InterfaceSchema, PrimitiveBaseType } from '../types.js';

// Counter for generating unique IDs across test runs
let idCounter = 0;

/**
 * Generates unique string IDs for definitions to avoid registry collisions.
 */
export const arbUniqueId: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s))
  .map((s) => `${s}_${++idCounter}_${Date.now()}`);

/**
 * Generates a valid field name (JS identifier style).
 */
const arbFieldName: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s));

/**
 * Generates a random FieldDescriptor with valid type/optional/nullable combinations.
 * Focuses on simple types: string, number, boolean, object, array.
 */
export const arbFieldDescriptor: fc.Arbitrary<FieldDescriptor> = fc.record({
  type: fc.constantFrom('string', 'number', 'boolean', 'object', 'array') as fc.Arbitrary<FieldDescriptor['type']>,
  optional: fc.boolean(),
  nullable: fc.boolean(),
});

/**
 * Generates a random InterfaceSchema with 1-10 fields.
 */
export const arbInterfaceSchema: fc.Arbitrary<InterfaceSchema> = fc
  .dictionary(arbFieldName, arbFieldDescriptor, { minKeys: 1, maxKeys: 10 })
  .filter((obj) => Object.keys(obj).length >= 1);

/**
 * Given a schema, generates a plain object that matches it.
 * For 'object' type, generates {}. For 'array' type, generates [].
 */
export function arbMatchingData(schema: InterfaceSchema): fc.Arbitrary<Record<string, unknown>> {
  const fieldArbs: Record<string, fc.Arbitrary<unknown>> = {};

  for (const [fieldName, descriptor] of Object.entries(schema)) {
    fieldArbs[fieldName] = arbMatchingValue(descriptor);
  }

  return fc.record(fieldArbs) as fc.Arbitrary<Record<string, unknown>>;
}

/**
 * Generates a value matching a single field descriptor.
 */
function arbMatchingValue(descriptor: FieldDescriptor): fc.Arbitrary<unknown> {
  switch (descriptor.type) {
    case 'string':
      return fc.string();
    case 'number':
      // Exclude -0 because JSON.stringify(-0) === "0", breaking round-trip equality
      return fc.double({ noNaN: true, noDefaultInfinity: true }).map((n) => (Object.is(n, -0) ? 0 : n));
    case 'boolean':
      return fc.boolean();
    case 'object':
      return fc.constant({});
    case 'array':
      return fc.constant([]);
    default:
      return fc.string();
  }
}

/**
 * Given a schema, generates a plain object that does NOT match it.
 * Picks one required field and gives it the wrong type.
 * If all fields are optional, forces a wrong-type value on the first field.
 */
export function arbNonMatchingData(schema: InterfaceSchema): fc.Arbitrary<Record<string, unknown>> {
  const fieldNames = Object.keys(schema);

  return arbMatchingData(schema).chain((validData) => {
    // Pick a random field index to corrupt
    return fc.integer({ min: 0, max: fieldNames.length - 1 }).map((idx) => {
      const fieldName = fieldNames[idx];
      const descriptor = schema[fieldName];
      const result = { ...validData };
      result[fieldName] = generateWrongTypeValue(descriptor.type);
      return result;
    });
  });
}

/**
 * Generates a value of the WRONG type for a given field type.
 */
function generateWrongTypeValue(expectedType: string): unknown {
  switch (expectedType) {
    case 'string':
      return 42;
    case 'number':
      return 'not-a-number';
    case 'boolean':
      return 'not-a-boolean';
    case 'object':
      return 'not-an-object';
    case 'array':
      return 'not-an-array';
    default:
      return 42;
  }
}

/**
 * Generates 'string' | 'number' | 'boolean'.
 */
export const arbPrimitiveBaseType: fc.Arbitrary<PrimitiveBaseType> = fc.constantFrom(
  'string' as PrimitiveBaseType,
  'number' as PrimitiveBaseType,
  'boolean' as PrimitiveBaseType,
);

/**
 * Generates a value of the correct base type.
 */
export function arbMatchingPrimitive(baseType: PrimitiveBaseType): fc.Arbitrary<string | number | boolean> {
  switch (baseType) {
    case 'string':
      return fc.string();
    case 'number':
      return fc.double({ noNaN: true, noDefaultInfinity: true });
    case 'boolean':
      return fc.boolean();
  }
}

/**
 * Generates a value of the WRONG base type.
 */
export function arbNonMatchingPrimitive(baseType: PrimitiveBaseType): fc.Arbitrary<string | number | boolean> {
  switch (baseType) {
    case 'string':
      return fc.oneof(
        fc.double({ noNaN: true, noDefaultInfinity: true }),
        fc.boolean(),
      );
    case 'number':
      return fc.oneof(fc.string(), fc.boolean());
    case 'boolean':
      return fc.oneof(fc.string(), fc.double({ noNaN: true, noDefaultInfinity: true }));
  }
}
