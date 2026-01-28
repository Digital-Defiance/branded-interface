/**
 * Example 05: Utility Functions
 *
 * This example demonstrates utility functions:
 * - hasValue: Check if value exists (reverse lookup)
 * - getKeyForValue: Get key name for a value
 * - isValidKey: Check if key exists
 * - enumEntries: Iterate over key-value pairs
 *
 * Run: npx ts-node examples/05-utility-functions.ts
 */

import {
  createBrandedEnum,
  hasValue,
  getKeyForValue,
  isValidKey,
  enumEntries,
} from '../src/index.js';

// Create test enum
const HttpStatus = createBrandedEnum('ex05-http-status', {
  OK: '200',
  Created: '201',
  BadRequest: '400',
  Unauthorized: '401',
  NotFound: '404',
  InternalError: '500',
} as const);

// =============================================================================
// hasValue: Check if Value Exists
// =============================================================================

console.log('=== hasValue ===');

// Check if specific values exist in the enum
console.log("hasValue(HttpStatus, '200'):", hasValue(HttpStatus, '200')); // true
console.log("hasValue(HttpStatus, '404'):", hasValue(HttpStatus, '404')); // true
console.log("hasValue(HttpStatus, '999'):", hasValue(HttpStatus, '999')); // false

// Returns false for non-string values
console.log('hasValue(HttpStatus, 200):', hasValue(HttpStatus, 200)); // false (number)
console.log('hasValue(HttpStatus, null):', hasValue(HttpStatus, null)); // false

// =============================================================================
// getKeyForValue: Reverse Lookup
// =============================================================================

console.log('\n=== getKeyForValue ===');

// Get the key name for a value
console.log("getKeyForValue(HttpStatus, '200'):", getKeyForValue(HttpStatus, '200')); // 'OK'
console.log("getKeyForValue(HttpStatus, '404'):", getKeyForValue(HttpStatus, '404')); // 'NotFound'
console.log("getKeyForValue(HttpStatus, '500'):", getKeyForValue(HttpStatus, '500')); // 'InternalError'

// Returns undefined for unknown values
console.log("getKeyForValue(HttpStatus, '999'):", getKeyForValue(HttpStatus, '999')); // undefined

// =============================================================================
// Use Case: Display Friendly Names
// =============================================================================

console.log('\n=== Use Case: Display Friendly Names ===');

function getStatusName(code: string): string {
  const key = getKeyForValue(HttpStatus, code);
  if (!key) return `Unknown (${code})`;

  // Convert PascalCase to readable format
  return String(key).replace(/([A-Z])/g, ' $1').trim();
}

console.log("Status 200:", getStatusName('200')); // 'O K' -> needs better formatting
console.log("Status 404:", getStatusName('404')); // 'Not Found'
console.log("Status 500:", getStatusName('500')); // 'Internal Error'
console.log("Status 999:", getStatusName('999')); // 'Unknown (999)'

// =============================================================================
// isValidKey: Check if Key Exists
// =============================================================================

console.log('\n=== isValidKey ===');

// Check if specific keys exist
console.log("isValidKey(HttpStatus, 'OK'):", isValidKey(HttpStatus, 'OK')); // true
console.log("isValidKey(HttpStatus, 'NotFound'):", isValidKey(HttpStatus, 'NotFound')); // true
console.log("isValidKey(HttpStatus, 'Unknown'):", isValidKey(HttpStatus, 'Unknown')); // false

// Returns false for non-string keys
console.log('isValidKey(HttpStatus, 123):', isValidKey(HttpStatus, 123)); // false

// =============================================================================
// Use Case: Safe Property Access
// =============================================================================

console.log('\n=== Use Case: Safe Property Access ===');

function getStatusCode(keyName: string): string | undefined {
  if (isValidKey(HttpStatus, keyName)) {
    // TypeScript knows keyName is a valid key here
    return HttpStatus[keyName];
  }
  return undefined;
}

console.log("getStatusCode('OK'):", getStatusCode('OK')); // '200'
console.log("getStatusCode('NotFound'):", getStatusCode('NotFound')); // '404'
console.log("getStatusCode('Invalid'):", getStatusCode('Invalid')); // undefined

// =============================================================================
// enumEntries: Iterate Over Key-Value Pairs
// =============================================================================

console.log('\n=== enumEntries ===');

// Iterate using for...of
console.log('Iterating with for...of:');
for (const [key, value] of enumEntries(HttpStatus)) {
  console.log(`  ${key}: ${value}`);
}

// Convert to array
const entriesArray = [...enumEntries(HttpStatus)];
console.log('\nAs array:', entriesArray);

// Use with Array.from
const entriesFromArray = Array.from(enumEntries(HttpStatus));
console.log('Array.from:', entriesFromArray.length, 'entries');

// =============================================================================
// Use Case: Building a Lookup Table
// =============================================================================

console.log('\n=== Use Case: Building a Lookup Table ===');

// Create a reverse lookup map (value -> key)
const reverseLookup = new Map<string, string>();
for (const [key, value] of enumEntries(HttpStatus)) {
  reverseLookup.set(value, String(key));
}

console.log('Reverse lookup map:');
console.log("  '200' ->", reverseLookup.get('200')); // 'OK'
console.log("  '404' ->", reverseLookup.get('404')); // 'NotFound'

// =============================================================================
// Roundtrip: Value -> Key -> Value
// =============================================================================

console.log('\n=== Roundtrip Demo ===');

function roundtrip(value: string): void {
  const key = getKeyForValue(HttpStatus, value);
  if (key) {
    const backToValue = HttpStatus[key];
    console.log(`${value} -> ${String(key)} -> ${backToValue}`);
    console.log(`  Roundtrip successful: ${value === backToValue}`);
  } else {
    console.log(`${value} -> (not found)`);
  }
}

roundtrip('200');
roundtrip('404');
roundtrip('999');

// =============================================================================
// Comparison: enumEntries vs Object.entries
// =============================================================================

console.log('\n=== enumEntries vs Object.entries ===');

// Both produce the same results for enumerable properties
console.log('enumEntries:', [...enumEntries(HttpStatus)].length, 'entries');
console.log('Object.entries:', Object.entries(HttpStatus).length, 'entries');

// But enumEntries provides better TypeScript types:
// - enumEntries returns [keyof E, BrandedEnumValue<E>]
// - Object.entries returns [string, string]

console.log('\n✅ Example completed successfully!');
