# @digitaldefiance/branded-enum

Runtime-identifiable enum-like types for TypeScript with zero runtime overhead.

## Why branded-enum?

Standard TypeScript enums are erased at compile time, making it impossible to determine which enum a string value originated from at runtime. This becomes problematic in large codebases with multiple libraries that may have overlapping string values.

**branded-enum** solves this by:

- Creating enum-like objects with embedded metadata for runtime identification
- Providing type guards to check if a value belongs to a specific enum
- Maintaining a global registry to track all branded enums across bundles
- Keeping values as raw strings for zero runtime overhead and serialization compatibility

## Installation

```bash
npm install @digitaldefiance/branded-enum
# or
yarn add @digitaldefiance/branded-enum
# or
pnpm add @digitaldefiance/branded-enum
```

## Quick Start

```typescript
import { createBrandedEnum, isFromEnum, getEnumId } from '@digitaldefiance/branded-enum';

// Create a branded enum (use `as const` for literal type inference)
const Status = createBrandedEnum('status', {
  Active: 'active',
  Inactive: 'inactive',
  Pending: 'pending',
} as const);

// Values are raw strings - no wrapper overhead
console.log(Status.Active); // 'active'

// Type guard with automatic type narrowing
function handleValue(value: unknown) {
  if (isFromEnum(value, Status)) {
    // value is narrowed to 'active' | 'inactive' | 'pending'
    console.log('Valid status:', value);
  }
}

// Runtime identification
console.log(getEnumId(Status)); // 'status'
```

## Features

### Runtime Identification

Unlike standard TypeScript enums, branded enums carry metadata that enables runtime identification:

```typescript
import { createBrandedEnum, findEnumSources, getEnumById } from '@digitaldefiance/branded-enum';

const Colors = createBrandedEnum('colors', { Red: 'red', Blue: 'blue' } as const);
const Sizes = createBrandedEnum('sizes', { Small: 'small', Large: 'large' } as const);

// Find which enums contain a value
findEnumSources('red'); // ['colors']

// Retrieve enum by ID
const retrieved = getEnumById('colors');
console.log(retrieved === Colors); // true
```

### Type Guards

Validate values at runtime with automatic TypeScript type narrowing:

```typescript
import { createBrandedEnum, isFromEnum, assertFromEnum } from '@digitaldefiance/branded-enum';

const Priority = createBrandedEnum('priority', {
  High: 'high',
  Medium: 'medium',
  Low: 'low',
} as const);

// Soft check - returns boolean
if (isFromEnum(userInput, Priority)) {
  // userInput is typed as 'high' | 'medium' | 'low'
}

// Hard check - throws on invalid value
const validated = assertFromEnum(userInput, Priority);
// Throws: 'Value "invalid" is not a member of enum "priority"'
```

### Serialization Compatible

Branded enums serialize cleanly to JSON - metadata is stored in non-enumerable Symbol properties:

```typescript
const Status = createBrandedEnum('status', { Active: 'active' } as const);

JSON.stringify(Status);
// '{"Active":"active"}' - no metadata pollution

Object.keys(Status);    // ['Active']
Object.values(Status);  // ['active']
```

### Cross-Bundle Registry

The global registry uses `globalThis`, ensuring all branded enums are tracked across different bundles, ESM/CJS modules, and even different instances of the library:

```typescript
import { getAllEnumIds, getEnumById } from '@digitaldefiance/branded-enum';

// List all registered enums
getAllEnumIds(); // ['status', 'colors', 'sizes', ...]

// Access any enum by ID
const enum = getEnumById('status');
```

### Enum Composition

Merge multiple enums into a new combined enum:

```typescript
import { createBrandedEnum, mergeEnums } from '@digitaldefiance/branded-enum';

const HttpSuccess = createBrandedEnum('http-success', {
  OK: '200',
  Created: '201',
} as const);

const HttpError = createBrandedEnum('http-error', {
  BadRequest: '400',
  NotFound: '404',
} as const);

const HttpCodes = mergeEnums('http-codes', HttpSuccess, HttpError);
// HttpCodes has: OK, Created, BadRequest, NotFound
```

## API Reference

### Factory

#### `createBrandedEnum(enumId, values)`

Creates a branded enum with runtime metadata.

```typescript
function createBrandedEnum<T extends Record<string, string>>(
  enumId: string,
  values: T
): BrandedEnum<T>
```

- **enumId**: Unique identifier for this enum
- **values**: Object with key-value pairs (use `as const` for literal types)
- **Returns**: Frozen branded enum object (returns existing enum if ID already registered)

### Type Guards

#### `isFromEnum(value, enumObj)`

Checks if a value belongs to a branded enum.

```typescript
function isFromEnum<E extends BrandedEnum<Record<string, string>>>(
  value: unknown,
  enumObj: E
): value is BrandedEnumValue<E>
```

- Returns `true` with type narrowing if value is in the enum
- Returns `false` for non-string values or non-branded enum objects

#### `assertFromEnum(value, enumObj)`

Asserts a value belongs to a branded enum, throwing if not.

```typescript
function assertFromEnum<E extends BrandedEnum<Record<string, string>>>(
  value: unknown,
  enumObj: E
): BrandedEnumValue<E>
```

- **Returns**: The value with narrowed type
- **Throws**: `Error` if value is not in the enum

### Metadata Accessors

#### `getEnumId(enumObj)`

Gets the enum ID from a branded enum.

```typescript
function getEnumId(enumObj: unknown): string | undefined
```

#### `getEnumValues(enumObj)`

Gets all values from a branded enum as an array.

```typescript
function getEnumValues<E extends BrandedEnum<Record<string, string>>>(
  enumObj: E
): BrandedEnumValue<E>[] | undefined
```

#### `enumSize(enumObj)`

Gets the number of values in a branded enum.

```typescript
function enumSize(enumObj: unknown): number | undefined
```

### Registry Functions

#### `getAllEnumIds()`

Returns an array of all registered enum IDs.

```typescript
function getAllEnumIds(): string[]
```

#### `getEnumById(enumId)`

Gets a branded enum by its ID.

```typescript
function getEnumById(enumId: string): BrandedEnum<Record<string, string>> | undefined
```

#### `findEnumSources(value)`

Finds all enum IDs that contain a given value.

```typescript
function findEnumSources(value: string): string[]
```

#### `resetRegistry()`

Resets the global branded enum registry, clearing all registered enums. **Warning:** This is intended for testing purposes only.

```typescript
function resetRegistry(): void
```

**Example (Jest/Vitest):**

```typescript
import { resetRegistry } from '@digitaldefiance/branded-enum';

beforeEach(() => {
  resetRegistry();
});
```

### Utility Functions

#### `hasValue(enumObj, value)`

Checks if a value exists in a branded enum (reverse lookup).

```typescript
function hasValue<E extends BrandedEnum<Record<string, string>>>(
  enumObj: E,
  value: unknown
): value is BrandedEnumValue<E>
```

#### `getKeyForValue(enumObj, value)`

Gets the key name for a value in a branded enum.

```typescript
function getKeyForValue<E extends BrandedEnum<Record<string, string>>>(
  enumObj: E,
  value: string
): keyof E | undefined
```

#### `isValidKey(enumObj, key)`

Checks if a key exists in a branded enum.

```typescript
function isValidKey<E extends BrandedEnum<Record<string, string>>>(
  enumObj: E,
  key: unknown
): key is keyof E
```

#### `enumEntries(enumObj)`

Returns an iterator of [key, value] pairs.

```typescript
function* enumEntries<E extends BrandedEnum<Record<string, string>>>(
  enumObj: E
): IterableIterator<[keyof E, BrandedEnumValue<E>]>
```

### Composition

#### `mergeEnums(newId, ...enums)`

Merges multiple branded enums into a new one.

```typescript
function mergeEnums<T extends readonly BrandedEnum<Record<string, string>>[]>(
  newId: string,
  ...enums: T
): BrandedEnum<Record<string, string>>
```

- **Throws**: `Error` if duplicate keys are found across enums
- Duplicate values are allowed (intentional overlaps)

## Types

```typescript
// The branded enum type
type BrandedEnum<T extends Record<string, string>> = Readonly<T> & BrandedEnumMetadata;

// Extract value union from a branded enum
type BrandedEnumValue<E extends BrandedEnum<Record<string, string>>> =
  E extends BrandedEnum<infer T> ? T[keyof T] : never;
```

## Use Cases

### i18n Key Management

```typescript
const UserMessages = createBrandedEnum('user-messages', {
  Welcome: 'user.welcome',
  Goodbye: 'user.goodbye',
} as const);

const AdminMessages = createBrandedEnum('admin-messages', {
  Welcome: 'admin.welcome', // Different value, same key name
} as const);

// Determine which translation namespace to use
function translate(key: string) {
  const sources = findEnumSources(key);
  if (sources.includes('user-messages')) {
    return userTranslations[key];
  }
  if (sources.includes('admin-messages')) {
    return adminTranslations[key];
  }
}
```

### API Response Validation

```typescript
const ApiStatus = createBrandedEnum('api-status', {
  Success: 'success',
  Error: 'error',
  Pending: 'pending',
} as const);

function handleResponse(response: { status: unknown }) {
  const status = assertFromEnum(response.status, ApiStatus);
  // status is typed as 'success' | 'error' | 'pending'
  
  switch (status) {
    case ApiStatus.Success:
      // TypeScript knows this is exhaustive
      break;
    case ApiStatus.Error:
      break;
    case ApiStatus.Pending:
      break;
  }
}
```

### Plugin Systems

```typescript
// Core events
const CoreEvents = createBrandedEnum('core-events', {
  Init: 'init',
  Ready: 'ready',
} as const);

// Plugin events
const PluginEvents = createBrandedEnum('plugin-events', {
  Load: 'plugin:load',
  Unload: 'plugin:unload',
} as const);

// Combined for the event bus
const AllEvents = mergeEnums('all-events', CoreEvents, PluginEvents);

function emit(event: string) {
  if (isFromEnum(event, CoreEvents)) {
    handleCoreEvent(event);
  } else if (isFromEnum(event, PluginEvents)) {
    handlePluginEvent(event);
  }
}
```

## Advanced Features

The library includes powerful advanced features for complex use cases.

### Decorators

Runtime validation decorators for class properties that enforce enum membership.

#### `@EnumValue` - Property Validation

```typescript
import { createBrandedEnum, EnumValue } from '@digitaldefiance/branded-enum';

const Status = createBrandedEnum('status', {
  Active: 'active',
  Inactive: 'inactive',
} as const);

class User {
  @EnumValue(Status)
  accessor status: string = Status.Active;
}

const user = new User();
user.status = Status.Active; // OK
user.status = 'invalid'; // Throws Error

// Optional and nullable support
class Config {
  @EnumValue(Status, { optional: true })
  accessor status: string | undefined;

  @EnumValue(Status, { nullable: true })
  accessor fallbackStatus: string | null = null;
}
```

#### `@EnumClass` - Usage Tracking

```typescript
import { createBrandedEnum, EnumClass, getEnumConsumers, getConsumedEnums } from '@digitaldefiance/branded-enum';

const Status = createBrandedEnum('status', { Active: 'active' } as const);
const Priority = createBrandedEnum('priority', { High: 'high' } as const);

@EnumClass(Status, Priority)
class Task {
  status = Status.Active;
  priority = Priority.High;
}

// Query enum usage
getEnumConsumers('status'); // ['Task']
getConsumedEnums('Task'); // ['status', 'priority']
```

### Enum Derivation

Create new enums from existing ones.

#### `enumSubset` - Select Keys

```typescript
import { createBrandedEnum, enumSubset } from '@digitaldefiance/branded-enum';

const AllColors = createBrandedEnum('all-colors', {
  Red: 'red', Green: 'green', Blue: 'blue', Yellow: 'yellow',
} as const);

const PrimaryColors = enumSubset('primary-colors', AllColors, ['Red', 'Blue', 'Yellow']);
// PrimaryColors has: Red, Blue, Yellow (no Green)
```

#### `enumExclude` - Remove Keys

```typescript
import { createBrandedEnum, enumExclude } from '@digitaldefiance/branded-enum';

const Status = createBrandedEnum('status', {
  Active: 'active', Inactive: 'inactive', Deprecated: 'deprecated',
} as const);

const CurrentStatuses = enumExclude('current-statuses', Status, ['Deprecated']);
// CurrentStatuses has: Active, Inactive
```

#### `enumMap` - Transform Values

```typescript
import { createBrandedEnum, enumMap } from '@digitaldefiance/branded-enum';

const Status = createBrandedEnum('status', {
  Active: 'active', Inactive: 'inactive',
} as const);

// Add prefix to all values
const PrefixedStatus = enumMap('prefixed-status', Status, (value) => `app.${value}`);
// PrefixedStatus.Active === 'app.active'

// Transform with key context
const VerboseStatus = enumMap('verbose-status', Status, (value, key) => `${key}: ${value}`);
```

#### `enumFromKeys` - Keys as Values

```typescript
import { enumFromKeys } from '@digitaldefiance/branded-enum';

const Directions = enumFromKeys('directions', ['North', 'South', 'East', 'West'] as const);
// Equivalent to: { North: 'North', South: 'South', East: 'East', West: 'West' }
```

### Enum Analysis

Compare and analyze enums.

#### `enumDiff` - Compare Enums

```typescript
import { createBrandedEnum, enumDiff } from '@digitaldefiance/branded-enum';

const StatusV1 = createBrandedEnum('status-v1', {
  Active: 'active', Inactive: 'inactive',
} as const);

const StatusV2 = createBrandedEnum('status-v2', {
  Active: 'active', Inactive: 'disabled', Pending: 'pending',
} as const);

const diff = enumDiff(StatusV1, StatusV2);
// diff.onlyInFirst: []
// diff.onlyInSecond: [{ key: 'Pending', value: 'pending' }]
// diff.differentValues: [{ key: 'Inactive', firstValue: 'inactive', secondValue: 'disabled' }]
// diff.sameValues: [{ key: 'Active', value: 'active' }]
```

#### `enumIntersect` - Find Shared Values

```typescript
import { createBrandedEnum, enumIntersect } from '@digitaldefiance/branded-enum';

const PrimaryColors = createBrandedEnum('primary', { Red: 'red', Blue: 'blue' } as const);
const WarmColors = createBrandedEnum('warm', { Red: 'red', Orange: 'orange' } as const);

const shared = enumIntersect(PrimaryColors, WarmColors);
// [{ value: 'red', enumIds: ['primary', 'warm'] }]
```

### Safe Parsing

Parse values without throwing errors.

#### `parseEnum` - With Default

```typescript
import { createBrandedEnum, parseEnum } from '@digitaldefiance/branded-enum';

const Status = createBrandedEnum('status', { Active: 'active', Inactive: 'inactive' } as const);

const status = parseEnum(userInput, Status, Status.Active);
// Returns userInput if valid, otherwise Status.Active
```

#### `safeParseEnum` - Result Object

```typescript
import { createBrandedEnum, safeParseEnum } from '@digitaldefiance/branded-enum';

const Status = createBrandedEnum('status', { Active: 'active', Inactive: 'inactive' } as const);

const result = safeParseEnum(userInput, Status);
if (result.success) {
  console.log('Valid:', result.value);
} else {
  console.log('Error:', result.error.message);
  console.log('Valid values:', result.error.validValues);
}
```

### Exhaustiveness Checking

Ensure all enum cases are handled in switch statements.

#### `exhaustive` - Generic Helper

```typescript
import { createBrandedEnum, exhaustive } from '@digitaldefiance/branded-enum';

const Status = createBrandedEnum('status', {
  Active: 'active', Inactive: 'inactive', Pending: 'pending',
} as const);

type StatusValue = typeof Status[keyof typeof Status];

function handleStatus(status: StatusValue): string {
  switch (status) {
    case Status.Active: return 'User is active';
    case Status.Inactive: return 'User is inactive';
    case Status.Pending: return 'User is pending';
    default: return exhaustive(status); // TypeScript error if case missing
  }
}
```

#### `exhaustiveGuard` - Enum-Specific Guard

```typescript
import { createBrandedEnum, exhaustiveGuard } from '@digitaldefiance/branded-enum';

const Status = createBrandedEnum('status', { Active: 'active', Inactive: 'inactive' } as const);
const assertStatusExhaustive = exhaustiveGuard(Status);

function handleStatus(status: typeof Status[keyof typeof Status]): string {
  switch (status) {
    case Status.Active: return 'Active';
    case Status.Inactive: return 'Inactive';
    default: return assertStatusExhaustive(status);
    // Error includes enum ID: 'Exhaustive check failed for enum "status"'
  }
}
```

### Schema Generation

Generate schemas for validation libraries.

#### `toJsonSchema` - JSON Schema

```typescript
import { createBrandedEnum, toJsonSchema } from '@digitaldefiance/branded-enum';

const Status = createBrandedEnum('status', {
  Active: 'active', Inactive: 'inactive',
} as const);

const schema = toJsonSchema(Status);
// {
//   $schema: 'http://json-schema.org/draft-07/schema#',
//   title: 'status',
//   description: 'Enum values for status',
//   type: 'string',
//   enum: ['active', 'inactive']
// }

// Custom options
const customSchema = toJsonSchema(Status, {
  title: 'User Status',
  description: 'The current status of a user',
  schemaVersion: '2020-12',
});
```

#### `toZodSchema` - Zod-Compatible Definition

```typescript
import { createBrandedEnum, toZodSchema } from '@digitaldefiance/branded-enum';
import { z } from 'zod';

const Status = createBrandedEnum('status', {
  Active: 'active', Inactive: 'inactive',
} as const);

const def = toZodSchema(Status);
const statusSchema = z.enum(def.values);

statusSchema.parse('active'); // 'active'
statusSchema.parse('invalid'); // throws ZodError
```

### Serialization

Custom serialization/deserialization with transforms.

#### `enumSerializer` - Serializer Factory

```typescript
import { createBrandedEnum, enumSerializer } from '@digitaldefiance/branded-enum';

const Status = createBrandedEnum('status', {
  Active: 'active', Inactive: 'inactive',
} as const);

// Basic serializer
const serializer = enumSerializer(Status);
serializer.serialize(Status.Active); // 'active'
serializer.deserialize('active'); // { success: true, value: 'active' }

// With custom transforms (e.g., add prefix)
const prefixedSerializer = enumSerializer(Status, {
  serialize: (value) => `status:${value}`,
  deserialize: (value) => value.replace('status:', ''),
});

prefixedSerializer.serialize(Status.Active); // 'status:active'
prefixedSerializer.deserialize('status:active'); // { success: true, value: 'active' }
```

### Development Tooling

Debug and monitor enum usage.

#### `watchEnum` - Access Monitoring

```typescript
import { createBrandedEnum, watchEnum } from '@digitaldefiance/branded-enum';

const Status = createBrandedEnum('status', { Active: 'active', Inactive: 'inactive' } as const);

const { watched, unwatch } = watchEnum(Status, (event) => {
  console.log(`Accessed ${event.enumId}.${event.key} = ${event.value}`);
});

watched.Active; // Logs: "Accessed status.Active = active"
unwatch(); // Stop watching
```

### Utility Functions

#### `enumToRecord` - Strip Metadata

```typescript
import { createBrandedEnum, enumToRecord } from '@digitaldefiance/branded-enum';

const Status = createBrandedEnum('status', { Active: 'active' } as const);
const plain = enumToRecord(Status);
// { Active: 'active' } - plain object, no Symbol metadata
```

### Compile-Time Types

TypeScript utility types for enhanced type safety.

```typescript
import { createBrandedEnum, EnumKeys, EnumValues, ValidEnumValue, StrictEnumParam } from '@digitaldefiance/branded-enum';

const Status = createBrandedEnum('status', {
  Active: 'active', Inactive: 'inactive',
} as const);

// Extract key union
type StatusKeys = EnumKeys<typeof Status>; // 'Active' | 'Inactive'

// Extract value union
type StatusValues = EnumValues<typeof Status>; // 'active' | 'inactive'

// Validate value at compile time
type Valid = ValidEnumValue<typeof Status, 'active'>; // 'active'
type Invalid = ValidEnumValue<typeof Status, 'unknown'>; // never

// Strict function parameters
function updateStatus(status: StrictEnumParam<typeof Status>): void {
  // Only accepts 'active' | 'inactive'
}
```

## License

MIT © [Digital Defiance](https://github.com/Digital-Defiance)
