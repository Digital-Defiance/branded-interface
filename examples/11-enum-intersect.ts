/**
 * Example 11: Enum Intersect
 *
 * This example demonstrates finding shared values:
 * - enumIntersect: Find values that exist in multiple enums
 * - Use cases: collision detection, common value analysis
 *
 * Run: npx ts-node examples/11-enum-intersect.ts
 */

import { createBrandedEnum, enumIntersect } from '../src/index.js';

// =============================================================================
// Basic Intersection
// =============================================================================

console.log('=== Basic Intersection ===');

const PrimaryColors = createBrandedEnum('ex11-primary', {
  Red: 'red',
  Blue: 'blue',
  Yellow: 'yellow',
} as const);

const WarmColors = createBrandedEnum('ex11-warm', {
  Red: 'red', // Shared with Primary
  Orange: 'orange',
  Yellow: 'yellow', // Shared with Primary
} as const);

const CoolColors = createBrandedEnum('ex11-cool', {
  Blue: 'blue', // Shared with Primary
  Green: 'green',
  Purple: 'purple',
} as const);

// Find values shared between Primary and Warm
const primaryWarmShared = enumIntersect(PrimaryColors, WarmColors);
console.log('Primary ∩ Warm:', primaryWarmShared);
// [{ value: 'red', enumIds: ['ex11-primary', 'ex11-warm'] },
//  { value: 'yellow', enumIds: ['ex11-primary', 'ex11-warm'] }]

// Find values shared between Primary and Cool
const primaryCoolShared = enumIntersect(PrimaryColors, CoolColors);
console.log('Primary ∩ Cool:', primaryCoolShared);
// [{ value: 'blue', enumIds: ['ex11-primary', 'ex11-cool'] }]

// =============================================================================
// Multiple Enum Intersection
// =============================================================================

console.log('\n=== Multiple Enum Intersection ===');

// Find values shared across all three enums
const allShared = enumIntersect(PrimaryColors, WarmColors, CoolColors);
console.log('All three enums shared:', allShared);
// [] - no value exists in all three

// Create an enum with a value in all
const MixedColors = createBrandedEnum('ex11-mixed', {
  Red: 'red', // In Primary and Warm
  Blue: 'blue', // In Primary and Cool
  Green: 'green', // In Cool
} as const);

const withMixed = enumIntersect(PrimaryColors, WarmColors, CoolColors, MixedColors);
console.log('With Mixed enum:', withMixed);

// =============================================================================
// Use Case: i18n Key Collision Detection
// =============================================================================

console.log('\n=== Use Case: i18n Key Collision Detection ===');

const LibraryAKeys = createBrandedEnum('ex11-lib-a-keys', {
  Submit: 'submit',
  Cancel: 'cancel',
  Save: 'save',
} as const);

const LibraryBKeys = createBrandedEnum('ex11-lib-b-keys', {
  Submit: 'submit', // Collision!
  Reset: 'reset',
  Clear: 'clear',
} as const);

const LibraryCKeys = createBrandedEnum('ex11-lib-c-keys', {
  Submit: 'submit', // Collision!
  Apply: 'apply',
  Discard: 'discard',
} as const);

function detectI18nCollisions(...enums: Parameters<typeof enumIntersect>): void {
  const collisions = enumIntersect(...enums);

  if (collisions.length === 0) {
    console.log('✓ No i18n key collisions detected');
    return;
  }

  console.log(`⚠️  Found ${collisions.length} i18n key collision(s):`);
  collisions.forEach((collision) => {
    console.log(`   Key "${collision.value}" exists in: ${collision.enumIds.join(', ')}`);
  });
}

detectI18nCollisions(LibraryAKeys, LibraryBKeys, LibraryCKeys);

// =============================================================================
// Use Case: Finding Common Permissions
// =============================================================================

console.log('\n=== Use Case: Finding Common Permissions ===');

const AdminPermissions = createBrandedEnum('ex11-admin-perms', {
  Read: 'read',
  Write: 'write',
  Delete: 'delete',
  Admin: 'admin',
} as const);

const UserPermissions = createBrandedEnum('ex11-user-perms', {
  Read: 'read',
  Write: 'write',
  Comment: 'comment',
} as const);

const GuestPermissions = createBrandedEnum('ex11-guest-perms', {
  Read: 'read',
  View: 'view',
} as const);

const commonPerms = enumIntersect(AdminPermissions, UserPermissions, GuestPermissions);
console.log('Permissions common to all roles:');
commonPerms.forEach((p) => console.log(`  - ${p.value}`));
// 'read' is the only permission all roles share

// =============================================================================
// Use Case: Event System Overlap
// =============================================================================

console.log('\n=== Use Case: Event System Overlap ===');

const UIEvents = createBrandedEnum('ex11-ui-events', {
  Click: 'click',
  Hover: 'hover',
  Focus: 'focus',
  Change: 'change',
} as const);

const FormEvents = createBrandedEnum('ex11-form-events', {
  Submit: 'submit',
  Reset: 'reset',
  Change: 'change', // Also in UI
  Validate: 'validate',
} as const);

const DataEvents = createBrandedEnum('ex11-data-events', {
  Load: 'load',
  Save: 'save',
  Change: 'change', // Also in UI and Form
  Error: 'error',
} as const);

const eventOverlap = enumIntersect(UIEvents, FormEvents, DataEvents);
console.log('Events that overlap across systems:');
eventOverlap.forEach((e) => {
  console.log(`  "${e.value}" is used by: ${e.enumIds.join(', ')}`);
});

// =============================================================================
// Use Case: Check for No Overlap
// =============================================================================

console.log('\n=== Use Case: Check for No Overlap ===');

function ensureNoOverlap(...enums: Parameters<typeof enumIntersect>): boolean {
  const shared = enumIntersect(...enums);
  if (shared.length === 0) {
    console.log('✓ No overlapping values - enums are disjoint');
    return true;
  }
  console.log(`✗ Found ${shared.length} overlapping value(s)`);
  return false;
}

const DisjointA = createBrandedEnum('ex11-disjoint-a', {
  A1: 'a1',
  A2: 'a2',
} as const);

const DisjointB = createBrandedEnum('ex11-disjoint-b', {
  B1: 'b1',
  B2: 'b2',
} as const);

ensureNoOverlap(DisjointA, DisjointB); // No overlap
ensureNoOverlap(PrimaryColors, WarmColors); // Has overlap

// =============================================================================
// Analyzing Intersection Results
// =============================================================================

console.log('\n=== Analyzing Intersection Results ===');

const intersection = enumIntersect(PrimaryColors, WarmColors, MixedColors);

// Count how many enums each value appears in
const valueCounts = new Map<string, number>();
intersection.forEach((entry) => {
  valueCounts.set(entry.value, entry.enumIds.length);
});

console.log('Value occurrence counts:');
valueCounts.forEach((count, value) => {
  console.log(`  "${value}": appears in ${count} enums`);
});

// Find the most shared value
let mostShared = { value: '', count: 0 };
valueCounts.forEach((count, value) => {
  if (count > mostShared.count) {
    mostShared = { value, count };
  }
});

if (mostShared.count > 0) {
  console.log(`Most shared value: "${mostShared.value}" (${mostShared.count} enums)`);
}

console.log('\n✅ Example completed successfully!');
