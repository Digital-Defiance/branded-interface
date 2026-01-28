/**
 * Example 21: Real-World Use Case - i18n Key Management
 *
 * This example demonstrates using branded enums for internationalization:
 * - Organizing translation keys by namespace
 * - Detecting key collisions across libraries
 * - Type-safe translation functions
 *
 * Run: npx ts-node examples/21-i18n-keys.ts
 */

import {
  createBrandedEnum,
  isFromEnum,
  findEnumSources,
  mergeEnums,
  enumIntersect,
  getEnumValues,
  BrandedEnumValue,
} from '../src/index.js';

// =============================================================================
// Define Translation Key Namespaces
// =============================================================================

console.log('=== Define Translation Key Namespaces ===');

// Common UI keys
const CommonKeys = createBrandedEnum('i18n-common', {
  Submit: 'common.submit',
  Cancel: 'common.cancel',
  Save: 'common.save',
  Delete: 'common.delete',
  Edit: 'common.edit',
  Close: 'common.close',
  Loading: 'common.loading',
  Error: 'common.error',
} as const);

// User-related keys
const UserKeys = createBrandedEnum('i18n-user', {
  Login: 'user.login',
  Logout: 'user.logout',
  Register: 'user.register',
  Profile: 'user.profile',
  Settings: 'user.settings',
  Welcome: 'user.welcome',
  Goodbye: 'user.goodbye',
} as const);

// Admin-related keys
const AdminKeys = createBrandedEnum('i18n-admin', {
  Dashboard: 'admin.dashboard',
  Users: 'admin.users',
  Settings: 'admin.settings', // Note: Different from user.settings
  Reports: 'admin.reports',
  Audit: 'admin.audit',
} as const);

// Error message keys
const ErrorKeys = createBrandedEnum('i18n-errors', {
  NotFound: 'errors.not_found',
  Unauthorized: 'errors.unauthorized',
  ServerError: 'errors.server_error',
  ValidationFailed: 'errors.validation_failed',
  NetworkError: 'errors.network_error',
} as const);

console.log('Common keys:', getEnumValues(CommonKeys)?.length);
console.log('User keys:', getEnumValues(UserKeys)?.length);
console.log('Admin keys:', getEnumValues(AdminKeys)?.length);
console.log('Error keys:', getEnumValues(ErrorKeys)?.length);

// =============================================================================
// Create Combined Key Set
// =============================================================================

console.log('\n=== Create Combined Key Set ===');

const AllKeys = mergeEnums('i18n-all', CommonKeys, UserKeys, AdminKeys, ErrorKeys);

console.log('Total translation keys:', getEnumValues(AllKeys)?.length);

// =============================================================================
// Mock Translation System
// =============================================================================

console.log('\n=== Mock Translation System ===');

// Simulated translations (in real app, loaded from JSON files)
const translations: Record<string, Record<string, string>> = {
  en: {
    'common.submit': 'Submit',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.loading': 'Loading...',
    'user.login': 'Log In',
    'user.logout': 'Log Out',
    'user.welcome': 'Welcome!',
    'admin.dashboard': 'Dashboard',
    'errors.not_found': 'Not Found',
    'errors.unauthorized': 'Unauthorized',
  },
  es: {
    'common.submit': 'Enviar',
    'common.cancel': 'Cancelar',
    'common.save': 'Guardar',
    'common.delete': 'Eliminar',
    'common.loading': 'Cargando...',
    'user.login': 'Iniciar Sesión',
    'user.logout': 'Cerrar Sesión',
    'user.welcome': '¡Bienvenido!',
    'admin.dashboard': 'Panel de Control',
    'errors.not_found': 'No Encontrado',
    'errors.unauthorized': 'No Autorizado',
  },
};

let currentLocale = 'en';

// Type-safe translation function
function t(key: BrandedEnumValue<typeof AllKeys>): string {
  const localeTranslations = translations[currentLocale];
  return localeTranslations?.[key] ?? key;
}

// Usage
console.log('English:');
console.log(`  ${CommonKeys.Submit}: ${t(CommonKeys.Submit)}`);
console.log(`  ${UserKeys.Welcome}: ${t(UserKeys.Welcome)}`);
console.log(`  ${ErrorKeys.NotFound}: ${t(ErrorKeys.NotFound)}`);

currentLocale = 'es';
console.log('\nSpanish:');
console.log(`  ${CommonKeys.Submit}: ${t(CommonKeys.Submit)}`);
console.log(`  ${UserKeys.Welcome}: ${t(UserKeys.Welcome)}`);
console.log(`  ${ErrorKeys.NotFound}: ${t(ErrorKeys.NotFound)}`);

// =============================================================================
// Detect Key Collisions
// =============================================================================

console.log('\n=== Detect Key Collisions ===');

// Simulate a third-party library with its own keys
const ThirdPartyKeys = createBrandedEnum('i18n-third-party', {
  Submit: 'submit', // Collision risk!
  Cancel: 'cancel', // Collision risk!
  CustomAction: 'third_party.custom',
} as const);

// Check for collisions
function checkForCollisions(): void {
  const allEnums = [CommonKeys, UserKeys, AdminKeys, ErrorKeys, ThirdPartyKeys];
  const collisions = enumIntersect(...allEnums);

  if (collisions.length > 0) {
    console.log('⚠️  Found i18n key collisions:');
    collisions.forEach((collision) => {
      console.log(`   "${collision.value}" in: ${collision.enumIds.join(', ')}`);
    });
  } else {
    console.log('✓ No i18n key collisions detected');
  }
}

checkForCollisions();

// =============================================================================
// Route Keys to Correct Handler
// =============================================================================

console.log('\n=== Route Keys to Correct Handler ===');

function getTranslationNamespace(key: string): string {
  if (isFromEnum(key, CommonKeys)) return 'common';
  if (isFromEnum(key, UserKeys)) return 'user';
  if (isFromEnum(key, AdminKeys)) return 'admin';
  if (isFromEnum(key, ErrorKeys)) return 'errors';
  return 'unknown';
}

const testKeys = [
  CommonKeys.Submit,
  UserKeys.Login,
  AdminKeys.Dashboard,
  ErrorKeys.NotFound,
  'unknown.key',
];

testKeys.forEach((key) => {
  console.log(`  "${key}" -> namespace: ${getTranslationNamespace(key)}`);
});

// =============================================================================
// Find Key Sources (Debugging)
// =============================================================================

console.log('\n=== Find Key Sources (Debugging) ===');

function debugKey(key: string): void {
  const sources = findEnumSources(key);
  if (sources.length === 0) {
    console.log(`  "${key}": Not found in any namespace`);
  } else if (sources.length === 1) {
    console.log(`  "${key}": Found in ${sources[0]}`);
  } else {
    console.log(`  "${key}": ⚠️  Found in multiple namespaces: ${sources.join(', ')}`);
  }
}

debugKey('common.submit');
debugKey('user.login');
debugKey('unknown.key');

// =============================================================================
// Generate Missing Translations Report
// =============================================================================

console.log('\n=== Missing Translations Report ===');

function findMissingTranslations(locale: string): string[] {
  const localeTranslations = translations[locale] ?? {};
  const allKeyValues = getEnumValues(AllKeys) ?? [];

  return allKeyValues.filter((key) => !(key in localeTranslations));
}

const missingEn = findMissingTranslations('en');
const missingEs = findMissingTranslations('es');

console.log(`Missing in 'en': ${missingEn.length} keys`);
if (missingEn.length > 0 && missingEn.length <= 5) {
  missingEn.forEach((key) => console.log(`  - ${key}`));
}

console.log(`Missing in 'es': ${missingEs.length} keys`);
if (missingEs.length > 0 && missingEs.length <= 5) {
  missingEs.forEach((key) => console.log(`  - ${key}`));
}

// =============================================================================
// Best Practices
// =============================================================================

console.log('\n=== Best Practices ===');

console.log(`
1. Use namespaced keys (e.g., 'user.login' not just 'login')
2. Group related keys into separate branded enums
3. Use mergeEnums to create a combined key set for the app
4. Use enumIntersect to detect collisions between libraries
5. Use isFromEnum to route keys to correct handlers
6. Use findEnumSources for debugging key conflicts
7. Generate missing translation reports using getEnumValues
`);

console.log('\n✅ Example completed successfully!');
