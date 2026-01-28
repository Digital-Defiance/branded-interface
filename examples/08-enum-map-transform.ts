/**
 * Example 08: Enum Map Transform
 *
 * This example demonstrates transforming enum values:
 * - enumMap: Apply a transformation function to all values
 * - Common use cases: prefixing, suffixing, case transformation
 *
 * Run: npx ts-node examples/08-enum-map-transform.ts
 */

import { createBrandedEnum, enumMap, getEnumId, getEnumValues } from '../src/index.js';

// =============================================================================
// Source Enum
// =============================================================================

const Status = createBrandedEnum('ex08-status', {
  Active: 'active',
  Inactive: 'inactive',
  Pending: 'pending',
  Archived: 'archived',
} as const);

console.log('=== Source Enum ===');
console.log('Original values:', getEnumValues(Status));

// =============================================================================
// Prefix Transformation
// =============================================================================

console.log('\n=== Prefix Transformation ===');

// Add a namespace prefix to all values
const NamespacedStatus = enumMap('ex08-namespaced-status', Status, (value) => `app.${value}`);

console.log('Namespaced values:', getEnumValues(NamespacedStatus));
// ['app.active', 'app.inactive', 'app.pending', 'app.archived']

console.log('NamespacedStatus.Active:', NamespacedStatus.Active); // 'app.active'
console.log('NamespacedStatus.Pending:', NamespacedStatus.Pending); // 'app.pending'

// =============================================================================
// Suffix Transformation
// =============================================================================

console.log('\n=== Suffix Transformation ===');

// Add a version suffix
const VersionedStatus = enumMap('ex08-versioned-status', Status, (value) => `${value}_v2`);

console.log('Versioned values:', getEnumValues(VersionedStatus));
// ['active_v2', 'inactive_v2', 'pending_v2', 'archived_v2']

// =============================================================================
// Case Transformation
// =============================================================================

console.log('\n=== Case Transformation ===');

// Uppercase all values
const UpperStatus = enumMap('ex08-upper-status', Status, (value) => value.toUpperCase());

console.log('Uppercase values:', getEnumValues(UpperStatus));
// ['ACTIVE', 'INACTIVE', 'PENDING', 'ARCHIVED']

// Snake_case transformation
const SnakeStatus = enumMap('ex08-snake-status', Status, (value) =>
  value.replace(/([A-Z])/g, '_$1').toLowerCase()
);

console.log('Snake case values:', getEnumValues(SnakeStatus));

// =============================================================================
// Using Key Context
// =============================================================================

console.log('\n=== Using Key Context ===');

// The mapper function receives both value and key
const VerboseStatus = enumMap(
  'ex08-verbose-status',
  Status,
  (value, key) => `${key.toLowerCase()}: ${value}`
);

console.log('Verbose values:', getEnumValues(VerboseStatus));
// ['active: active', 'inactive: inactive', 'pending: pending', 'archived: archived']

// Create display-friendly values
const DisplayStatus = enumMap('ex08-display-status', Status, (_value, key) =>
  key.replace(/([A-Z])/g, ' $1').trim()
);

console.log('Display values:', getEnumValues(DisplayStatus));
// ['Active', 'Inactive', 'Pending', 'Archived']

// =============================================================================
// Use Case: i18n Key Generation
// =============================================================================

console.log('\n=== Use Case: i18n Key Generation ===');

const ButtonLabels = createBrandedEnum('ex08-button-labels', {
  Submit: 'submit',
  Cancel: 'cancel',
  Save: 'save',
  Delete: 'delete',
} as const);

// Generate i18n keys with a specific format
const I18nKeys = enumMap('ex08-i18n-keys', ButtonLabels, (value) => `buttons.${value}.label`);

console.log('i18n keys:', getEnumValues(I18nKeys));
// ['buttons.submit.label', 'buttons.cancel.label', 'buttons.save.label', 'buttons.delete.label']

// =============================================================================
// Use Case: CSS Class Generation
// =============================================================================

console.log('\n=== Use Case: CSS Class Generation ===');

const Sizes = createBrandedEnum('ex08-sizes', {
  Small: 'sm',
  Medium: 'md',
  Large: 'lg',
  ExtraLarge: 'xl',
} as const);

// Generate BEM-style CSS classes
const SizeClasses = enumMap('ex08-size-classes', Sizes, (value) => `btn--size-${value}`);

console.log('CSS classes:', getEnumValues(SizeClasses));
// ['btn--size-sm', 'btn--size-md', 'btn--size-lg', 'btn--size-xl']

// =============================================================================
// Use Case: URL Path Generation
// =============================================================================

console.log('\n=== Use Case: URL Path Generation ===');

const Routes = createBrandedEnum('ex08-routes', {
  Home: 'home',
  About: 'about',
  Contact: 'contact',
  Products: 'products',
} as const);

// Generate full URL paths
const RoutePaths = enumMap('ex08-route-paths', Routes, (value) => `/app/${value}`);

console.log('Route paths:', getEnumValues(RoutePaths));
// ['/app/home', '/app/about', '/app/contact', '/app/products']

// =============================================================================
// Chaining Transformations
// =============================================================================

console.log('\n=== Chaining Transformations ===');

// First transform: add prefix
const Step1 = enumMap('ex08-step1', Status, (value) => `status.${value}`);

// Second transform: uppercase
const Step2 = enumMap('ex08-step2', Step1, (value) => value.toUpperCase());

console.log('After step 1:', getEnumValues(Step1));
console.log('After step 2:', getEnumValues(Step2));
// ['STATUS.ACTIVE', 'STATUS.INACTIVE', 'STATUS.PENDING', 'STATUS.ARCHIVED']

// =============================================================================
// Error Handling
// =============================================================================

console.log('\n=== Error Handling ===');

// Mapper must return a string
try {
  enumMap('ex08-invalid-mapper', Status, () => 123 as unknown as string);
} catch (error) {
  console.log('Mapper error:', (error as Error).message);
  // 'enumMap mapper must return a string'
}

console.log('\n✅ Example completed successfully!');
