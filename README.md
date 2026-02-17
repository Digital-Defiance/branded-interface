# @digitaldefiance/branded-interface

Runtime-identifiable interface-like types for TypeScript with zero runtime overhead.

## Why branded-interface?

Standard TypeScript interfaces are erased at compile time, making it impossible to determine which interface a plain object conforms to at runtime. This becomes problematic in large codebases where multiple modules share similar object shapes but need distinct runtime identity.

**branded-interface** solves this by:

- Creating interface definitions with embedded metadata for runtime identification
- Providing type guards to check if a value is a branded instance of a specific interface
- Maintaining a global registry to track all branded interfaces, primitives, and opaque types across bundles
- Keeping metadata in non-enumerable Symbol properties for zero serialization overhead

## Installation

```bash
npm install @digitaldefiance/branded-interface
# or
yarn add @digitaldefiance/branded-interface
# or
pnpm add @digitaldefiance/branded-interface
```

## Quick Start

```typescript
import {
  createBrandedInterface,
  createBrandedPrimitive,
  isOfInterface,
} from '@digitaldefiance/branded-interface';

// Define a branded interface with a schema
const User = createBrandedInterface<{
  name: string;
  email: string;
  age: number;
}>('User', {
  name:  { type: 'string' },
  email: { type: 'string' },
  age:   { type: 'number' },
});

// Create a validated, frozen branded instance
const user = User.create({ name: 'Alice', email: 'alice@example.com', age: 30 });

console.log(user.name);  // 'Alice'
console.log(user.email); // 'alice@example.com'

// Type guard with runtime identification
if (isOfInterface(user, User)) {
  // user is narrowed to BrandedInstance<{ name: string; email: string; age: number }>
  console.log('Valid user:', user.name);
}

// Metadata is invisible to serialization
JSON.stringify(user); // '{"name":"Alice","email":"alice@example.com","age":30}'
Object.keys(user);    // ['name', 'email', 'age']
```

## Features

### Branded Interfaces

Define structured types with schema validation and runtime identity:

```typescript
import { createBrandedInterface, isOfInterface, assertOfInterface } from '@digitaldefiance/branded-interface';

const Address = createBrandedInterface<{
  street: string;
  city: string;
  zip: string;
}>('Address', {
  street: { type: 'string' },
  city:   { type: 'string' },
  zip:    { type: 'string', validate: (v) => /^\d{5}(-\d{4})?$/.test(v as string) },
});

const addr = Address.create({ street: '742 Evergreen Terrace', city: 'Springfield', zip: '62704' });

// Type guard
isOfInterface(addr, Address); // true

// Assertion (throws on invalid)
const validated = assertOfInterface(someValue, Address);
```

### Branded Primitives

Constrained primitive types with custom validation:

```typescript
import { createBrandedPrimitive } from '@digitaldefiance/branded-interface';

const Email = createBrandedPrimitive<string>('Email', 'string', (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
);

const PositiveInt = createBrandedPrimitive<number>('PositiveInt', 'number', (v) =>
  Number.isInteger(v) && v > 0
);

Email.create('user@example.com');    // OK
Email.validate('not-an-email');      // false
PositiveInt.create(42);              // OK
PositiveInt.create(-1);              // throws
```

### Branded Enums

Runtime-identifiable enum-like objects (minimal support for use as field refs):

```typescript
import { createBrandedEnum } from '@digitaldefiance/branded-interface';

const BloodType = createBrandedEnum('BloodType', {
  APos: 'A+', ANeg: 'A-',
  BPos: 'B+', BNeg: 'B-',
  OPos: 'O+', ONeg: 'O-',
} as const);

// Use as a field ref in interface schemas
const Patient = createBrandedInterface('Patient', {
  name:      { type: 'string' },
  bloodType: { type: 'branded-enum', ref: 'BloodType' },
});
```

### Cross-Reference Validation

Interface schemas can reference branded enums, primitives, and other interfaces for cross-validation:

```typescript
const PhoneNumber = createBrandedPrimitive<string>('PhoneNumber', 'string', (v) =>
  /^\(\d{3}\)\s?\d{3}-\d{4}$/.test(v)
);

const EmergencyContact = createBrandedInterface('EmergencyContact', {
  name:  { type: 'string' },
  phone: { type: 'branded-primitive', ref: 'PhoneNumber' },
});

// phone field is validated against the PhoneNumber primitive
EmergencyContact.create({ name: 'Jane', phone: '(555) 123-4567' }); // OK
EmergencyContact.create({ name: 'Jane', phone: 'bad' });            // throws
```

### Safe Parsing

Parse values without throwing:

```typescript
import { safeParseInterface } from '@digitaldefiance/branded-interface';

const result = safeParseInterface(unknownData, User);
if (result.success) {
  console.log('Valid:', result.value.name);
} else {
  console.log('Error:', result.error.message);
  console.log('Code:', result.error.code);
  // Codes: 'INVALID_DEFINITION' | 'INVALID_VALUE_TYPE' | 'FIELD_VALIDATION_FAILED'
}
```


### Composition

Merge, extend, pick, omit, and make partial interfaces:

```typescript
import {
  composeInterfaces,
  extendInterface,
  partialInterface,
  pickFields,
  omitFields,
} from '@digitaldefiance/branded-interface';

const PersonalInfo = createBrandedInterface('PersonalInfo', {
  firstName: { type: 'string' },
  lastName:  { type: 'string' },
});

const InsuranceInfo = createBrandedInterface('InsuranceInfo', {
  provider:  { type: 'string' },
  policyNum: { type: 'string' },
});

// Merge multiple interfaces
const PatientCore = composeInterfaces('PatientCore', PersonalInfo, InsuranceInfo);

// Extend with additional fields
const Patient = extendInterface(PatientCore, 'Patient', {
  mrn: { type: 'string' },
});

// Make all fields optional
const PartialPatient = partialInterface(Patient, 'PartialPatient');

// Pick specific fields
const PatientName = pickFields(PersonalInfo, 'PatientName', ['firstName', 'lastName']);

// Omit specific fields
const NoPolicy = omitFields(InsuranceInfo, 'NoPolicy', ['policyNum']);
```

### Builder Pattern

Fluent API for constructing interface definitions:

```typescript
import { createBuilder } from '@digitaldefiance/branded-interface';

const LabResult = createBuilder('LabResult')
  .field('testName', { type: 'string' })
  .field('value', { type: 'number' })
  .field('unit', { type: 'string' })
  .optional('notes', { type: 'string' })
  .build();
```

### Opaque Types

Hide underlying values from accidental exposure:

```typescript
import { createOpaqueType } from '@digitaldefiance/branded-interface';

const OpaqueSSN = createOpaqueType<string>('OpaqueSSN', 'string');

const wrapped = OpaqueSSN.wrap('123-45-6789');
JSON.stringify(wrapped);           // '{}' — value is hidden
Object.keys(wrapped as object);    // [] — nothing visible

const revealed = OpaqueSSN.unwrap(wrapped); // '123-45-6789'
OpaqueSSN.unwrap({ fake: true } as never);  // throws
```

### Codec Pipelines

Composable transformation from raw input to validated domain objects:

```typescript
import { createCodec } from '@digitaldefiance/branded-interface';

const Vitals = createBrandedInterface('Vitals', {
  heartRate:   { type: 'number' },
  systolic:    { type: 'number' },
  diastolic:   { type: 'number' },
});

const vitalsCodec = createCodec(Vitals)
  .pipe((branded) => ({
    ...branded,
    bloodPressure: `${branded.systolic}/${branded.diastolic}`,
  }));

const result = vitalsCodec.execute({ heartRate: 72, systolic: 120, diastolic: 80 });
if (result.success) {
  console.log(result.value.bloodPressure); // '120/80'
}
```

### Serialization

JSON round-trip with validation:

```typescript
import { interfaceSerializer } from '@digitaldefiance/branded-interface';

const serializer = interfaceSerializer(User);

const json = serializer.serialize(user);           // '{"name":"Alice",...}'
const result = serializer.deserialize(json);       // { success: true, value: BrandedInstance }
const instance = serializer.deserializeOrThrow(json); // throws on invalid
```

### Versioning and Migration

Schema evolution with registered migration functions:

```typescript
import { addMigration, migrate } from '@digitaldefiance/branded-interface';

const AllergyV1 = createBrandedInterface('Allergy', {
  patientId: { type: 'string' },
  allergies: { type: 'string' },  // comma-separated
}, { version: 1 });

// Register migration: v1 → v2 splits string into array
addMigration(AllergyV1, 1, 2, (data) => ({
  patientId: data.patientId,
  allergies: (data.allergies as string).split(',').map((s) => s.trim()),
}));

const v1 = AllergyV1.create({ patientId: 'P001', allergies: 'Penicillin, Latex' });
const v2 = migrate(v1, 2);
// v2.allergies is now ['Penicillin', 'Latex']
```

### Watchers

Observe create and validate events for auditing:

```typescript
import { watchInterface } from '@digitaldefiance/branded-interface';

const { unwatch } = watchInterface(User, (event) => {
  console.log(`${event.eventType} on ${event.interfaceId} at ${event.timestamp}`);
});

User.create({ name: 'Bob', email: 'bob@example.com', age: 25 });
// Logs: "create on User at 1234567890"

unwatch(); // stop watching
```

### Schema Diff and Intersect

Compare and analyze interface schemas:

```typescript
import { interfaceDiff, interfaceIntersect } from '@digitaldefiance/branded-interface';

const diff = interfaceDiff(InterfaceA, InterfaceB);
// diff.onlyInFirst:  fields only in A
// diff.onlyInSecond: fields only in B
// diff.inBoth:       fields in both (with both descriptors)

const { definition, conflicts } = interfaceIntersect(InterfaceA, InterfaceB, 'Shared');
// definition: new interface with compatible shared fields
// conflicts:  fields with incompatible types
```

### Structural Subtyping

Check if one interface is a structural subtype of another:

```typescript
import { isSubtype } from '@digitaldefiance/branded-interface';

isSubtype(ExtendedUser, BaseUser); // true if ExtendedUser has all BaseUser fields
```

### Decorators

TC39 stage 3 decorators for runtime validation on class properties:

```typescript
import { BrandedField, BrandedClass, getBrandedConsumers, getConsumedDefinitions } from '@digitaldefiance/branded-interface';

@BrandedClass(User)
class UserService {
  @BrandedField(User)
  accessor currentUser: unknown;

  @BrandedField(Email, { optional: true })
  accessor backupEmail: string | undefined;
}

getBrandedConsumers('User');           // ['UserService']
getConsumedDefinitions('UserService'); // ['User']
```

### JSON Schema Generation

```typescript
import { interfaceToJsonSchema } from '@digitaldefiance/branded-interface';

const schema = interfaceToJsonSchema(User);
// { $schema: '...', type: 'object', title: 'User', properties: {...}, required: [...] }

// With draft version option
const schema07 = interfaceToJsonSchema(User, { draft: '07' });
```

### Zod Schema Generation

```typescript
import { interfaceToZodSchema } from '@digitaldefiance/branded-interface';

const def = interfaceToZodSchema(User);
// { interfaceId: 'User', fields: { name: { zodType: 'z.string()', optional: false, nullable: false }, ... } }
```

### Built-in Refinement Types

Common validation patterns as pre-built branded primitives:

```typescript
import { Email, NonEmptyString, PositiveInt, NonNegativeInt, Url, Uuid } from '@digitaldefiance/branded-interface';

Email.validate('user@example.com');       // true
NonEmptyString.validate('');              // false
PositiveInt.validate(42);                 // true
Uuid.validate('550e8400-e29b-41d4-a716-446655440000'); // true
```

## API Reference

### Factory

#### `createBrandedInterface(interfaceId, schema, options?)`

Creates a branded interface definition with runtime metadata and validation.

```typescript
function createBrandedInterface<T extends Record<string, unknown>>(
  interfaceId: string,
  schema: InterfaceSchema,
  options?: { version?: number }
): BrandedInterfaceDefinition<T>
```

- **interfaceId**: Unique identifier for this interface
- **schema**: Object mapping field names to `FieldDescriptor` objects
- **options.version**: Version number (default: 1)
- **Returns**: Frozen definition with `create()`, `validate()`, `id`, `schema`, `version`
- Idempotent: returns existing definition if ID already registered

#### `createBrandedPrimitive(primitiveId, baseType, validateFn?)`

Creates a branded primitive definition with optional validation.

```typescript
function createBrandedPrimitive<T extends string | number | boolean>(
  primitiveId: string,
  baseType: 'string' | 'number' | 'boolean',
  validateFn?: (value: T) => boolean
): BrandedPrimitiveDefinition<T>
```

- **primitiveId**: Unique identifier for this primitive
- **baseType**: The underlying JavaScript type
- **validateFn**: Optional predicate for additional constraints
- **Returns**: Frozen definition with `create()`, `validate()`, `id`, `baseType`

#### `createBrandedEnum(enumId, values)`

Creates a branded enum for use as field refs in interface schemas.

```typescript
function createBrandedEnum<T extends Record<string, string>>(
  enumId: string,
  values: T
): BrandedEnum<T>
```

### Type Guards

#### `isOfInterface(value, definition)`

Checks if a value is a branded instance of the given interface.

```typescript
function isOfInterface<T extends Record<string, unknown>>(
  value: unknown,
  definition: BrandedInterfaceDefinition<T>
): value is BrandedInstance<T>
```

#### `assertOfInterface(value, definition)`

Asserts a value is a branded instance, throwing if not.

```typescript
function assertOfInterface<T extends Record<string, unknown>>(
  value: unknown,
  definition: BrandedInterfaceDefinition<T>
): BrandedInstance<T>
```

#### `safeParseInterface(value, definition)`

Safely parses a value with detailed error reporting.

```typescript
function safeParseInterface<T extends Record<string, unknown>>(
  value: unknown,
  definition: BrandedInterfaceDefinition<T>
): InterfaceSafeParseResult<BrandedInstance<T>>
```

#### `isOfPrimitive(value, definition)`

Checks if a value is valid for a branded primitive.

```typescript
function isOfPrimitive<T extends string | number | boolean>(
  value: unknown,
  definition: BrandedPrimitiveDefinition<T>
): value is T
```

### Metadata Accessors

#### `getInterfaceId(value)`

Gets the interface ID from a branded instance or definition.

#### `getInterfaceSchema(definition)`

Gets the field schema from a branded interface definition.

#### `getInterfaceFields(definition)`

Gets the list of field names from a definition.

#### `interfaceFieldCount(definition)`

Gets the number of fields in a definition.

### Registry

#### `getAllInterfaceIds()`

Returns all registered interface, primitive, and opaque type IDs.

#### `getInterfaceById(id)`

Gets a registry entry by ID. Returns `{ id, kind, definition }` or `undefined`.

#### `resetInterfaceRegistry()`

Clears the global interface registry. For testing only.

### Composition

| Function | Description |
|---|---|
| `composeInterfaces(newId, ...defs)` | Merge multiple interfaces (throws on duplicate fields) |
| `extendInterface(base, newId, fields)` | Extend a base interface with additional fields |
| `partialInterface(def, newId)` | Make all fields optional |
| `pickFields(def, newId, fields)` | Keep only specified fields |
| `omitFields(def, newId, fields)` | Remove specified fields |

### Analysis

| Function | Description |
|---|---|
| `interfaceDiff(first, second)` | Partition fields into onlyInFirst, onlyInSecond, inBoth |
| `interfaceIntersect(first, second, newId)` | Create interface from compatible shared fields |
| `isSubtype(candidate, supertype)` | Check structural subtype relationship |

### Schema Generation

| Function | Description |
|---|---|
| `interfaceToJsonSchema(def, options?)` | Generate JSON Schema (draft 2020-12 or 07) |
| `interfaceToZodSchema(def)` | Generate Zod-compatible schema definition |

### Other

| Function | Description |
|---|---|
| `createBuilder(id)` | Fluent builder for interface definitions |
| `createOpaqueType(typeId, baseType)` | Opaque type with `wrap()` / `unwrap()` |
| `createCodec(def)` | Codec pipeline with `.pipe()` and `.execute()` |
| `interfaceSerializer(def)` | JSON serializer with `serialize()` / `deserialize()` / `deserializeOrThrow()` |
| `addMigration(def, from, to, fn)` | Register a version migration |
| `migrate(instance, targetVersion)` | Apply migrations to reach target version |
| `watchInterface(def, callback)` | Watch create/validate events, returns `{ unwatch }` |
| `BrandedField(def, options?)` | TC39 accessor decorator for property validation |
| `BrandedClass(...defs)` | Class decorator for usage tracking |

## Types

```typescript
// Field descriptor for interface schemas
interface FieldDescriptor {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
      | 'branded-enum' | 'branded-interface' | 'branded-primitive';
  optional?: boolean;
  nullable?: boolean;
  validate?: (value: unknown) => boolean;
  ref?: string;       // reference to a registered branded type ID
  items?: FieldDescriptor; // for array element types
}

// A branded instance — frozen data + Symbol metadata
type BrandedInstance<T> = Readonly<T> & BrandedInterfaceMetadata;

// Interface definition returned by createBrandedInterface()
interface BrandedInterfaceDefinition<T> {
  id: string;
  schema: InterfaceSchema;
  version: number;
  create: (data: T) => BrandedInstance<T>;
  validate: (data: unknown) => data is T;
}

// Primitive definition returned by createBrandedPrimitive()
interface BrandedPrimitiveDefinition<T> {
  id: string;
  baseType: 'string' | 'number' | 'boolean';
  create: (value: T) => T & { readonly __brand: string };
  validate: (value: unknown) => value is T;
}

// Opaque type definition returned by createOpaqueType()
interface OpaqueTypeDefinition<T> {
  id: string;
  wrap: (value: T) => OpaqueValue<T>;
  unwrap: (opaque: OpaqueValue<T>) => T;
}
```

## Cross-Bundle Registry

The global registry uses `globalThis`, ensuring all branded types are tracked across different bundles, ESM/CJS modules, and even different instances of the library. Interfaces, primitives, and opaque types share a single registry with kind-based collision detection.

## License

MIT © [Digital Defiance](https://github.com/Digital-Defiance)
