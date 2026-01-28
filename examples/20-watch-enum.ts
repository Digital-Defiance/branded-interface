/**
 * Example 20: Watch Enum (Development Tooling)
 *
 * This example demonstrates enum access monitoring:
 * - watchEnum: Monitor access to a specific enum
 * - watchAllEnums: Global monitoring
 * - Use cases: debugging, usage tracking, performance monitoring
 *
 * NOTE: This feature is intended for development/debugging purposes
 * Run: npx ts-node examples/20-watch-enum.ts
 */

import {
  createBrandedEnum,
  watchEnum,
  watchAllEnums,
  clearAllEnumWatchers,
  getEnumWatcherCount,
  getGlobalWatcherCount,
  EnumAccessEvent,
} from '../src/index.js';

// Clean up any existing watchers from previous runs
clearAllEnumWatchers();

// =============================================================================
// Basic Enum Watching
// =============================================================================

console.log('=== Basic Enum Watching ===');

const Status = createBrandedEnum('ex20-status', {
  Active: 'active',
  Inactive: 'inactive',
  Pending: 'pending',
} as const);

// Create a watched version of the enum
const { watched: WatchedStatus, unwatch } = watchEnum(Status, (event) => {
  console.log(`[WATCH] ${event.enumId}.${event.key} = ${event.value}`);
});

// Access the watched enum - triggers callback
console.log('\nAccessing watched enum:');
const active = WatchedStatus.Active; // Logs: [WATCH] ex20-status.Active = active
const inactive = WatchedStatus.Inactive; // Logs: [WATCH] ex20-status.Inactive = inactive

console.log('Values:', active, inactive);

// Stop watching
unwatch();
console.log('\nAfter unwatch:');
const pending = WatchedStatus.Pending; // No log - watcher removed
console.log('Pending (no log):', pending);

// =============================================================================
// Access Event Details
// =============================================================================

console.log('\n=== Access Event Details ===');

const Priority = createBrandedEnum('ex20-priority', {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
} as const);

const events: EnumAccessEvent[] = [];

const { watched: WatchedPriority, unwatch: unwatchPriority } = watchEnum(Priority, (event) => {
  events.push(event);
});

// Generate some access events
WatchedPriority.Low;
WatchedPriority.High;
'Medium' in WatchedPriority; // 'has' access type
Object.keys(WatchedPriority); // 'keys' access type

unwatchPriority();

console.log('Captured events:');
events.forEach((event, i) => {
  console.log(`  ${i + 1}. Type: ${event.accessType}, Key: ${event.key ?? 'N/A'}, Value: ${event.value ?? 'N/A'}`);
});

// =============================================================================
// Use Case: Track Enum Usage
// =============================================================================

console.log('\n=== Use Case: Track Enum Usage ===');

const Category = createBrandedEnum('ex20-category', {
  Electronics: 'electronics',
  Clothing: 'clothing',
  Books: 'books',
  Food: 'food',
} as const);

const usageCount = new Map<string, number>();

const { watched: TrackedCategory, unwatch: unwatchCategory } = watchEnum(Category, (event) => {
  if (event.key) {
    const count = usageCount.get(event.key) || 0;
    usageCount.set(event.key, count + 1);
  }
});

// Simulate application usage
function processItem(category: string): void {
  // Just accessing the category
  console.log(`Processing: ${category}`);
}

processItem(TrackedCategory.Electronics);
processItem(TrackedCategory.Electronics);
processItem(TrackedCategory.Books);
processItem(TrackedCategory.Electronics);
processItem(TrackedCategory.Food);

unwatchCategory();

console.log('\nUsage statistics:');
usageCount.forEach((count, key) => {
  console.log(`  ${key}: ${count} accesses`);
});

// =============================================================================
// Use Case: Detect Unused Enum Values
// =============================================================================

console.log('\n=== Use Case: Detect Unused Values ===');

const Features = createBrandedEnum('ex20-features', {
  DarkMode: 'dark-mode',
  Notifications: 'notifications',
  Analytics: 'analytics',
  Export: 'export',
  Import: 'import',
} as const);

const usedKeys = new Set<string>();

const { watched: TrackedFeatures, unwatch: unwatchFeatures } = watchEnum(Features, (event) => {
  if (event.key && event.accessType === 'get') {
    usedKeys.add(event.key);
  }
});

// Simulate feature usage (not all features are used)
function checkFeature(feature: string): boolean {
  return feature === TrackedFeatures.DarkMode || feature === TrackedFeatures.Notifications;
}

checkFeature('dark-mode');
checkFeature('notifications');

unwatchFeatures();

// Find unused features
const allKeys = Object.keys(Features);
const unusedKeys = allKeys.filter((k) => !usedKeys.has(k));

console.log('Used features:', Array.from(usedKeys));
console.log('Unused features:', unusedKeys);

// =============================================================================
// Global Watching
// =============================================================================

console.log('\n=== Global Watching ===');

const globalEvents: EnumAccessEvent[] = [];

// Watch all enums globally
const unregisterGlobal = watchAllEnums((event) => {
  globalEvents.push(event);
});

// Create watched versions of multiple enums
const { watched: W1, unwatch: u1 } = watchEnum(Status, () => {});
const { watched: W2, unwatch: u2 } = watchEnum(Priority, () => {});

// Access both - global watcher sees all
W1.Active;
W2.High;
W1.Pending;

u1();
u2();
unregisterGlobal();

console.log('Global events captured:', globalEvents.length);
globalEvents.forEach((event) => {
  console.log(`  ${event.enumId}: ${event.key}`);
});

// =============================================================================
// Watcher Count
// =============================================================================

console.log('\n=== Watcher Count ===');

clearAllEnumWatchers();

const { unwatch: uw1 } = watchEnum(Status, () => {});
const { unwatch: uw2 } = watchEnum(Status, () => {});
const { unwatch: uw3 } = watchEnum(Priority, () => {});

console.log('Status watchers:', getEnumWatcherCount('ex20-status')); // 2
console.log('Priority watchers:', getEnumWatcherCount('ex20-priority')); // 1

const unregGlobal = watchAllEnums(() => {});
console.log('Global watchers:', getGlobalWatcherCount()); // 1

// Cleanup
uw1();
uw2();
uw3();
unregGlobal();

console.log('After cleanup:');
console.log('Status watchers:', getEnumWatcherCount('ex20-status')); // 0
console.log('Global watchers:', getGlobalWatcherCount()); // 0

// =============================================================================
// Use Case: Performance Monitoring
// =============================================================================

console.log('\n=== Use Case: Performance Monitoring ===');

const accessTimes: number[] = [];
let lastAccess = Date.now();

const { watched: PerfWatched, unwatch: unwatchPerf } = watchEnum(Status, (event) => {
  const now = event.timestamp;
  const delta = now - lastAccess;
  accessTimes.push(delta);
  lastAccess = now;
});

// Simulate rapid access
for (let i = 0; i < 5; i++) {
  PerfWatched.Active;
}

unwatchPerf();

console.log('Access time deltas (ms):', accessTimes.slice(1)); // Skip first (no previous)

// =============================================================================
// Best Practices
// =============================================================================

console.log('\n=== Best Practices ===');

console.log(`
1. Use watchEnum for development/debugging only
2. Always call unwatch() when done to prevent memory leaks
3. Use clearAllEnumWatchers() in test cleanup
4. Global watchers see events from all watched enums
5. The watched proxy behaves identically to the original enum
6. Consider performance impact in production code
`);

// Final cleanup
clearAllEnumWatchers();

console.log('\n✅ Example completed successfully!');
