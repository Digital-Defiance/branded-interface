/**
 * Example 15: Compile-Time Types
 *
 * This example demonstrates TypeScript utility types:
 * - EnumKeys: Extract key union from enum
 * - EnumValues: Extract value union from enum
 * - ValidEnumValue: Compile-time value validation
 * - StrictEnumParam: Strict function parameter type
 *
 * Run: npx ts-node examples/15-compile-time-types.ts
 */

import {
  createBrandedEnum,
  EnumKeys,
  EnumValues,
  ValidEnumValue,
  StrictEnumParam,
  AnyBrandedEnum,
} from '../src/index.js';

// =============================================================================
// Setup: Create Test Enums
// =============================================================================

const Status = createBrandedEnum('ex15-status', {
  Active: 'active',
  Inactive: 'inactive',
  Pending: 'pending',
} as const);

const Priority = createBrandedEnum('ex15-priority', {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
} as const);

// =============================================================================
// EnumKeys: Extract Key Union
// =============================================================================

console.log('=== EnumKeys ===');

// Extract the union of all keys
type StatusKeys = EnumKeys<typeof Status>;
// StatusKeys = 'Active' | 'Inactive' | 'Pending'

type PriorityKeys = EnumKeys<typeof Priority>;
// PriorityKeys = 'Low' | 'Medium' | 'High'

// Use in function parameters
function getStatusByKey(key: StatusKeys): string {
  return Status[key];
}

console.log("getStatusByKey('Active'):", getStatusByKey('Active'));
console.log("getStatusByKey('Pending'):", getStatusByKey('Pending'));
// getStatusByKey('Invalid'); // TypeScript error!

// =============================================================================
// EnumValues: Extract Value Union
// =============================================================================

console.log('\n=== EnumValues ===');

// Extract the union of all values
type StatusValues = EnumValues<typeof Status>;
// StatusValues = 'active' | 'inactive' | 'pending'

type PriorityValues = EnumValues<typeof Priority>;
// PriorityValues = 'low' | 'medium' | 'high'

// Use for type-safe value handling
function processStatus(value: StatusValues): void {
  console.log(`Processing status: ${value}`);
}

processStatus('active'); // OK
processStatus('inactive'); // OK
// processStatus('invalid'); // TypeScript error!

// =============================================================================
// ValidEnumValue: Compile-Time Validation
// =============================================================================

console.log('\n=== ValidEnumValue ===');

// ValidEnumValue<E, V> returns V if valid, never if invalid
type ValidActive = ValidEnumValue<typeof Status, 'active'>;
// ValidActive = 'active' (valid)

type InvalidValue = ValidEnumValue<typeof Status, 'invalid'>;
// InvalidValue = never (invalid)

// Use for compile-time assertions
function setStatus<V extends string>(value: ValidEnumValue<typeof Status, V>): void {
  console.log(`Setting status to: ${value}`);
}

setStatus('active'); // OK
setStatus('inactive'); // OK
// setStatus('invalid'); // TypeScript error: Argument of type 'never' is not assignable

// =============================================================================
// StrictEnumParam: Strict Function Parameters
// =============================================================================

console.log('\n=== StrictEnumParam ===');

// StrictEnumParam creates a strict parameter type
function updateStatus(newStatus: StrictEnumParam<typeof Status>): void {
  console.log(`Status updated to: ${newStatus}`);
}

updateStatus(Status.Active); // OK - using enum value
updateStatus('active'); // OK - literal type matches
// updateStatus('invalid'); // TypeScript error!

// Works with multiple parameters
function createTask(
  status: StrictEnumParam<typeof Status>,
  priority: StrictEnumParam<typeof Priority>
): { status: string; priority: string } {
  return { status, priority };
}

const task = createTask(Status.Active, Priority.High);
console.log('Created task:', task);

// Also works with literal strings
const task2 = createTask('pending', 'low');
console.log('Created task 2:', task2);

// =============================================================================
// Generic Functions with Enum Constraints
// =============================================================================

console.log('\n=== Generic Functions ===');

// Generic function that works with any branded enum
function getRandomValue<E extends AnyBrandedEnum>(enumObj: E): EnumValues<E> {
  const keys = Object.keys(enumObj).filter(
    (k) => typeof enumObj[k as keyof E] === 'string'
  ) as Array<keyof E & string>;
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return enumObj[randomKey] as EnumValues<E>;
}

console.log('Random status:', getRandomValue(Status));
console.log('Random priority:', getRandomValue(Priority));

// Generic function with strict value parameter
function processValue<E extends AnyBrandedEnum>(
  enumObj: E,
  value: StrictEnumParam<E>
): void {
  console.log(`Processing value: ${value}`);
}

processValue(Status, 'active'); // OK
processValue(Priority, 'high'); // OK
// processValue(Status, 'high'); // TypeScript error - 'high' is not in Status

// =============================================================================
// Type-Level Assertions
// =============================================================================

console.log('\n=== Type-Level Assertions ===');

// These are compile-time checks - they don't produce runtime output
// but they verify type correctness

// Assert that 'active' is a valid Status value
type AssertActive = ValidEnumValue<typeof Status, 'active'>;
const _assertActive: AssertActive = 'active'; // Compiles OK

// Assert that 'invalid' is NOT a valid Status value
type AssertInvalid = ValidEnumValue<typeof Status, 'invalid'>;
// const _assertInvalid: AssertInvalid = 'invalid'; // Would not compile - type is 'never'

console.log('Type assertions passed at compile time');

// =============================================================================
// Combining Types
// =============================================================================

console.log('\n=== Combining Types ===');

// Create a union of values from multiple enums
type AllValues = EnumValues<typeof Status> | EnumValues<typeof Priority>;
// AllValues = 'active' | 'inactive' | 'pending' | 'low' | 'medium' | 'high'

function handleAnyValue(value: AllValues): void {
  console.log(`Handling value: ${value}`);
}

handleAnyValue('active'); // From Status
handleAnyValue('high'); // From Priority

// Create a record type using enum keys
type StatusRecord = Record<EnumKeys<typeof Status>, boolean>;
// StatusRecord = { Active: boolean; Inactive: boolean; Pending: boolean }

const statusFlags: StatusRecord = {
  Active: true,
  Inactive: false,
  Pending: true,
};
console.log('Status flags:', statusFlags);

// =============================================================================
// Practical Example: Type-Safe Configuration
// =============================================================================

console.log('\n=== Practical Example: Type-Safe Config ===');

interface TaskConfig<S extends AnyBrandedEnum, P extends AnyBrandedEnum> {
  defaultStatus: StrictEnumParam<S>;
  defaultPriority: StrictEnumParam<P>;
  allowedStatuses: Array<StrictEnumParam<S>>;
  allowedPriorities: Array<StrictEnumParam<P>>;
}

const config: TaskConfig<typeof Status, typeof Priority> = {
  defaultStatus: 'pending',
  defaultPriority: 'medium',
  allowedStatuses: ['active', 'pending'], // Only these are allowed
  allowedPriorities: ['low', 'medium', 'high'],
};

console.log('Task config:', config);

// =============================================================================
// Anti-Pattern: Losing Type Safety
// =============================================================================

console.log('\n=== Anti-Pattern: Losing Type Safety ===');

// BAD: Using string instead of enum types
function badFunction(status: string): void {
  // No type safety - any string is accepted
  console.log(status);
}

// GOOD: Using StrictEnumParam
function goodFunction(status: StrictEnumParam<typeof Status>): void {
  // Only valid status values are accepted
  console.log(status);
}

badFunction('anything'); // Compiles but no safety
goodFunction('active'); // Type-safe

console.log('\n✅ Example completed successfully!');
