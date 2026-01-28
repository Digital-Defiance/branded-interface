/**
 * Example 03: Global Registry
 *
 * This example demonstrates the global registry:
 * - getAllEnumIds: List all registered enums
 * - getEnumById: Retrieve enum by ID
 * - findEnumSources: Find which enums contain a value
 * - Cross-bundle compatibility
 *
 * Run: npx ts-node examples/03-registry.ts
 */

import {
  createBrandedEnum,
  getAllEnumIds,
  getEnumById,
  findEnumSources,
  getEnumId,
} from '../src/index.js';

// =============================================================================
// Creating Multiple Enums
// =============================================================================

console.log('=== Creating Enums ===');

const UserStatus = createBrandedEnum('ex03-user-status', {
  Active: 'active',
  Inactive: 'inactive',
  Suspended: 'suspended',
} as const);

const OrderStatus = createBrandedEnum('ex03-order-status', {
  Pending: 'pending',
  Processing: 'processing',
  Shipped: 'shipped',
  Delivered: 'delivered',
} as const);

const PaymentStatus = createBrandedEnum('ex03-payment-status', {
  Pending: 'pending', // Same value as OrderStatus.Pending!
  Completed: 'completed',
  Failed: 'failed',
} as const);

console.log('Created: ex03-user-status, ex03-order-status, ex03-payment-status');

// =============================================================================
// getAllEnumIds: List All Registered Enums
// =============================================================================

console.log('\n=== getAllEnumIds ===');

const allIds = getAllEnumIds();
console.log('All registered enum IDs:', allIds);
// Includes all enums registered in this process

// Filter to just our example enums
const ourEnums = allIds.filter((id) => id.startsWith('ex03-'));
console.log('Our example enums:', ourEnums);

// =============================================================================
// getEnumById: Retrieve Enum by ID
// =============================================================================

console.log('\n=== getEnumById ===');

// Retrieve an enum dynamically by its ID
const retrieved = getEnumById('ex03-user-status');
console.log('Retrieved enum:', retrieved);
// Note: The retrieved enum has a generic type, but it's the same object
console.log('Same object reference?', retrieved === (UserStatus as unknown)); // true

// Non-existent ID returns undefined
const notFound = getEnumById('non-existent-enum');
console.log('Non-existent enum:', notFound); // undefined

// =============================================================================
// findEnumSources: Find Enums Containing a Value
// =============================================================================

console.log('\n=== findEnumSources ===');

// Find which enums contain 'active'
const activeSource = findEnumSources('active');
console.log("Enums containing 'active':", activeSource);
// ['ex03-user-status']

// Find which enums contain 'pending' (exists in multiple enums!)
const pendingSources = findEnumSources('pending');
console.log("Enums containing 'pending':", pendingSources);
// ['ex03-order-status', 'ex03-payment-status']

// Value not in any enum
const unknownSources = findEnumSources('unknown-value');
console.log("Enums containing 'unknown-value':", unknownSources);
// []

// =============================================================================
// Use Case: Collision Detection
// =============================================================================

console.log('\n=== Use Case: Collision Detection ===');

function detectCollisions(value: string): void {
  const sources = findEnumSources(value);
  if (sources.length > 1) {
    console.log(`⚠️  Value "${value}" exists in multiple enums: ${sources.join(', ')}`);
  } else if (sources.length === 1) {
    console.log(`✓ Value "${value}" is unique to: ${sources[0]}`);
  } else {
    console.log(`✗ Value "${value}" not found in any enum`);
  }
}

detectCollisions('active'); // Unique
detectCollisions('pending'); // Collision!
detectCollisions('shipped'); // Unique
detectCollisions('unknown'); // Not found

// =============================================================================
// Use Case: Dynamic Enum Lookup
// =============================================================================

console.log('\n=== Use Case: Dynamic Enum Lookup ===');

// Useful for plugin systems or configuration-driven code
function getEnumValue(enumId: string, key: string): string | undefined {
  const enumObj = getEnumById(enumId);
  if (!enumObj) {
    console.log(`Enum "${enumId}" not found`);
    return undefined;
  }

  const value = enumObj[key as keyof typeof enumObj];
  if (typeof value === 'string') {
    return value;
  }

  console.log(`Key "${key}" not found in enum "${enumId}"`);
  return undefined;
}

console.log(getEnumValue('ex03-user-status', 'Active')); // 'active'
console.log(getEnumValue('ex03-order-status', 'Shipped')); // 'shipped'
console.log(getEnumValue('ex03-user-status', 'Unknown')); // undefined

// =============================================================================
// Cross-Bundle Compatibility
// =============================================================================

console.log('\n=== Cross-Bundle Compatibility ===');

// The registry uses globalThis, so it works across:
// - Different bundles (webpack, rollup, etc.)
// - ESM and CJS modules
// - Different instances of the library

// This means if Library A creates an enum and Library B imports branded-enum,
// Library B can find Library A's enum in the registry.

console.log('Registry is stored on globalThis for cross-bundle access');
console.log('All branded enums are automatically registered on creation');

// =============================================================================
// Best Practice: Namespaced Enum IDs
// =============================================================================

console.log('\n=== Best Practice: Namespaced IDs ===');

// Use namespaced IDs to avoid collisions between libraries
const LibAStatus = createBrandedEnum('lib-a/status', {
  Active: 'active',
} as const);

const LibBStatus = createBrandedEnum('lib-b/status', {
  Active: 'active',
} as const);

console.log('lib-a/status ID:', getEnumId(LibAStatus));
console.log('lib-b/status ID:', getEnumId(LibBStatus));

// Both can coexist without ID collision
console.log('Both enums registered successfully');

console.log('\n✅ Example completed successfully!');
