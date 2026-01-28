/**
 * Example 02: Type Guards
 *
 * This example demonstrates runtime type checking:
 * - isFromEnum: Soft check that returns boolean
 * - assertFromEnum: Hard check that throws on invalid values
 * - Type narrowing in TypeScript
 *
 * Run: npx ts-node examples/02-type-guards.ts
 */

import { createBrandedEnum, isFromEnum, assertFromEnum } from '../src/index.js';

// Create test enums
const Status = createBrandedEnum('ex02-status', {
  Active: 'active',
  Inactive: 'inactive',
  Pending: 'pending',
} as const);

const Priority = createBrandedEnum('ex02-priority', {
  High: 'high',
  Medium: 'medium',
  Low: 'low',
} as const);

// =============================================================================
// isFromEnum: Soft Check with Type Narrowing
// =============================================================================

console.log('=== isFromEnum: Soft Check ===');

function handleUnknownValue(value: unknown): void {
  // Before the check, value is `unknown`
  if (isFromEnum(value, Status)) {
    // After the check, value is narrowed to 'active' | 'inactive' | 'pending'
    console.log(`Valid status: ${value}`);

    // TypeScript knows the exact type, enabling exhaustive checks
    switch (value) {
      case Status.Active:
        console.log('  -> User is active');
        break;
      case Status.Inactive:
        console.log('  -> User is inactive');
        break;
      case Status.Pending:
        console.log('  -> User is pending approval');
        break;
    }
  } else {
    console.log(`Invalid status: ${String(value)}`);
  }
}

// Test with various inputs
handleUnknownValue('active'); // Valid
handleUnknownValue('inactive'); // Valid
handleUnknownValue('invalid'); // Invalid
handleUnknownValue(123); // Invalid (not a string)
handleUnknownValue(null); // Invalid
handleUnknownValue(undefined); // Invalid

// =============================================================================
// Distinguishing Between Enums
// =============================================================================

console.log('\n=== Distinguishing Between Enums ===');

function routeValue(value: string): void {
  if (isFromEnum(value, Status)) {
    console.log(`Routing to status handler: ${value}`);
  } else if (isFromEnum(value, Priority)) {
    console.log(`Routing to priority handler: ${value}`);
  } else {
    console.log(`Unknown value: ${value}`);
  }
}

routeValue('active'); // Status handler
routeValue('high'); // Priority handler
routeValue('unknown'); // Unknown

// =============================================================================
// assertFromEnum: Hard Check (Throws on Invalid)
// =============================================================================

console.log('\n=== assertFromEnum: Hard Check ===');

function processApiResponse(response: { status: unknown }): void {
  try {
    // assertFromEnum throws if the value is invalid
    const status = assertFromEnum(response.status, Status);

    // If we get here, status is guaranteed to be valid
    console.log(`Processing valid status: ${status}`);
  } catch (error) {
    console.log(`API error: ${(error as Error).message}`);
  }
}

processApiResponse({ status: 'active' }); // OK
processApiResponse({ status: 'invalid' }); // Throws

// =============================================================================
// BEFORE/AFTER: Manual Validation vs Type Guards
// =============================================================================

console.log('\n=== Before/After Comparison ===');

// BEFORE: Manual validation (verbose, error-prone)
function validateStatusManual(value: unknown): value is 'active' | 'inactive' | 'pending' {
  return value === 'active' || value === 'inactive' || value === 'pending';
}

// AFTER: Using isFromEnum (concise, type-safe)
function validateStatusBranded(value: unknown): value is (typeof Status)[keyof typeof Status] {
  return isFromEnum(value, Status);
}

// The branded version:
// 1. Automatically stays in sync with enum definition
// 2. Works with any branded enum
// 3. Provides better type inference

// =============================================================================
// Edge Cases
// =============================================================================

console.log('\n=== Edge Cases ===');

// Non-branded enum objects return false
const plainObject = { Active: 'active' };
console.log('isFromEnum with plain object:', isFromEnum('active', plainObject as never));
// false - plainObject is not a branded enum

// Non-string values return false
console.log('isFromEnum with number:', isFromEnum(123, Status)); // false
console.log('isFromEnum with null:', isFromEnum(null, Status)); // false
console.log('isFromEnum with object:', isFromEnum({}, Status)); // false

// =============================================================================
// Best Practice: Combining Guards
// =============================================================================

console.log('\n=== Best Practice: Combining Guards ===');

type StatusOrPriority =
  | (typeof Status)[keyof typeof Status]
  | (typeof Priority)[keyof typeof Priority];

function handleStatusOrPriority(value: StatusOrPriority): void {
  if (isFromEnum(value, Status)) {
    console.log(`Status: ${value}`);
  } else if (isFromEnum(value, Priority)) {
    console.log(`Priority: ${value}`);
  }
}

handleStatusOrPriority('active');
handleStatusOrPriority('high');

console.log('\n✅ Example completed successfully!');
