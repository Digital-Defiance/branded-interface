/**
 * Example 12: Parse Enum with Default
 *
 * This example demonstrates safe parsing with defaults:
 * - parseEnum: Returns value if valid, default otherwise
 * - Non-throwing alternative to assertFromEnum
 *
 * Run: npx ts-node examples/12-parse-enum.ts
 */

import { createBrandedEnum, parseEnum, isFromEnum } from '../src/index.js';

// =============================================================================
// Basic Usage
// =============================================================================

console.log('=== Basic Usage ===');

const Status = createBrandedEnum('ex12-status', {
  Active: 'active',
  Inactive: 'inactive',
  Pending: 'pending',
} as const);

// Valid value returns as-is
const validResult = parseEnum('active', Status, Status.Pending);
console.log("parseEnum('active', Status, default):", validResult); // 'active'

// Invalid value returns default
const invalidResult = parseEnum('unknown', Status, Status.Pending);
console.log("parseEnum('unknown', Status, default):", invalidResult); // 'pending'

// Non-string value returns default
const nonStringResult = parseEnum(123, Status, Status.Inactive);
console.log('parseEnum(123, Status, default):', nonStringResult); // 'inactive'

// Null/undefined returns default
const nullResult = parseEnum(null, Status, Status.Active);
console.log('parseEnum(null, Status, default):', nullResult); // 'active'

// =============================================================================
// BEFORE/AFTER: Manual Validation vs parseEnum
// =============================================================================

console.log('\n=== Before/After Comparison ===');

// BEFORE: Manual validation with try/catch or conditionals
function getStatusManual(input: unknown): string {
  if (typeof input === 'string' && isFromEnum(input, Status)) {
    return input;
  }
  return Status.Pending; // Default
}

// AFTER: Using parseEnum (one-liner)
function getStatusSimple(input: unknown): (typeof Status)[keyof typeof Status] {
  return parseEnum(input, Status, Status.Pending);
}

console.log("Manual('active'):", getStatusManual('active'));
console.log("Simple('active'):", getStatusSimple('active'));
console.log("Manual('invalid'):", getStatusManual('invalid'));
console.log("Simple('invalid'):", getStatusSimple('invalid'));

// =============================================================================
// Use Case: User Input Handling
// =============================================================================

console.log('\n=== Use Case: User Input Handling ===');

const Theme = createBrandedEnum('ex12-theme', {
  Light: 'light',
  Dark: 'dark',
  System: 'system',
} as const);

function getUserTheme(userPreference: unknown): (typeof Theme)[keyof typeof Theme] {
  // If user hasn't set a preference or it's invalid, default to System
  return parseEnum(userPreference, Theme, Theme.System);
}

console.log("User preference 'dark':", getUserTheme('dark')); // 'dark'
console.log('User preference undefined:', getUserTheme(undefined)); // 'system'
console.log("User preference 'invalid':", getUserTheme('invalid')); // 'system'

// =============================================================================
// Use Case: API Response Handling
// =============================================================================

console.log('\n=== Use Case: API Response Handling ===');

const OrderStatus = createBrandedEnum('ex12-order-status', {
  Pending: 'pending',
  Processing: 'processing',
  Shipped: 'shipped',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
} as const);

interface ApiOrder {
  id: string;
  status?: string; // API might return undefined or invalid status
}

function processOrder(order: ApiOrder): void {
  // Safely parse status with a sensible default
  const status = parseEnum(order.status, OrderStatus, OrderStatus.Pending);

  console.log(`Order ${order.id}: ${status}`);
}

processOrder({ id: '001', status: 'shipped' }); // 'shipped'
processOrder({ id: '002', status: undefined }); // 'pending' (default)
processOrder({ id: '003', status: 'invalid_status' }); // 'pending' (default)

// =============================================================================
// Use Case: Configuration with Fallbacks
// =============================================================================

console.log('\n=== Use Case: Configuration with Fallbacks ===');

const LogLevel = createBrandedEnum('ex12-log-level', {
  Debug: 'debug',
  Info: 'info',
  Warn: 'warn',
  Error: 'error',
} as const);

// Simulate reading from environment or config file
function getLogLevel(envValue: unknown): (typeof LogLevel)[keyof typeof LogLevel] {
  return parseEnum(envValue, LogLevel, LogLevel.Info);
}

// Simulate different environment configurations
const configs = [
  { name: 'Production', LOG_LEVEL: 'error' },
  { name: 'Development', LOG_LEVEL: 'debug' },
  { name: 'Staging', LOG_LEVEL: undefined },
  { name: 'Invalid', LOG_LEVEL: 'verbose' }, // Not a valid level
];

configs.forEach((config) => {
  const level = getLogLevel(config.LOG_LEVEL);
  console.log(`${config.name} log level: ${level}`);
});

// =============================================================================
// Use Case: Form Data Processing
// =============================================================================

console.log('\n=== Use Case: Form Data Processing ===');

const Priority = createBrandedEnum('ex12-priority', {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  Critical: 'critical',
} as const);

interface FormData {
  title: string;
  priority?: string;
}

function createTask(formData: FormData): { title: string; priority: string } {
  return {
    title: formData.title,
    // Default to Medium if priority is missing or invalid
    priority: parseEnum(formData.priority, Priority, Priority.Medium),
  };
}

console.log(createTask({ title: 'Task 1', priority: 'high' }));
// { title: 'Task 1', priority: 'high' }

console.log(createTask({ title: 'Task 2' }));
// { title: 'Task 2', priority: 'medium' }

console.log(createTask({ title: 'Task 3', priority: 'urgent' }));
// { title: 'Task 3', priority: 'medium' } (invalid -> default)

// =============================================================================
// Use Case: LocalStorage/SessionStorage
// =============================================================================

console.log('\n=== Use Case: Storage Retrieval ===');

// Simulate localStorage.getItem (returns string | null)
function mockGetItem(key: string): string | null {
  const storage: Record<string, string> = {
    theme: 'dark',
    language: 'invalid_lang',
  };
  return storage[key] ?? null;
}

const Language = createBrandedEnum('ex12-language', {
  English: 'en',
  Spanish: 'es',
  French: 'fr',
} as const);

function getStoredLanguage(): (typeof Language)[keyof typeof Language] {
  const stored = mockGetItem('language');
  return parseEnum(stored, Language, Language.English);
}

function getStoredTheme(): (typeof Theme)[keyof typeof Theme] {
  const stored = mockGetItem('theme');
  return parseEnum(stored, Theme, Theme.System);
}

console.log('Stored theme:', getStoredTheme()); // 'dark'
console.log('Stored language:', getStoredLanguage()); // 'en' (invalid -> default)

// =============================================================================
// Chaining parseEnum
// =============================================================================

console.log('\n=== Chaining parseEnum ===');

// You can chain parseEnum for fallback hierarchies
function getEffectiveTheme(
  userPref: unknown,
  systemPref: unknown
): (typeof Theme)[keyof typeof Theme] {
  // Try user preference first
  if (isFromEnum(userPref, Theme)) {
    return userPref;
  }

  // Then try system preference, with Light as final fallback
  return parseEnum(systemPref, Theme, Theme.Light);
}

console.log("User: 'dark', System: 'light':", getEffectiveTheme('dark', 'light')); // 'dark'
console.log("User: null, System: 'dark':", getEffectiveTheme(null, 'dark')); // 'dark'
console.log('User: null, System: null:', getEffectiveTheme(null, null)); // 'light'

console.log('\n✅ Example completed successfully!');
