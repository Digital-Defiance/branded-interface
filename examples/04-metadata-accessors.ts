/**
 * Example 04: Metadata Accessors
 *
 * This example demonstrates accessing enum metadata:
 * - getEnumId: Get the unique identifier
 * - getEnumValues: Get all values as an array
 * - enumSize: Get the count of values
 *
 * Run: npx ts-node examples/04-metadata-accessors.ts
 */

import { createBrandedEnum, getEnumId, getEnumValues, enumSize } from '../src/index.js';

// Create test enums
const Colors = createBrandedEnum('ex04-colors', {
  Red: 'red',
  Green: 'green',
  Blue: 'blue',
  Yellow: 'yellow',
  Purple: 'purple',
} as const);

const EmptyLike = createBrandedEnum('ex04-single', {
  Only: 'only',
} as const);

// =============================================================================
// getEnumId: Get Enum Identifier
// =============================================================================

console.log('=== getEnumId ===');

console.log('Colors enum ID:', getEnumId(Colors)); // 'ex04-colors'
console.log('Single enum ID:', getEnumId(EmptyLike)); // 'ex04-single'

// Returns undefined for non-branded objects
console.log('Plain object ID:', getEnumId({ Red: 'red' })); // undefined
console.log('null ID:', getEnumId(null)); // undefined
console.log('string ID:', getEnumId('test')); // undefined

// =============================================================================
// getEnumValues: Get All Values
// =============================================================================

console.log('\n=== getEnumValues ===');

const colorValues = getEnumValues(Colors);
console.log('Color values:', colorValues);
// ['red', 'green', 'blue', 'yellow', 'purple']

const singleValues = getEnumValues(EmptyLike);
console.log('Single values:', singleValues);
// ['only']

// Returns undefined for non-branded objects
console.log('Plain object values:', getEnumValues({ Red: 'red' } as never));
// undefined

// =============================================================================
// enumSize: Get Value Count
// =============================================================================

console.log('\n=== enumSize ===');

console.log('Colors size:', enumSize(Colors)); // 5
console.log('Single size:', enumSize(EmptyLike)); // 1

// Returns undefined for non-branded objects
console.log('Plain object size:', enumSize({ Red: 'red' })); // undefined

// =============================================================================
// Use Case: Validation
// =============================================================================

console.log('\n=== Use Case: Validation ===');

function validateEnum(obj: unknown, expectedId: string): boolean {
  const id = getEnumId(obj);
  if (id !== expectedId) {
    console.log(`Expected enum "${expectedId}", got "${id ?? 'not a branded enum'}"`);
    return false;
  }
  console.log(`✓ Valid enum: ${id}`);
  return true;
}

validateEnum(Colors, 'ex04-colors'); // Valid
validateEnum(Colors, 'wrong-id'); // Invalid
validateEnum({ Red: 'red' }, 'ex04-colors'); // Not a branded enum

// =============================================================================
// Use Case: Dynamic Iteration
// =============================================================================

console.log('\n=== Use Case: Dynamic Iteration ===');

function printEnumInfo(enumObj: unknown): void {
  const id = getEnumId(enumObj);
  const values = getEnumValues(enumObj as never);
  const size = enumSize(enumObj);

  if (!id || !values || size === undefined) {
    console.log('Not a valid branded enum');
    return;
  }

  console.log(`Enum: ${id}`);
  console.log(`  Size: ${size}`);
  console.log(`  Values: ${values.join(', ')}`);
}

printEnumInfo(Colors);
printEnumInfo(EmptyLike);
printEnumInfo({ fake: 'enum' });

// =============================================================================
// Use Case: Building Select Options
// =============================================================================

console.log('\n=== Use Case: Building Select Options ===');

interface SelectOption {
  value: string;
  label: string;
}

function enumToSelectOptions(enumObj: unknown): SelectOption[] {
  const values = getEnumValues(enumObj);
  if (!values) return [];

  return values.map((value: string) => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
  }));
}

const colorOptions = enumToSelectOptions(Colors);
console.log('Select options:', colorOptions);
// [{ value: 'red', label: 'Red' }, { value: 'green', label: 'Green' }, ...]

// =============================================================================
// Comparison: Object.keys vs getEnumValues
// =============================================================================

console.log('\n=== Object.keys vs getEnumValues ===');

// Object.keys returns the KEYS (property names)
console.log('Object.keys(Colors):', Object.keys(Colors));
// ['Red', 'Green', 'Blue', 'Yellow', 'Purple']

// getEnumValues returns the VALUES
console.log('getEnumValues(Colors):', getEnumValues(Colors));
// ['red', 'green', 'blue', 'yellow', 'purple']

// Object.values also returns values, but getEnumValues is type-safe
console.log('Object.values(Colors):', Object.values(Colors));
// Same result, but Object.values returns string[]
// getEnumValues returns the specific union type

console.log('\n✅ Example completed successfully!');
