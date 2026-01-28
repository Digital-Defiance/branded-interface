/**
 * Example 14: Exhaustive Checking
 *
 * This example demonstrates exhaustiveness checking in switch statements:
 * - exhaustive: Generic helper for any discriminated union
 * - exhaustiveGuard: Enum-specific guard with better error messages
 *
 * Run: npx ts-node examples/14-exhaustive-checking.ts
 */

import { createBrandedEnum, exhaustive, exhaustiveGuard, BrandedEnumValue } from '../src/index.js';

// =============================================================================
// Basic exhaustive Helper
// =============================================================================

console.log('=== Basic exhaustive Helper ===');

const Status = createBrandedEnum('ex14-status', {
  Active: 'active',
  Inactive: 'inactive',
  Pending: 'pending',
} as const);

type StatusValue = BrandedEnumValue<typeof Status>;

// Complete switch - TypeScript is happy
function handleStatusComplete(status: StatusValue): string {
  switch (status) {
    case Status.Active:
      return 'User is active';
    case Status.Inactive:
      return 'User is inactive';
    case Status.Pending:
      return 'User is pending';
    default:
      // TypeScript knows this is unreachable
      // If we add a new status, this will cause a compile error
      return exhaustive(status);
  }
}

console.log(handleStatusComplete(Status.Active));
console.log(handleStatusComplete(Status.Inactive));
console.log(handleStatusComplete(Status.Pending));

// =============================================================================
// Compile-Time Safety
// =============================================================================

console.log('\n=== Compile-Time Safety ===');

// If you uncomment the following function, TypeScript will show an error
// because 'Pending' case is missing:

/*
function handleStatusIncomplete(status: StatusValue): string {
  switch (status) {
    case Status.Active:
      return 'Active';
    case Status.Inactive:
      return 'Inactive';
    // Missing: case Status.Pending
    default:
      // TypeScript error: Argument of type '"pending"' is not assignable to parameter of type 'never'
      return exhaustive(status);
  }
}
*/

console.log('Uncomment the incomplete function to see TypeScript error');

// =============================================================================
// exhaustiveGuard: Enum-Specific Guard
// =============================================================================

console.log('\n=== exhaustiveGuard: Enum-Specific Guard ===');

const Priority = createBrandedEnum('ex14-priority', {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  Critical: 'critical',
} as const);

type PriorityValue = BrandedEnumValue<typeof Priority>;

// Create a guard specific to this enum
const assertPriorityExhaustive = exhaustiveGuard(Priority);

function handlePriority(priority: PriorityValue): string {
  switch (priority) {
    case Priority.Low:
      return '🟢 Low priority';
    case Priority.Medium:
      return '🟡 Medium priority';
    case Priority.High:
      return '🟠 High priority';
    case Priority.Critical:
      return '🔴 Critical priority';
    default:
      // Error message will include enum ID: "ex14-priority"
      return assertPriorityExhaustive(priority);
  }
}

console.log(handlePriority(Priority.Low));
console.log(handlePriority(Priority.Critical));

// =============================================================================
// Runtime Error Messages
// =============================================================================

console.log('\n=== Runtime Error Messages ===');

// If somehow an invalid value reaches the switch at runtime
// (e.g., from JavaScript code or type assertions), the error is descriptive

// Using exhaustive
try {
  // Force an invalid value (bypassing TypeScript)
  const invalidStatus = 'invalid' as StatusValue;
  switch (invalidStatus) {
    case Status.Active:
    case Status.Inactive:
    case Status.Pending:
      console.log('Valid');
      break;
    default:
      exhaustive(invalidStatus as never);
  }
} catch (error) {
  console.log('exhaustive error:', (error as Error).message);
  // 'Exhaustive check failed: unexpected value "invalid"'
}

// Using exhaustiveGuard
try {
  const invalidPriority = 'urgent' as PriorityValue;
  switch (invalidPriority) {
    case Priority.Low:
    case Priority.Medium:
    case Priority.High:
    case Priority.Critical:
      console.log('Valid');
      break;
    default:
      assertPriorityExhaustive(invalidPriority as never);
  }
} catch (error) {
  console.log('exhaustiveGuard error:', (error as Error).message);
  // 'Exhaustive check failed for enum "ex14-priority": unexpected value "urgent"'
}

// =============================================================================
// Custom Error Messages
// =============================================================================

console.log('\n=== Custom Error Messages ===');

function handleWithCustomError(status: StatusValue): string {
  switch (status) {
    case Status.Active:
      return 'Active';
    case Status.Inactive:
      return 'Inactive';
    case Status.Pending:
      return 'Pending';
    default:
      // Custom error message
      return exhaustive(status, `Unhandled status value: ${status}`);
  }
}

console.log(handleWithCustomError(Status.Active));

// =============================================================================
// Use Case: State Machine
// =============================================================================

console.log('\n=== Use Case: State Machine ===');

const OrderState = createBrandedEnum('ex14-order-state', {
  Created: 'created',
  Paid: 'paid',
  Shipped: 'shipped',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
} as const);

type OrderStateValue = BrandedEnumValue<typeof OrderState>;

const assertOrderStateExhaustive = exhaustiveGuard(OrderState);

function getNextActions(state: OrderStateValue): string[] {
  switch (state) {
    case OrderState.Created:
      return ['pay', 'cancel'];
    case OrderState.Paid:
      return ['ship', 'refund'];
    case OrderState.Shipped:
      return ['deliver', 'return'];
    case OrderState.Delivered:
      return ['return', 'review'];
    case OrderState.Cancelled:
      return ['reorder'];
    default:
      return assertOrderStateExhaustive(state);
  }
}

console.log('Created actions:', getNextActions(OrderState.Created));
console.log('Shipped actions:', getNextActions(OrderState.Shipped));
console.log('Cancelled actions:', getNextActions(OrderState.Cancelled));

// =============================================================================
// Works with Discriminated Unions Too
// =============================================================================

console.log('\n=== Works with Discriminated Unions ===');

type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'rectangle'; width: number; height: number };

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'square':
      return shape.side ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    default:
      // Works with any discriminated union
      return exhaustive(shape);
  }
}

console.log('Circle area:', getArea({ kind: 'circle', radius: 5 }).toFixed(2));
console.log('Square area:', getArea({ kind: 'square', side: 4 }));
console.log('Rectangle area:', getArea({ kind: 'rectangle', width: 3, height: 4 }));

// =============================================================================
// Best Practice: Always Use in Default Case
// =============================================================================

console.log('\n=== Best Practice ===');

// GOOD: Using exhaustive in default case
function goodPattern(status: StatusValue): void {
  switch (status) {
    case Status.Active:
    case Status.Inactive:
    case Status.Pending:
      console.log('Handled:', status);
      break;
    default:
      exhaustive(status); // Ensures all cases are covered
  }
}

// BAD: No exhaustive check - silent failure if new case added
function badPattern(status: StatusValue): void {
  switch (status) {
    case Status.Active:
    case Status.Inactive:
    case Status.Pending:
      console.log('Handled:', status);
      break;
    // No default - if a new status is added, it silently falls through
  }
}

goodPattern(Status.Active);

console.log('\n✅ Example completed successfully!');
