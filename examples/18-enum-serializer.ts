/**
 * Example 18: Enum Serializer
 *
 * This example demonstrates custom serialization/deserialization:
 * - enumSerializer: Create serializer/deserializer pair
 * - Custom transforms for encoding/decoding
 * - Safe deserialization with result objects
 *
 * Run: npx ts-node examples/18-enum-serializer.ts
 */

import { createBrandedEnum, enumSerializer, BrandedEnumValue } from '../src/index.js';

// =============================================================================
// Basic Serializer
// =============================================================================

console.log('=== Basic Serializer ===');

const Status = createBrandedEnum('ex18-status', {
  Active: 'active',
  Inactive: 'inactive',
  Pending: 'pending',
} as const);

const basicSerializer = enumSerializer(Status);

// Serialize
console.log('Serialize Active:', basicSerializer.serialize(Status.Active)); // 'active'
console.log('Serialize Pending:', basicSerializer.serialize(Status.Pending)); // 'pending'

// Deserialize (returns result object)
const successResult = basicSerializer.deserialize('active');
console.log('\nDeserialize success:', successResult);
// { success: true, value: 'active' }

const failResult = basicSerializer.deserialize('invalid');
console.log('Deserialize fail:', failResult);
// { success: false, error: { message: '...', ... } }

// =============================================================================
// Serializer with Prefix Transform
// =============================================================================

console.log('\n=== Serializer with Prefix Transform ===');

const Priority = createBrandedEnum('ex18-priority', {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
} as const);

// Add prefix during serialization, remove during deserialization
const prefixedSerializer = enumSerializer(Priority, {
  serialize: (value) => `priority:${value}`,
  deserialize: (value) => value.replace('priority:', ''),
});

// Serialize adds prefix
console.log('Serialize Low:', prefixedSerializer.serialize(Priority.Low));
// 'priority:low'

console.log('Serialize High:', prefixedSerializer.serialize(Priority.High));
// 'priority:high'

// Deserialize removes prefix and validates
const prefixResult = prefixedSerializer.deserialize('priority:medium');
console.log('Deserialize prefixed:', prefixResult);
// { success: true, value: 'medium' }

// =============================================================================
// Case-Insensitive Deserialization
// =============================================================================

console.log('\n=== Case-Insensitive Deserialization ===');

const caseInsensitiveSerializer = enumSerializer(Status, {
  deserialize: (value) => value.toLowerCase(),
});

// All these work
console.log("Deserialize 'ACTIVE':", caseInsensitiveSerializer.deserialize('ACTIVE'));
console.log("Deserialize 'Active':", caseInsensitiveSerializer.deserialize('Active'));
console.log("Deserialize 'active':", caseInsensitiveSerializer.deserialize('active'));

// =============================================================================
// Base64 Encoding
// =============================================================================

console.log('\n=== Base64 Encoding ===');

const Secret = createBrandedEnum('ex18-secret', {
  Token: 'token',
  Key: 'key',
  Password: 'password',
} as const);

const base64Serializer = enumSerializer(Secret, {
  serialize: (value) => Buffer.from(value).toString('base64'),
  deserialize: (value) => Buffer.from(value, 'base64').toString('utf-8'),
});

// Serialize to base64
const encoded = base64Serializer.serialize(Secret.Token);
console.log('Encoded Token:', encoded); // 'dG9rZW4='

// Deserialize from base64
const decoded = base64Serializer.deserialize(encoded);
console.log('Decoded:', decoded);
// { success: true, value: 'token' }

// =============================================================================
// deserializeOrThrow: Throwing Alternative
// =============================================================================

console.log('\n=== deserializeOrThrow ===');

// When you want exceptions instead of result objects
try {
  const value = basicSerializer.deserializeOrThrow('active');
  console.log('deserializeOrThrow success:', value); // 'active'
} catch (error) {
  console.log('Error:', (error as Error).message);
}

try {
  basicSerializer.deserializeOrThrow('invalid');
} catch (error) {
  console.log('deserializeOrThrow error:', (error as Error).message);
}

// =============================================================================
// Use Case: Database Storage
// =============================================================================

console.log('\n=== Use Case: Database Storage ===');

const OrderStatus = createBrandedEnum('ex18-order-status', {
  Created: 'created',
  Processing: 'processing',
  Shipped: 'shipped',
  Delivered: 'delivered',
} as const);

type OrderStatusValue = BrandedEnumValue<typeof OrderStatus>;

// Store with a prefix for namespacing in the database
const dbSerializer = enumSerializer(OrderStatus, {
  serialize: (value) => `order_status:${value}`,
  deserialize: (value) => value.replace('order_status:', ''),
});

// Simulate database operations
function saveToDb(status: OrderStatusValue): string {
  const serialized = dbSerializer.serialize(status);
  console.log(`Saving to DB: ${serialized}`);
  return serialized;
}

function loadFromDb(dbValue: string): OrderStatusValue | null {
  const result = dbSerializer.deserialize(dbValue);
  if (result.success) {
    console.log(`Loaded from DB: ${result.value}`);
    return result.value;
  }
  console.log(`Failed to load: ${result.error.message}`);
  return null;
}

const saved = saveToDb(OrderStatus.Shipped);
loadFromDb(saved);
loadFromDb('order_status:invalid');

// =============================================================================
// Use Case: API Communication
// =============================================================================

console.log('\n=== Use Case: API Communication ===');

const ApiStatus = createBrandedEnum('ex18-api-status', {
  Success: 'success',
  Error: 'error',
  Pending: 'pending',
} as const);

type ApiStatusValue = BrandedEnumValue<typeof ApiStatus>;

// API uses uppercase, internal uses lowercase
const apiSerializer = enumSerializer(ApiStatus, {
  serialize: (value) => value.toUpperCase(),
  deserialize: (value) => value.toLowerCase(),
});

// Sending to API
function sendToApi(status: ApiStatusValue): void {
  const apiValue = apiSerializer.serialize(status);
  console.log(`Sending to API: ${apiValue}`); // 'SUCCESS', 'ERROR', etc.
}

// Receiving from API
function receiveFromApi(apiResponse: string): ApiStatusValue | null {
  const result = apiSerializer.deserialize(apiResponse);
  if (result.success) {
    console.log(`Received from API: ${result.value}`);
    return result.value;
  }
  return null;
}

sendToApi(ApiStatus.Success);
receiveFromApi('PENDING');
receiveFromApi('UNKNOWN');

// =============================================================================
// Use Case: URL-Safe Encoding
// =============================================================================

console.log('\n=== Use Case: URL-Safe Encoding ===');

const Category = createBrandedEnum('ex18-category', {
  Electronics: 'electronics',
  HomeAndGarden: 'home-and-garden',
  SportsOutdoors: 'sports-outdoors',
} as const);

const urlSerializer = enumSerializer(Category, {
  serialize: (value) => encodeURIComponent(value),
  deserialize: (value) => decodeURIComponent(value),
});

console.log('URL-encoded:', urlSerializer.serialize(Category.HomeAndGarden));
console.log('URL-decoded:', urlSerializer.deserialize('home-and-garden'));

// =============================================================================
// Error Handling in Transforms
// =============================================================================

console.log('\n=== Error Handling in Transforms ===');

const errorProneSerializer = enumSerializer(Status, {
  deserialize: (value) => {
    if (value.startsWith('error:')) {
      throw new Error('Invalid prefix');
    }
    return value;
  },
});

// Transform error is caught and returned in result
const errorResult = errorProneSerializer.deserialize('error:test');
console.log('Transform error result:', errorResult);
// { success: false, error: { message: 'Deserialize transform failed: Invalid prefix', ... } }

// =============================================================================
// Serializer Properties
// =============================================================================

console.log('\n=== Serializer Properties ===');

console.log('Serializer enumObj:', basicSerializer.enumObj === Status);
console.log('Serializer enumId:', basicSerializer.enumId);

console.log('\n✅ Example completed successfully!');
