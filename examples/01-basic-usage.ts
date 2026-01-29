/**
 * Example 01: Basic Usage
 *
 * This example demonstrates the fundamental usage of branded-enum:
 * - Creating branded enums with createBrandedEnum
 * - Accessing values (raw strings, zero overhead)
 * - Type inference with `as const`
 *
 * Run: npx ts-node examples/01-basic-usage.ts
 */

import { createBrandedEnum, getEnumId, getEnumValues } from '../src/index.js';

// =============================================================================
// BEFORE: Standard TypeScript Enum (Problems)
// =============================================================================

// Standard enums are erased at runtime - you can't identify which enum a value came from
enum StandardStatus {
  Active = 'active',
  Inactive = 'inactive',
}

enum StandardPriority {
  High = 'high',
  Low = 'low',
}

// Both enums could have the same value - no way to distinguish at runtime
// If StandardStatus.Active === 'active' and some other enum also has 'active',
// you can't tell which enum the value belongs to.

// =============================================================================
// AFTER: Branded Enum (Solution)
// =============================================================================

// Create a branded enum with a unique ID
// IMPORTANT: Use `as const` for literal type inference
const Status = createBrandedEnum('status', {
  Active: 'active',
  Inactive: 'inactive',
  Pending: 'pending',
} as const);

// Values are raw strings - zero runtime overhead
console.log('=== Basic Value Access ===');
console.log('Status.Active:', Status.Active); // 'active'
console.log('Status.Inactive:', Status.Inactive); // 'inactive'
console.log('Status.Pending:', Status.Pending); // 'pending'

// Runtime identification - this is what makes branded enums special
console.log('\n=== Runtime Identification ===');
console.log('Enum ID:', getEnumId(Status)); // 'status'
console.log('All values:', getEnumValues(Status)); // ['active', 'inactive', 'pending']

// =============================================================================
// Type Inference
// =============================================================================

// With `as const`, TypeScript infers literal types
type StatusValue = (typeof Status)[keyof typeof Status];
// StatusValue = 'active' | 'inactive' | 'pending'

// This enables type-safe function parameters
function processStatus(status: StatusValue): void {
  console.log('Processing status:', status);
}

processStatus(Status.Active); // OK
processStatus('active'); // OK - literal type matches
// processStatus('invalid'); // TypeScript error!

// =============================================================================
// Serialization Compatibility
// =============================================================================

console.log('\n=== Serialization ===');

// Branded enums serialize cleanly to JSON
const json = JSON.stringify(Status);
console.log('JSON.stringify(Status):', json);
// '{"Active":"active","Inactive":"inactive","Pending":"pending"}'

// Metadata is stored in non-enumerable Symbol properties
console.log('Object.keys(Status):', Object.keys(Status));
// ['Active', 'Inactive', 'Pending'] - no metadata pollution

console.log('Object.values(Status):', Object.values(Status));
// ['active', 'inactive', 'pending']

// =============================================================================
// Anti-Pattern: Forgetting `as const`
// =============================================================================

// WITHOUT `as const` - types are widened to `string`
const BadEnum = createBrandedEnum('bad-enum', {
  A: 'a',
  B: 'b',
});
// typeof BadEnum.A is `string`, not `'a'`

// WITH `as const` - types are literal
const GoodEnum = createBrandedEnum('good-enum', {
  A: 'a',
  B: 'b',
} as const);
// typeof GoodEnum.A is `'a'`

console.log('\n=== Type Inference Demo ===');
console.log('GoodEnum.A:', GoodEnum.A); // 'a' (literal type)

// =============================================================================
// Idempotent Behavior: Duplicate IDs Return Existing Enum
// =============================================================================

console.log('\n=== Idempotent Behavior ===');

// Creating an enum with an existing ID returns the same enum (idempotent)
// This is useful for module-scoped enums that may be re-imported in test environments
const Status2 = createBrandedEnum('status', {
  Active: 'active',
  Inactive: 'inactive',
  Pending: 'pending',
} as const);
console.log('Status === Status2:', Status === Status2); // true
console.log('This is useful for module-scoped enums that may be re-imported');

console.log('\n✅ Example completed successfully!');
