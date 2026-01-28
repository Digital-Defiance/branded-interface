/**
 * Example 10: Enum Diff
 *
 * This example demonstrates comparing enums:
 * - enumDiff: Find differences between two enums
 * - Use cases: migration, debugging, validation
 *
 * Run: npx ts-node examples/10-enum-diff.ts
 */

import { createBrandedEnum, enumDiff } from '../src/index.js';

// =============================================================================
// Basic Comparison
// =============================================================================

console.log('=== Basic Comparison ===');

const StatusV1 = createBrandedEnum('ex10-status-v1', {
  Active: 'active',
  Inactive: 'inactive',
  Pending: 'pending',
} as const);

const StatusV2 = createBrandedEnum('ex10-status-v2', {
  Active: 'active', // Same
  Inactive: 'disabled', // Changed value
  Pending: 'pending', // Same
  Archived: 'archived', // New
} as const);

const diff = enumDiff(StatusV1, StatusV2);

console.log('Keys only in V1:', diff.onlyInFirst);
// []

console.log('Keys only in V2:', diff.onlyInSecond);
// [{ key: 'Archived', value: 'archived' }]

console.log('Different values:', diff.differentValues);
// [{ key: 'Inactive', firstValue: 'inactive', secondValue: 'disabled' }]

console.log('Same values:', diff.sameValues);
// [{ key: 'Active', value: 'active' }, { key: 'Pending', value: 'pending' }]

// =============================================================================
// Use Case: Migration Validation
// =============================================================================

console.log('\n=== Use Case: Migration Validation ===');

const OldConfig = createBrandedEnum('ex10-old-config', {
  Debug: 'debug',
  Info: 'info',
  Warn: 'warn',
  Error: 'error',
  Verbose: 'verbose', // Will be removed
} as const);

const NewConfig = createBrandedEnum('ex10-new-config', {
  Debug: 'debug',
  Info: 'info',
  Warn: 'warning', // Changed!
  Error: 'error',
  Fatal: 'fatal', // New
} as const);

function validateMigration(
  oldEnum: Parameters<typeof enumDiff>[0],
  newEnum: Parameters<typeof enumDiff>[1]
): void {
  const result = enumDiff(oldEnum, newEnum);

  console.log('\n--- Migration Report ---');

  if (result.onlyInFirst.length > 0) {
    console.log('⚠️  Removed keys (may break existing code):');
    result.onlyInFirst.forEach((item) => {
      console.log(`   - ${item.key}: '${item.value}'`);
    });
  }

  if (result.onlyInSecond.length > 0) {
    console.log('✓ New keys added:');
    result.onlyInSecond.forEach((item) => {
      console.log(`   + ${item.key}: '${item.value}'`);
    });
  }

  if (result.differentValues.length > 0) {
    console.log('⚠️  Changed values (may affect stored data):');
    result.differentValues.forEach((item) => {
      console.log(`   ~ ${item.key}: '${item.firstValue}' → '${item.secondValue}'`);
    });
  }

  if (result.sameValues.length > 0) {
    console.log(`✓ ${result.sameValues.length} keys unchanged`);
  }

  // Summary
  const isBreaking = result.onlyInFirst.length > 0 || result.differentValues.length > 0;
  console.log(`\nMigration type: ${isBreaking ? '⚠️  BREAKING' : '✓ Non-breaking'}`);
}

validateMigration(OldConfig, NewConfig);

// =============================================================================
// Use Case: Check if Enums are Identical
// =============================================================================

console.log('\n=== Use Case: Check if Identical ===');

function areEnumsIdentical(
  enum1: Parameters<typeof enumDiff>[0],
  enum2: Parameters<typeof enumDiff>[1]
): boolean {
  const result = enumDiff(enum1, enum2);
  return (
    result.onlyInFirst.length === 0 &&
    result.onlyInSecond.length === 0 &&
    result.differentValues.length === 0
  );
}

const CopyA = createBrandedEnum('ex10-copy-a', {
  X: 'x',
  Y: 'y',
} as const);

const CopyB = createBrandedEnum('ex10-copy-b', {
  X: 'x',
  Y: 'y',
} as const);

const DifferentC = createBrandedEnum('ex10-different-c', {
  X: 'x',
  Z: 'z',
} as const);

console.log('CopyA identical to CopyB:', areEnumsIdentical(CopyA, CopyB)); // true
console.log('CopyA identical to DifferentC:', areEnumsIdentical(CopyA, DifferentC)); // false

// =============================================================================
// Use Case: Find Added/Removed Features
// =============================================================================

console.log('\n=== Use Case: Feature Comparison ===');

const FeaturesRelease1 = createBrandedEnum('ex10-features-r1', {
  DarkMode: 'dark-mode',
  Notifications: 'notifications',
  Export: 'export',
} as const);

const FeaturesRelease2 = createBrandedEnum('ex10-features-r2', {
  DarkMode: 'dark-mode',
  Notifications: 'notifications',
  Export: 'export',
  Import: 'import',
  Sync: 'sync',
} as const);

const featureDiff = enumDiff(FeaturesRelease1, FeaturesRelease2);

console.log('New features in Release 2:');
featureDiff.onlyInSecond.forEach((f) => console.log(`  + ${f.key}`));

// =============================================================================
// Use Case: API Version Compatibility
// =============================================================================

console.log('\n=== Use Case: API Version Compatibility ===');

const ApiV1Endpoints = createBrandedEnum('ex10-api-v1', {
  GetUsers: '/api/v1/users',
  GetUser: '/api/v1/users/:id',
  CreateUser: '/api/v1/users',
} as const);

const ApiV2Endpoints = createBrandedEnum('ex10-api-v2', {
  GetUsers: '/api/v2/users', // Changed path
  GetUser: '/api/v2/users/:id', // Changed path
  CreateUser: '/api/v2/users', // Changed path
  UpdateUser: '/api/v2/users/:id', // New
  DeleteUser: '/api/v2/users/:id', // New
} as const);

const apiDiff = enumDiff(ApiV1Endpoints, ApiV2Endpoints);

console.log('API changes from V1 to V2:');
console.log(`  - ${apiDiff.differentValues.length} endpoints changed paths`);
console.log(`  - ${apiDiff.onlyInSecond.length} new endpoints added`);
console.log(`  - ${apiDiff.onlyInFirst.length} endpoints removed`);

// =============================================================================
// Detailed Diff Output
// =============================================================================

console.log('\n=== Detailed Diff Output ===');

function printDetailedDiff(
  name: string,
  enum1: Parameters<typeof enumDiff>[0],
  enum2: Parameters<typeof enumDiff>[1]
): void {
  const result = enumDiff(enum1, enum2);

  console.log(`\n${name}:`);
  console.log('  Only in first:', JSON.stringify(result.onlyInFirst));
  console.log('  Only in second:', JSON.stringify(result.onlyInSecond));
  console.log('  Different values:', JSON.stringify(result.differentValues));
  console.log('  Same values:', result.sameValues.map((s) => s.key).join(', '));
}

printDetailedDiff('Status V1 vs V2', StatusV1, StatusV2);

console.log('\n✅ Example completed successfully!');
