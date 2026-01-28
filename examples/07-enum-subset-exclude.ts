/**
 * Example 07: Enum Subset and Exclude
 *
 * This example demonstrates deriving new enums:
 * - enumSubset: Select specific keys
 * - enumExclude: Remove specific keys
 *
 * Run: npx ts-node examples/07-enum-subset-exclude.ts
 */

import {
  createBrandedEnum,
  enumSubset,
  enumExclude,
  getEnumId,
  getEnumValues,
  isFromEnum,
} from '../src/index.js';

// =============================================================================
// Source Enum
// =============================================================================

const AllPermissions = createBrandedEnum('ex07-all-permissions', {
  Read: 'read',
  Write: 'write',
  Delete: 'delete',
  Admin: 'admin',
  SuperAdmin: 'super-admin',
  Audit: 'audit',
  Export: 'export',
  Import: 'import',
} as const);

console.log('=== Source Enum ===');
console.log('All permissions:', getEnumValues(AllPermissions));

// =============================================================================
// enumSubset: Select Specific Keys
// =============================================================================

console.log('\n=== enumSubset ===');

// Create a subset for basic users
const BasicPermissions = enumSubset('ex07-basic-permissions', AllPermissions, [
  'Read',
  'Write',
]);

console.log('Basic permissions ID:', getEnumId(BasicPermissions));
console.log('Basic permissions:', getEnumValues(BasicPermissions));
// ['read', 'write']

// Create a subset for admin users
const AdminPermissions = enumSubset('ex07-admin-permissions', AllPermissions, [
  'Read',
  'Write',
  'Delete',
  'Admin',
]);

console.log('Admin permissions:', getEnumValues(AdminPermissions));
// ['read', 'write', 'delete', 'admin']

// Access values from subset
console.log('\nAccessing subset values:');
console.log('BasicPermissions.Read:', BasicPermissions.Read); // 'read'
console.log('BasicPermissions.Write:', BasicPermissions.Write); // 'write'
// BasicPermissions.Delete would be a TypeScript error - not in subset

// =============================================================================
// enumExclude: Remove Specific Keys
// =============================================================================

console.log('\n=== enumExclude ===');

// Create an enum without dangerous permissions
const SafePermissions = enumExclude('ex07-safe-permissions', AllPermissions, [
  'Delete',
  'Admin',
  'SuperAdmin',
]);

console.log('Safe permissions ID:', getEnumId(SafePermissions));
console.log('Safe permissions:', getEnumValues(SafePermissions));
// ['read', 'write', 'audit', 'export', 'import']

// Create an enum without audit-related permissions
const NonAuditPermissions = enumExclude('ex07-non-audit', AllPermissions, ['Audit']);

console.log('Non-audit permissions:', getEnumValues(NonAuditPermissions));

// =============================================================================
// Type Safety
// =============================================================================

console.log('\n=== Type Safety ===');

// TypeScript knows exactly which keys are in each derived enum
type BasicPermValue = (typeof BasicPermissions)[keyof typeof BasicPermissions];
// 'read' | 'write'

type SafePermValue = (typeof SafePermissions)[keyof typeof SafePermissions];
// 'read' | 'write' | 'audit' | 'export' | 'import'

function requireBasicPermission(perm: BasicPermValue): void {
  console.log(`Basic permission: ${perm}`);
}

requireBasicPermission(BasicPermissions.Read); // OK
requireBasicPermission('read'); // OK
// requireBasicPermission('delete'); // TypeScript error!

// =============================================================================
// Use Case: Role-Based Access Control
// =============================================================================

console.log('\n=== Use Case: Role-Based Access Control ===');

// Define permission sets for different roles
const GuestPermissions = enumSubset('ex07-guest', AllPermissions, ['Read']);

const UserPermissions = enumSubset('ex07-user', AllPermissions, ['Read', 'Write', 'Export']);

const ModeratorPermissions = enumSubset('ex07-moderator', AllPermissions, [
  'Read',
  'Write',
  'Delete',
  'Audit',
]);

const AdminOnlyPermissions = enumSubset('ex07-admin-only', AllPermissions, [
  'Admin',
  'SuperAdmin',
]);

function checkPermission(role: string, permission: string): boolean {
  switch (role) {
    case 'guest':
      return isFromEnum(permission, GuestPermissions);
    case 'user':
      return isFromEnum(permission, UserPermissions);
    case 'moderator':
      return isFromEnum(permission, ModeratorPermissions);
    case 'admin':
      return isFromEnum(permission, AllPermissions); // Admin has all
    default:
      return false;
  }
}

console.log("Guest can 'read':", checkPermission('guest', 'read')); // true
console.log("Guest can 'write':", checkPermission('guest', 'write')); // false
console.log("User can 'write':", checkPermission('user', 'write')); // true
console.log("User can 'delete':", checkPermission('user', 'delete')); // false
console.log("Moderator can 'delete':", checkPermission('moderator', 'delete')); // true

// =============================================================================
// Error Handling
// =============================================================================

console.log('\n=== Error Handling ===');

// Invalid key in subset
try {
  enumSubset('ex07-invalid-subset', AllPermissions, ['Read', 'NonExistent' as never]);
} catch (error) {
  console.log('Subset error:', (error as Error).message);
  // 'Key "NonExistent" does not exist in enum "ex07-all-permissions"'
}

// Empty subset
try {
  enumSubset('ex07-empty-subset', AllPermissions, []);
} catch (error) {
  console.log('Empty subset error:', (error as Error).message);
  // 'enumSubset requires at least one key'
}

// Excluding all keys
try {
  enumExclude('ex07-exclude-all', AllPermissions, [
    'Read',
    'Write',
    'Delete',
    'Admin',
    'SuperAdmin',
    'Audit',
    'Export',
    'Import',
  ]);
} catch (error) {
  console.log('Exclude all error:', (error as Error).message);
  // 'enumExclude: excluding all keys would result in an empty enum'
}

// =============================================================================
// Combining Subset and Exclude
// =============================================================================

console.log('\n=== Combining Operations ===');

// First exclude dangerous permissions, then create a subset
const DangerousExcluded = enumExclude('ex07-no-danger', AllPermissions, [
  'Delete',
  'Admin',
  'SuperAdmin',
]);

// Then create a subset of the safe permissions
const ReadOnlyFromSafe = enumSubset('ex07-readonly-safe', DangerousExcluded, ['Read']);

console.log('Read-only from safe:', getEnumValues(ReadOnlyFromSafe));
// ['read']

console.log('\n✅ Example completed successfully!');
