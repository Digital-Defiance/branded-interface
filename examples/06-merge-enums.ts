/**
 * Example 06: Merge Enums
 *
 * This example demonstrates enum composition with mergeEnums:
 * - Combining multiple enums into one
 * - Handling duplicate values (allowed)
 * - Handling duplicate keys (throws error)
 *
 * Run: npx ts-node examples/06-merge-enums.ts
 */

import {
  createBrandedEnum,
  mergeEnums,
  getEnumId,
  getEnumValues,
  isFromEnum,
  findEnumSources,
} from '../src/index.js';

// =============================================================================
// Basic Merge: Combining Related Enums
// =============================================================================

console.log('=== Basic Merge ===');

const HttpSuccess = createBrandedEnum('ex06-http-success', {
  OK: '200',
  Created: '201',
  Accepted: '202',
} as const);

const HttpClientError = createBrandedEnum('ex06-http-client-error', {
  BadRequest: '400',
  Unauthorized: '401',
  NotFound: '404',
} as const);

const HttpServerError = createBrandedEnum('ex06-http-server-error', {
  InternalError: '500',
  BadGateway: '502',
  ServiceUnavailable: '503',
} as const);

// Merge all HTTP status codes into one enum
const AllHttpCodes = mergeEnums(
  'ex06-all-http-codes',
  HttpSuccess,
  HttpClientError,
  HttpServerError
);

console.log('Merged enum ID:', getEnumId(AllHttpCodes));
console.log('All values:', getEnumValues(AllHttpCodes));
console.log('Total codes:', getEnumValues(AllHttpCodes)?.length);

// Access values from the merged enum
console.log('\nAccessing merged values:');
console.log('AllHttpCodes.OK:', AllHttpCodes.OK); // '200'
console.log('AllHttpCodes.NotFound:', AllHttpCodes.NotFound); // '404'
console.log('AllHttpCodes.InternalError:', AllHttpCodes.InternalError); // '500'

// =============================================================================
// Type Guards with Merged Enums
// =============================================================================

console.log('\n=== Type Guards with Merged Enums ===');

function handleHttpCode(code: string): void {
  // Check against specific category
  if (isFromEnum(code, HttpSuccess)) {
    console.log(`Success: ${code}`);
  } else if (isFromEnum(code, HttpClientError)) {
    console.log(`Client Error: ${code}`);
  } else if (isFromEnum(code, HttpServerError)) {
    console.log(`Server Error: ${code}`);
  } else if (isFromEnum(code, AllHttpCodes)) {
    console.log(`Known HTTP code: ${code}`);
  } else {
    console.log(`Unknown code: ${code}`);
  }
}

handleHttpCode('200'); // Success
handleHttpCode('404'); // Client Error
handleHttpCode('500'); // Server Error
handleHttpCode('999'); // Unknown

// =============================================================================
// Duplicate Values: Allowed
// =============================================================================

console.log('\n=== Duplicate Values (Allowed) ===');

const StatusA = createBrandedEnum('ex06-status-a', {
  Active: 'active',
  Pending: 'pending',
} as const);

const StatusB = createBrandedEnum('ex06-status-b', {
  Enabled: 'active', // Same VALUE as StatusA.Active
  Waiting: 'waiting',
} as const);

// Merging enums with duplicate VALUES is allowed
const MergedStatus = mergeEnums('ex06-merged-status', StatusA, StatusB);

console.log('Merged successfully despite duplicate values');
console.log('MergedStatus.Active:', MergedStatus.Active); // 'active'
console.log('MergedStatus.Enabled:', MergedStatus.Enabled); // 'active' (same value)

// Both keys map to the same value
console.log("findEnumSources('active'):", findEnumSources('active'));
// Includes both original enums AND the merged enum

// =============================================================================
// Duplicate Keys: Throws Error
// =============================================================================

console.log('\n=== Duplicate Keys (Throws Error) ===');

const EnumWithKeyA = createBrandedEnum('ex06-key-a', {
  Shared: 'value-a',
  UniqueA: 'unique-a',
} as const);

const EnumWithKeyB = createBrandedEnum('ex06-key-b', {
  Shared: 'value-b', // Same KEY as EnumWithKeyA
  UniqueB: 'unique-b',
} as const);

try {
  // This will throw because 'Shared' key exists in both enums
  mergeEnums('ex06-will-fail', EnumWithKeyA, EnumWithKeyB);
} catch (error) {
  console.log('Expected error:', (error as Error).message);
  // 'Cannot merge enums: duplicate key "Shared" found in enums "ex06-key-a" and "ex06-key-b"'
}

// =============================================================================
// Use Case: Plugin System Events
// =============================================================================

console.log('\n=== Use Case: Plugin System ===');

const CoreEvents = createBrandedEnum('ex06-core-events', {
  AppInit: 'app:init',
  AppReady: 'app:ready',
  AppShutdown: 'app:shutdown',
} as const);

const AuthEvents = createBrandedEnum('ex06-auth-events', {
  UserLogin: 'auth:login',
  UserLogout: 'auth:logout',
  SessionExpired: 'auth:session-expired',
} as const);

const DataEvents = createBrandedEnum('ex06-data-events', {
  DataLoaded: 'data:loaded',
  DataSaved: 'data:saved',
  DataError: 'data:error',
} as const);

// Create a combined event enum for the event bus
const AllEvents = mergeEnums('ex06-all-events', CoreEvents, AuthEvents, DataEvents);

console.log('Event system initialized with', getEnumValues(AllEvents)?.length, 'events');

// Event handler can check event categories
function handleEvent(event: string): void {
  if (isFromEnum(event, CoreEvents)) {
    console.log(`[CORE] ${event}`);
  } else if (isFromEnum(event, AuthEvents)) {
    console.log(`[AUTH] ${event}`);
  } else if (isFromEnum(event, DataEvents)) {
    console.log(`[DATA] ${event}`);
  }
}

handleEvent(AllEvents.AppInit);
handleEvent(AllEvents.UserLogin);
handleEvent(AllEvents.DataLoaded);

// =============================================================================
// Best Practice: Merge Order Doesn't Matter
// =============================================================================

console.log('\n=== Merge Order ===');

// The order of enums in mergeEnums doesn't affect the result
// (as long as there are no key conflicts)

const MergeABC = mergeEnums('ex06-abc', HttpSuccess, HttpClientError, HttpServerError);
// Same result as merging in different order

console.log('Merge order does not affect the result');
console.log('Keys are collected from all source enums');

console.log('\n✅ Example completed successfully!');
