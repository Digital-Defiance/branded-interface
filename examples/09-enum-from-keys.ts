/**
 * Example 09: Enum From Keys
 *
 * This example demonstrates creating enums from key arrays:
 * - enumFromKeys: Create enum where keys equal values
 * - Common pattern: { Active: 'Active', Inactive: 'Inactive' }
 *
 * Run: npx ts-node examples/09-enum-from-keys.ts
 */

import { createBrandedEnum, enumFromKeys, getEnumId, getEnumValues, isFromEnum } from '../src/index.js';

// =============================================================================
// Basic Usage
// =============================================================================

console.log('=== Basic Usage ===');

// Create an enum where each key equals its value
const Directions = enumFromKeys('ex09-directions', ['North', 'South', 'East', 'West'] as const);

console.log('Directions ID:', getEnumId(Directions));
console.log('Directions values:', getEnumValues(Directions));
// ['North', 'South', 'East', 'West']

// Each key maps to itself
console.log('Directions.North:', Directions.North); // 'North'
console.log('Directions.South:', Directions.South); // 'South'

// =============================================================================
// BEFORE/AFTER Comparison
// =============================================================================

console.log('\n=== Before/After Comparison ===');

// BEFORE: Manual definition (verbose)
const ManualStatus = createBrandedEnum('ex09-manual-status', {
  Active: 'Active',
  Inactive: 'Inactive',
  Pending: 'Pending',
  Suspended: 'Suspended',
} as const);

// AFTER: Using enumFromKeys (concise)
const AutoStatus = enumFromKeys('ex09-auto-status', [
  'Active',
  'Inactive',
  'Pending',
  'Suspended',
] as const);

console.log('Manual values:', getEnumValues(ManualStatus));
console.log('Auto values:', getEnumValues(AutoStatus));
// Both produce the same result!

// =============================================================================
// Type Inference
// =============================================================================

console.log('\n=== Type Inference ===');

// With `as const`, TypeScript infers literal types
const Colors = enumFromKeys('ex09-colors', ['Red', 'Green', 'Blue', 'Yellow'] as const);

type ColorValue = (typeof Colors)[keyof typeof Colors];
// ColorValue = 'Red' | 'Green' | 'Blue' | 'Yellow'

function paintWith(color: ColorValue): void {
  console.log(`Painting with ${color}`);
}

paintWith(Colors.Red); // OK
paintWith('Green'); // OK - literal type matches
// paintWith('Purple'); // TypeScript error!

// =============================================================================
// Use Case: String Literal Unions
// =============================================================================

console.log('\n=== Use Case: String Literal Unions ===');

// Perfect for creating enums from existing string literal types
const HttpMethods = enumFromKeys('ex09-http-methods', [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
] as const);

console.log('HTTP methods:', getEnumValues(HttpMethods));

function makeRequest(method: (typeof HttpMethods)[keyof typeof HttpMethods], url: string): void {
  console.log(`${method} ${url}`);
}

makeRequest(HttpMethods.GET, '/api/users');
makeRequest(HttpMethods.POST, '/api/users');

// =============================================================================
// Use Case: Event Names
// =============================================================================

console.log('\n=== Use Case: Event Names ===');

const DomEvents = enumFromKeys('ex09-dom-events', [
  'click',
  'mouseenter',
  'mouseleave',
  'focus',
  'blur',
  'submit',
  'change',
] as const);

console.log('DOM events:', getEnumValues(DomEvents));

function addEventListener(
  element: string,
  event: (typeof DomEvents)[keyof typeof DomEvents],
  handler: () => void
): void {
  console.log(`Adding ${event} listener to ${element}`);
  handler();
}

addEventListener('button', DomEvents.click, () => console.log('  Clicked!'));

// =============================================================================
// Use Case: Configuration Options
// =============================================================================

console.log('\n=== Use Case: Configuration Options ===');

const LogLevels = enumFromKeys('ex09-log-levels', [
  'DEBUG',
  'INFO',
  'WARN',
  'ERROR',
  'FATAL',
] as const);

interface LogConfig {
  level: (typeof LogLevels)[keyof typeof LogLevels];
  prefix: string;
}

const config: LogConfig = {
  level: LogLevels.INFO,
  prefix: '[APP]',
};

console.log('Log config:', config);

// =============================================================================
// Validation with Type Guards
// =============================================================================

console.log('\n=== Validation with Type Guards ===');

function validateDirection(input: string): void {
  if (isFromEnum(input, Directions)) {
    console.log(`Valid direction: ${input}`);
  } else {
    console.log(`Invalid direction: ${input}`);
  }
}

validateDirection('North'); // Valid
validateDirection('Up'); // Invalid

// =============================================================================
// Error Handling
// =============================================================================

console.log('\n=== Error Handling ===');

// Empty array
try {
  enumFromKeys('ex09-empty', []);
} catch (error) {
  console.log('Empty error:', (error as Error).message);
  // 'enumFromKeys requires at least one key'
}

// Duplicate keys
try {
  enumFromKeys('ex09-duplicates', ['A', 'B', 'A'] as const);
} catch (error) {
  console.log('Duplicate error:', (error as Error).message);
  // 'enumFromKeys: duplicate key "A" found'
}

// Non-string keys (would be caught by TypeScript, but also runtime check)
try {
  enumFromKeys('ex09-non-string', ['' as never]);
} catch (error) {
  console.log('Non-string error:', (error as Error).message);
  // 'enumFromKeys requires all keys to be non-empty strings'
}

// =============================================================================
// Comparison: enumFromKeys vs createBrandedEnum
// =============================================================================

console.log('\n=== When to Use Each ===');

// Use enumFromKeys when:
// - Keys and values should be identical
// - You have a list of string literals
// - You want concise syntax

// Use createBrandedEnum when:
// - Keys and values should be different
// - Values need specific formatting (lowercase, prefixed, etc.)
// - You need more control over the mapping

const UseEnumFromKeys = enumFromKeys('ex09-use-from-keys', ['Active', 'Inactive'] as const);
// { Active: 'Active', Inactive: 'Inactive' }

const UseCreateBranded = createBrandedEnum('ex09-use-create', {
  Active: 'active', // Different case
  Inactive: 'inactive',
} as const);
// { Active: 'active', Inactive: 'inactive' }

console.log('enumFromKeys result:', getEnumValues(UseEnumFromKeys));
console.log('createBrandedEnum result:', getEnumValues(UseCreateBranded));

console.log('\n✅ Example completed successfully!');
