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

