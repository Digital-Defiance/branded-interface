# Design Document: Branded Interfaces

## Overview

The Branded Interfaces module extends `@digitaldefiance/branded-interface` with nominal typing for arbitrary interfaces, primitives, and structured data. It mirrors the existing branded enum architecture — Symbol-based metadata, frozen objects, global registry, type guards, serialization, schema generation, decorators, and watchers — while introducing new capabilities like field schemas, validation predicates, composition, versioning, builder patterns, codec pipelines, and opaque types.

The module is organized into files under `src/lib/branded-interfaces/` with a barrel export added to `src/index.ts`. All public APIs follow the same conventions as the existing enum APIs: factory functions return frozen objects, registries live on `globalThis`, type guards narrow TypeScript types, and serializers produce discriminated union results.

## Architecture

```mermaid
graph TD
    subgraph "Core Layer"
        TYPES[types.ts<br/>Symbols, interfaces, type helpers]
        FACTORY[factory.ts<br/>createBrandedInterface<br/>createBrandedPrimitive]
        REGISTRY[registry.ts<br/>Interface Registry on globalThis]
    end

    subgraph "Validation Layer"
        GUARDS[guards.ts<br/>isOfInterface, assertOfInterface<br/>safeParseInterface, isOfPrimitive]
        ACCESSORS[accessors.ts<br/>getInterfaceId, getInterfaceSchema<br/>getInterfaceFields, interfaceFieldCount]
    end

    subgraph "Composition Layer"
        COMPOSE[compose.ts<br/>composeInterfaces, extendInterface<br/>partialInterface, pickFields, omitFields]
        DIFF[diff.ts<br/>interfaceDiff, interfaceIntersect]
        SUBTYPE[subtype.ts<br/>isSubtype]
    end

    subgraph "Serialization Layer"
        SERIALIZER[serializer.ts<br/>interfaceSerializer]
        JSON_SCHEMA[json-schema.ts<br/>interfaceToJsonSchema]
        ZOD_SCHEMA[zod-schema.ts<br/>interfaceToZodSchema]
    end

    subgraph "Advanced Layer"
        WATCH[watch.ts<br/>watchInterface]
        DECORATORS[decorators.ts<br/>@BrandedField, @BrandedClass]
        VERSIONING[versioning.ts<br/>addMigration, migrate]
        BUILDER[builder.ts<br/>BrandedInterfaceBuilder]
        CODEC[codec.ts<br/>createCodec, pipe, execute]
        OPAQUE[opaque.ts<br/>createOpaqueType, wrap, unwrap]
        REFINEMENTS[refinements.ts<br/>Email, NonEmptyString, PositiveInt, etc.]
    end

    FACTORY --> TYPES
    FACTORY --> REGISTRY
    GUARDS --> TYPES
    GUARDS --> REGISTRY
    ACCESSORS --> TYPES
    COMPOSE --> FACTORY
    COMPOSE --> TYPES
    DIFF --> TYPES
    SUBTYPE --> TYPES
    SERIALIZER --> TYPES
    SERIALIZER --> GUARDS
    JSON_SCHEMA --> TYPES
    ZOD_SCHEMA --> TYPES
    WATCH --> TYPES
    WATCH --> REGISTRY
    DECORATORS --> TYPES
    DECORATORS --> GUARDS
    VERSIONING --> TYPES
    VERSIONING --> FACTORY
    BUILDER --> FACTORY
    BUILDER --> TYPES
    CODEC --> TYPES
    CODEC --> GUARDS
    OPAQUE --> TYPES
    OPAQUE --> REGISTRY
    REFINEMENTS --> FACTORY
```

### Design Decisions

1. **Separate registry from enum registry**: Branded interfaces and primitives use their own `InterfaceRegistry` on `globalThis` under a distinct key (`__brandedInterfaceRegistry__`). This avoids ID collisions with enums and keeps concerns separated, while following the same pattern.

2. **Symbol-based metadata**: Like branded enums, branded interface instances carry `INTERFACE_ID` and `INTERFACE_SCHEMA` Symbols as non-enumerable properties. This keeps metadata invisible to `Object.keys()`, `JSON.stringify()`, and spread operators.

3. **Frozen instances**: All branded instances and definitions are frozen via `Object.freeze()` to prevent mutation, matching the enum pattern.

4. **Validation at construction**: The `create()` function on a definition validates every field against the schema before returning. This is the single point of validation — once branded, an instance is guaranteed valid.

5. **Idempotent registration**: Like `createBrandedEnum()`, calling `createBrandedInterface()` or `createBrandedPrimitive()` with an already-registered ID returns the existing definition.

6. **Field schema as plain objects**: Field schemas are plain descriptor objects (`{ type, optional?, nullable?, validate?, ref? }`) rather than class instances. This keeps them serializable and simple.

7. **Branded primitives use a box pattern at runtime**: Branded primitives are stored as the raw value at runtime but carry a phantom brand in the TypeScript type system. The `INTERFACE_ID` symbol is attached to a wrapper object only when needed for type guard checks. For most usage, the value flows as a plain primitive.

## Components and Interfaces

### Core Symbols and Types (`src/lib/branded-interfaces/types.ts`)

```typescript
// Unique symbols for metadata
export const INTERFACE_ID: unique symbol = Symbol.for('@digitaldefiance/branded-interface:INTERFACE_ID');
export const INTERFACE_SCHEMA: unique symbol = Symbol.for('@digitaldefiance/branded-interface:INTERFACE_SCHEMA');
export const INTERFACE_VERSION: unique symbol = Symbol.for('@digitaldefiance/branded-interface:INTERFACE_VERSION');
export const PRIMITIVE_ID: unique symbol = Symbol.for('@digitaldefiance/branded-interface:PRIMITIVE_ID');
export const PRIMITIVE_BASE_TYPE: unique symbol = Symbol.for('@digitaldefiance/branded-interface:PRIMITIVE_BASE_TYPE');
export const OPAQUE_ID: unique symbol = Symbol.for('@digitaldefiance/branded-interface:OPAQUE_ID');

// Field type descriptors
export type FieldBaseType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface FieldDescriptor {
  readonly type: FieldBaseType | 'branded-interface' | 'branded-interface' | 'branded-primitive';
  readonly optional?: boolean;
  readonly nullable?: boolean;
  readonly validate?: (value: unknown) => boolean;
  /** Reference to a branded enum, interface, or primitive definition for cross-validation */
  readonly ref?: string; // ID of the referenced branded type
  /** For array fields, the element type descriptor */
  readonly items?: FieldDescriptor;
}

export type InterfaceSchema = Record<string, FieldDescriptor>;

// Branded interface instance metadata
export interface BrandedInterfaceMetadata {
  readonly [INTERFACE_ID]: string;
  readonly [INTERFACE_SCHEMA]: InterfaceSchema;
}

// A branded interface instance
export type BrandedInstance<T extends Record<string, unknown>> = Readonly<T> & BrandedInterfaceMetadata;

// The definition object returned by createBrandedInterface()
export interface BrandedInterfaceDefinition<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly id: string;
  readonly schema: InterfaceSchema;
  readonly version: number;
  readonly create: (data: T) => BrandedInstance<T>;
  readonly validate: (data: unknown) => data is T;
  readonly [INTERFACE_ID]: string;
  readonly [INTERFACE_SCHEMA]: InterfaceSchema;
  readonly [INTERFACE_VERSION]: number;
}

// Branded primitive types
export type PrimitiveBaseType = 'string' | 'number' | 'boolean';

export interface BrandedPrimitiveMetadata {
  readonly [PRIMITIVE_ID]: string;
  readonly [PRIMITIVE_BASE_TYPE]: PrimitiveBaseType;
}

export interface BrandedPrimitiveDefinition<T extends string | number | boolean = string | number | boolean> {
  readonly id: string;
  readonly baseType: PrimitiveBaseType;
  readonly create: (value: T) => T & { readonly __brand: string };
  readonly validate: (value: unknown) => value is T;
  readonly [PRIMITIVE_ID]: string;
  readonly [PRIMITIVE_BASE_TYPE]: PrimitiveBaseType;
}

// Opaque type wrapper
export interface OpaqueTypeDefinition<T> {
  readonly id: string;
  readonly wrap: (value: T) => OpaqueValue<T>;
  readonly unwrap: (opaque: OpaqueValue<T>) => T;
}

export interface OpaqueValue<T> {
  readonly [OPAQUE_ID]: string;
  readonly __opaqueValue: T; // hidden from external type via branded type trick
}

// Registry types
export const INTERFACE_REGISTRY_KEY = '__brandedInterfaceRegistry__' as const;

export interface InterfaceRegistryEntry {
  readonly id: string;
  readonly kind: 'interface' | 'primitive' | 'opaque';
  readonly definition: BrandedInterfaceDefinition | BrandedPrimitiveDefinition | OpaqueTypeDefinition<unknown>;
}

export interface InterfaceRegistry {
  readonly entries: Map<string, InterfaceRegistryEntry>;
}

// Watch event types
export type InterfaceEventType = 'create' | 'validate';

export interface InterfaceAccessEvent {
  readonly interfaceId: string;
  readonly eventType: InterfaceEventType;
  readonly value: unknown;
  readonly timestamp: number;
}

export type InterfaceWatchCallback = (event: InterfaceAccessEvent) => void;

// Serializer result types (mirrors enum pattern)
export interface InterfaceDeserializeSuccess<T> {
  readonly success: true;
  readonly value: T;
}

export interface InterfaceDeserializeFailure {
  readonly success: false;
  readonly error: {
    readonly message: string;
    readonly code: string;
    readonly input: unknown;
  };
}

export type InterfaceDeserializeResult<T> = InterfaceDeserializeSuccess<T> | InterfaceDeserializeFailure;

// Safe parse result types (mirrors enum pattern)
export interface InterfaceSafeParseSuccess<T> {
  readonly success: true;
  readonly value: T;
}

export interface InterfaceSafeParseFailure {
  readonly success: false;
  readonly error: {
    readonly message: string;
    readonly code: InterfaceSafeParseErrorCode;
    readonly input: unknown;
    readonly interfaceId?: string;
    readonly fieldErrors?: ReadonlyArray<{ field: string; message: string }>;
  };
}

export type InterfaceSafeParseErrorCode =
  | 'INVALID_DEFINITION'
  | 'INVALID_VALUE_TYPE'
  | 'FIELD_VALIDATION_FAILED'
  | 'NOT_BRANDED_INSTANCE';

export type InterfaceSafeParseResult<T> = InterfaceSafeParseSuccess<T> | InterfaceSafeParseFailure;

// Diff result types
export interface InterfaceDiffResult {
  readonly onlyInFirst: ReadonlyArray<{ field: string; descriptor: FieldDescriptor }>;
  readonly onlyInSecond: ReadonlyArray<{ field: string; descriptor: FieldDescriptor }>;
  readonly inBoth: ReadonlyArray<{ field: string; first: FieldDescriptor; second: FieldDescriptor }>;
}

// Intersect result types
export interface InterfaceIntersectResult {
  readonly definition: BrandedInterfaceDefinition;
  readonly conflicts: ReadonlyArray<{ field: string; first: FieldDescriptor; second: FieldDescriptor }>;
}

// Codec pipeline types
export interface CodecPipeline<TIn, TOut> {
  readonly pipe: <TNext>(transform: (value: TOut) => TNext) => CodecPipeline<TIn, TNext>;
  readonly execute: (input: TIn) => CodecResult<TOut>;
}

export interface CodecSuccess<T> {
  readonly success: true;
  readonly value: T;
}

export interface CodecFailure {
  readonly success: false;
  readonly error: {
    readonly message: string;
    readonly step: number;
    readonly input: unknown;
  };
}

export type CodecResult<T> = CodecSuccess<T> | CodecFailure;

// Versioning types
export type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

export interface MigrationEntry {
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly migrate: MigrationFn;
}

// Builder types
export interface BrandedInterfaceBuilder<T extends Record<string, unknown> = Record<string, never>> {
  readonly field: <K extends string, V>(
    name: K,
    descriptor: FieldDescriptor
  ) => BrandedInterfaceBuilder<T & Record<K, V>>;
  readonly optional: <K extends string, V>(
    name: K,
    descriptor: Omit<FieldDescriptor, 'optional'>
  ) => BrandedInterfaceBuilder<T & Partial<Record<K, V>>>;
  readonly build: () => BrandedInterfaceDefinition<T>;
}

// JSON Schema output type
export interface InterfaceJsonSchema {
  readonly $schema: string;
  readonly type: 'object';
  readonly title: string;
  readonly properties: Record<string, unknown>;
  readonly required: string[];
  readonly additionalProperties: boolean;
}

// Zod schema definition output type
export interface InterfaceZodSchemaDefinition {
  readonly interfaceId: string;
  readonly fields: Record<string, { zodType: string; optional: boolean; nullable: boolean }>;
}
```

### Factory (`src/lib/branded-interfaces/factory.ts`)

```typescript
export function createBrandedInterface<T extends Record<string, unknown>>(
  interfaceId: string,
  schema: InterfaceSchema,
  options?: { version?: number }
): BrandedInterfaceDefinition<T>;

export function createBrandedPrimitive<T extends string | number | boolean>(
  primitiveId: string,
  baseType: PrimitiveBaseType,
  validate?: (value: T) => boolean
): BrandedPrimitiveDefinition<T>;
```

The factory:
1. Checks the registry for an existing definition (idempotent).
2. Creates a `create()` function that validates each field against the schema, attaches Symbol metadata, and freezes the result.
3. Creates a `validate()` function that checks if a value matches the schema without throwing.
4. Attaches Symbol metadata to the definition itself.
5. Freezes the definition.
6. Registers in the Interface_Registry.

For branded primitives:
1. Checks registry for existing definition.
2. Creates a `create()` function that checks the base type and runs the validation predicate.
3. Returns the raw value with a phantom brand type (no runtime wrapper for primitives in normal use).
4. Registers in the Interface_Registry.

### Registry (`src/lib/branded-interfaces/registry.ts`)

```typescript
export function getInterfaceRegistry(): InterfaceRegistry;
export function registerInterfaceEntry(entry: InterfaceRegistryEntry): void;
export function getAllInterfaceIds(): string[];
export function getInterfaceById(id: string): InterfaceRegistryEntry | undefined;
export function resetInterfaceRegistry(): void;
```

Follows the same `globalThis` pattern as the enum registry. Uses `INTERFACE_REGISTRY_KEY` to avoid collision.

### Guards (`src/lib/branded-interfaces/guards.ts`)

```typescript
export function isOfInterface<T extends Record<string, unknown>>(
  value: unknown,
  definition: BrandedInterfaceDefinition<T>
): value is BrandedInstance<T>;

export function assertOfInterface<T extends Record<string, unknown>>(
  value: unknown,
  definition: BrandedInterfaceDefinition<T>
): BrandedInstance<T>;

export function safeParseInterface<T extends Record<string, unknown>>(
  value: unknown,
  definition: BrandedInterfaceDefinition<T>
): InterfaceSafeParseResult<BrandedInstance<T>>;

export function isOfPrimitive<T extends string | number | boolean>(
  value: unknown,
  definition: BrandedPrimitiveDefinition<T>
): value is T;
```

`isOfInterface` checks for the `INTERFACE_ID` symbol and verifies it matches the definition's ID. `safeParseInterface` additionally validates unbranded plain objects against the schema and brands them on success.

### Accessors (`src/lib/branded-interfaces/accessors.ts`)

```typescript
export function getInterfaceId(value: unknown): string | undefined;
export function getInterfaceSchema(definition: unknown): InterfaceSchema | undefined;
export function getInterfaceFields(definition: unknown): string[] | undefined;
export function interfaceFieldCount(definition: unknown): number | undefined;
```

### Composition (`src/lib/branded-interfaces/compose.ts`)

```typescript
export function composeInterfaces(
  newId: string,
  ...definitions: BrandedInterfaceDefinition[]
): BrandedInterfaceDefinition;

export function extendInterface(
  base: BrandedInterfaceDefinition,
  newId: string,
  additionalFields: InterfaceSchema
): BrandedInterfaceDefinition;

export function partialInterface(
  definition: BrandedInterfaceDefinition,
  newId: string
): BrandedInterfaceDefinition;

export function pickFields(
  definition: BrandedInterfaceDefinition,
  newId: string,
  fields: string[]
): BrandedInterfaceDefinition;

export function omitFields(
  definition: BrandedInterfaceDefinition,
  newId: string,
  fields: string[]
): BrandedInterfaceDefinition;
```

All composition functions create new definitions via `createBrandedInterface()`, ensuring proper registration and freezing.

### Diff and Intersect (`src/lib/branded-interfaces/diff.ts`)

```typescript
export function interfaceDiff(
  first: BrandedInterfaceDefinition,
  second: BrandedInterfaceDefinition
): InterfaceDiffResult;

export function interfaceIntersect(
  first: BrandedInterfaceDefinition,
  second: BrandedInterfaceDefinition,
  newId: string
): InterfaceIntersectResult;
```

### Subtype Checks (`src/lib/branded-interfaces/subtype.ts`)

```typescript
export function isSubtype(
  candidate: BrandedInterfaceDefinition,
  supertype: BrandedInterfaceDefinition
): boolean;
```

Checks that every field in `supertype` exists in `candidate` with a compatible type. Compatible means same `type` value, and if `ref` is present, same `ref` value.

### Serializer (`src/lib/branded-interfaces/serializer.ts`)

```typescript
export interface InterfaceSerializer<T extends Record<string, unknown>> {
  serialize(instance: BrandedInstance<T>): string;
  deserialize(input: unknown): InterfaceDeserializeResult<BrandedInstance<T>>;
  deserializeOrThrow(input: unknown): BrandedInstance<T>;
}

export function interfaceSerializer<T extends Record<string, unknown>>(
  definition: BrandedInterfaceDefinition<T>
): InterfaceSerializer<T>;
```

`serialize()` extracts enumerable properties (no Symbols) and calls `JSON.stringify()`. `deserialize()` parses JSON, validates against the schema, and brands the result.

### JSON Schema (`src/lib/branded-interfaces/json-schema.ts`)

```typescript
export function interfaceToJsonSchema(
  definition: BrandedInterfaceDefinition,
  options?: { draft?: '2020-12' | '07' }
): InterfaceJsonSchema;
```

Maps `FieldDescriptor.type` to JSON Schema types. Handles `optional` via `required` array, `nullable` via type union `[type, "null"]`. For `branded-interface` refs, looks up the enum in the enum registry and emits `{ enum: [...values] }`. For `branded-primitive` refs with known refinements, emits `format` annotations.

### Zod Schema (`src/lib/branded-interfaces/zod-schema.ts`)

```typescript
export function interfaceToZodSchema(
  definition: BrandedInterfaceDefinition
): InterfaceZodSchemaDefinition;
```

### Watch (`src/lib/branded-interfaces/watch.ts`)

```typescript
export function watchInterface(
  definition: BrandedInterfaceDefinition,
  callback: InterfaceWatchCallback
): { unwatch: () => void };
```

Uses a watcher registry on `globalThis` (separate key from enum watchers). The factory's `create()` and `validate()` functions check for watchers and invoke callbacks.

### Decorators (`src/lib/branded-interfaces/decorators.ts`)

```typescript
export function BrandedField(
  definition: BrandedInterfaceDefinition | BrandedPrimitiveDefinition,
  options?: { optional?: boolean; nullable?: boolean }
): ClassAccessorDecorator;

export function BrandedClass(
  ...definitions: (BrandedInterfaceDefinition | BrandedPrimitiveDefinition)[]
): ClassDecorator;
```

Follows the same TC39 stage 3 decorator pattern as the existing `@EnumValue` and `@EnumClass`.

### Versioning (`src/lib/branded-interfaces/versioning.ts`)

```typescript
export function addMigration(
  definition: BrandedInterfaceDefinition,
  fromVersion: number,
  toVersion: number,
  migrateFn: MigrationFn
): void;

export function migrate<T extends Record<string, unknown>>(
  instance: BrandedInstance<T>,
  targetVersion: number
): BrandedInstance<Record<string, unknown>>;
```

Migrations are stored in a Map keyed by `interfaceId`. `migrate()` finds the shortest path from the instance's version to the target version using registered migrations.

### Builder (`src/lib/branded-interfaces/builder.ts`)

```typescript
export function createBuilder(interfaceId: string): BrandedInterfaceBuilder;
```

Returns a fluent builder that accumulates field descriptors and calls `createBrandedInterface()` on `.build()`.

### Codec (`src/lib/branded-interfaces/codec.ts`)

```typescript
export function createCodec<T extends Record<string, unknown>>(
  definition: BrandedInterfaceDefinition<T>
): CodecPipeline<unknown, BrandedInstance<T>>;
```

The initial pipeline step validates and brands the input. Each `.pipe()` call wraps the previous pipeline in a try/catch and chains the transform.

### Opaque Types (`src/lib/branded-interfaces/opaque.ts`)

```typescript
export function createOpaqueType<T>(
  typeId: string,
  baseType: string
): OpaqueTypeDefinition<T>;
```

`wrap()` creates an object with the `OPAQUE_ID` symbol and stores the value. `unwrap()` checks the symbol matches and returns the value.

### Refinements (`src/lib/branded-interfaces/refinements.ts`)

```typescript
export const Email: BrandedPrimitiveDefinition<string>;
export const NonEmptyString: BrandedPrimitiveDefinition<string>;
export const PositiveInt: BrandedPrimitiveDefinition<number>;
export const NonNegativeInt: BrandedPrimitiveDefinition<number>;
export const Url: BrandedPrimitiveDefinition<string>;
export const Uuid: BrandedPrimitiveDefinition<string>;
```

Each is created via `createBrandedPrimitive()` with an appropriate validation predicate. For example, `Email` uses a regex check, `PositiveInt` checks `Number.isInteger(v) && v > 0`, `Uuid` checks the UUID v4 format.

## Data Models

### Interface Registry on globalThis

```typescript
// Stored at globalThis['__brandedInterfaceRegistry__']
{
  entries: Map<string, {
    id: string,
    kind: 'interface' | 'primitive' | 'opaque',
    definition: BrandedInterfaceDefinition | BrandedPrimitiveDefinition | OpaqueTypeDefinition
  }>
}
```

### Branded Interface Instance (runtime shape)

```typescript
// For a User interface with fields { name: string, age: number }
{
  name: "Alice",           // enumerable
  age: 30,                 // enumerable
  [INTERFACE_ID]: "User",  // non-enumerable Symbol
  [INTERFACE_SCHEMA]: { name: { type: 'string' }, age: { type: 'number' } }  // non-enumerable Symbol
}
// Object.freeze() applied
```

### Branded Interface Definition (runtime shape)

```typescript
{
  id: "User",
  schema: { name: { type: 'string' }, age: { type: 'number' } },
  version: 1,
  create: [Function],
  validate: [Function],
  [INTERFACE_ID]: "User",           // non-enumerable Symbol
  [INTERFACE_SCHEMA]: { ... },      // non-enumerable Symbol
  [INTERFACE_VERSION]: 1            // non-enumerable Symbol
}
// Object.freeze() applied
```

### Migration Registry (runtime shape)

```typescript
// Stored at globalThis['__brandedInterfaceMigrations__']
Map<string, MigrationEntry[]>
// Key: interfaceId, Value: array of { fromVersion, toVersion, migrate }
```

### Watcher Registry (runtime shape)

```typescript
// Stored at globalThis['__brandedInterfaceWatchers__']
{
  watchers: Map<string, Set<InterfaceWatchCallback>>,  // interfaceId -> callbacks
  globalWatchers: Set<InterfaceWatchCallback>
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis and property reflection, the following consolidated correctness properties cover all testable acceptance criteria.

### Property 1: Interface definition structure and freezing

*For any* valid interface ID and field schema, `createBrandedInterface()` should return a frozen object with `id`, `schema`, `version`, `create`, `validate` properties and non-enumerable `INTERFACE_ID`, `INTERFACE_SCHEMA`, `INTERFACE_VERSION` Symbol metadata.

**Validates: Requirements 1.1**

### Property 2: Interface factory idempotence

*For any* interface ID, calling `createBrandedInterface()` twice with the same ID should return the exact same reference (referential equality).

**Validates: Requirements 1.2**

### Property 3: Valid data produces branded instances

*For any* field schema (including all supported field types: string, number, boolean, object, array, branded-interface refs, branded-interface refs, branded-primitive refs, optional fields, nullable fields) and any plain object matching that schema, calling `create()` should return a frozen object containing all the input data plus non-enumerable `INTERFACE_ID` Symbol metadata.

**Validates: Requirements 1.3, 1.5, 1.6, 1.7**

### Property 4: Invalid data is rejected with field-level errors

*For any* field schema and any plain object that does NOT match the schema (wrong types, missing required fields, failing cross-validation against referenced branded types), calling `create()` should throw an error whose message identifies the failing field(s).

**Validates: Requirements 1.4, 1.5**

### Property 5: Primitive definition structure and freezing

*For any* valid primitive ID and base type, `createBrandedPrimitive()` should return a frozen object with `id`, `baseType`, `create`, `validate` properties and non-enumerable Symbol metadata.

**Validates: Requirements 2.1**

### Property 6: Primitive factory idempotence

*For any* primitive ID, calling `createBrandedPrimitive()` twice with the same ID should return the exact same reference.

**Validates: Requirements 2.2**

### Property 7: Primitive create accepts valid values and rejects invalid

*For any* branded primitive definition with a validation predicate, `create()` should return the value when it matches the base type and passes the predicate, throw when the base type is wrong, and throw (with predicate name in message) when the base type matches but the predicate fails.

**Validates: Requirements 2.3, 2.4, 2.5**

### Property 8: Built-in refinement types validate correctly

*For any* value, each built-in refinement type (Email, NonEmptyString, PositiveInt, NonNegativeInt, Url, Uuid) should accept values matching its pattern and reject values not matching.

**Validates: Requirements 2.6**

### Property 9: Registry tracks all created definitions

*For any* set of created interface and primitive definitions, `getAllInterfaceIds()` should contain all their IDs, and `getInterfaceById(id)` should return the corresponding definition for each.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 10: Registry rejects cross-kind ID collisions

*For any* ID already registered as one kind (interface or primitive), attempting to register a different kind with the same ID should throw a descriptive error.

**Validates: Requirements 3.6**

### Property 11: Type guard consistency

*For any* value and branded interface definition, `isOfInterface()` should return `true` if and only if the value is a branded instance of that definition. `assertOfInterface()` should throw if and only if `isOfInterface()` returns `false`.

**Validates: Requirements 4.1, 4.2**

### Property 12: Safe parse brands unbranded valid objects

*For any* branded interface definition and any value, `safeParseInterface()` should return `{ success: true }` with a branded value when the input matches the schema (whether already branded or plain), and `{ success: false }` with error details otherwise.

**Validates: Requirements 4.3, 4.5**

### Property 13: Primitive type guard correctness

*For any* value and branded primitive definition, `isOfPrimitive()` should return `true` if and only if the value was created by that definition's `create()` function.

**Validates: Requirements 4.4**

### Property 14: Metadata accessors return correct values

*For any* created branded interface definition with schema S, `getInterfaceId()` should return the definition's ID, `getInterfaceSchema()` should return S, `getInterfaceFields()` should return the keys of S, and `interfaceFieldCount()` should return the number of keys in S.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 15: Composition produces union of fields

*For any* set of branded interface definitions with non-overlapping field names, `composeInterfaces()` should produce a definition whose schema contains exactly the union of all source fields.

**Validates: Requirements 6.1**

### Property 16: Composition rejects duplicate fields

*For any* set of branded interface definitions with at least one overlapping field name, `composeInterfaces()` should throw an error identifying the conflicting field.

**Validates: Requirements 6.2**

### Property 17: Extension adds fields to base

*For any* branded interface definition and additional fields with non-overlapping names, `extendInterface()` should produce a definition whose schema contains all base fields plus all additional fields.

**Validates: Requirements 6.3**

### Property 18: Extension rejects conflicting fields

*For any* branded interface definition and additional fields where at least one name conflicts with a base field, `extendInterface()` should throw.

**Validates: Requirements 6.4**

### Property 19: Partial makes all fields optional

*For any* branded interface definition, `partialInterface()` should produce a definition where every field descriptor has `optional: true`.

**Validates: Requirements 7.1**

### Property 20: Pick retains only specified fields

*For any* branded interface definition and any subset of its field names, `pickFields()` should produce a definition whose schema contains exactly those fields.

**Validates: Requirements 7.2**

### Property 21: Omit removes only specified fields

*For any* branded interface definition and any subset of its field names, `omitFields()` should produce a definition whose schema contains all fields except those specified.

**Validates: Requirements 7.3**

### Property 22: Pick and Omit reject unknown field names

*For any* branded interface definition and a field name not in the schema, both `pickFields()` and `omitFields()` should throw a descriptive error.

**Validates: Requirements 7.4, 7.5**

### Property 23: Diff partitions fields correctly

*For any* two branded interface definitions, `interfaceDiff()` should return `onlyInFirst`, `onlyInSecond`, and `inBoth` such that their field names form a partition of the union of all field names from both definitions.

**Validates: Requirements 8.1**

### Property 24: Intersect produces compatible shared fields and reports conflicts

*For any* two branded interface definitions, `interfaceIntersect()` should produce a definition containing only fields present in both with compatible types, and a `conflicts` list containing fields present in both with incompatible types. The union of intersected fields and conflicted fields should equal the set of fields present in both definitions.

**Validates: Requirements 8.2, 8.3**

### Property 25: Serialization round-trip

*For any* valid branded interface instance, serializing with `interfaceSerializer().serialize()` then deserializing with `deserialize()` should produce a value whose enumerable properties are deeply equal to the original instance's enumerable properties.

**Validates: Requirements 9.1, 9.2, 9.3, 9.5**

### Property 26: Deserialization rejects invalid input

*For any* JSON string that does not match the interface schema, `deserialize()` should return a failure result with a descriptive error.

**Validates: Requirements 9.4**

### Property 27: JSON Schema correctness

*For any* branded interface definition, `interfaceToJsonSchema()` should produce an object with `type: "object"`, `properties` matching the field schema types, `required` array containing only non-optional field names, and nullable fields represented as type unions.

**Validates: Requirements 10.1, 10.2, 10.5**

### Property 28: JSON Schema enum references

*For any* branded interface definition with a field referencing a branded enum, the generated JSON Schema property should contain an `enum` array with exactly the values from the referenced enum.

**Validates: Requirements 10.3**

### Property 29: Zod schema correctness

*For any* branded interface definition, `interfaceToZodSchema()` should produce a definition with correct Zod type mappings, optional/nullable flags matching the field schema, and enum references for branded enum fields.

**Validates: Requirements 11.1, 11.2, 11.3, 11.4**

### Property 30: Watcher invocation on create and validate

*For any* branded interface definition with a registered watcher callback, calling `create()` or `validate()` should invoke the callback with an event containing the correct interface ID, event type, and value. After `unwatch()`, the callback should no longer be invoked.

**Validates: Requirements 12.1, 12.2, 12.3**

### Property 31: Decorator validates assignments

*For any* class with a `@BrandedField()` decorated accessor, assigning a value that passes the branded type's validation should succeed, and assigning a value that fails should throw a descriptive error.

**Validates: Requirements 13.1, 13.2**

### Property 32: Version stored in definition metadata

*For any* interface created with a `version` option, the definition's `INTERFACE_VERSION` symbol and `version` property should equal the specified version number.

**Validates: Requirements 14.1**

### Property 33: Migration transforms to target version

*For any* branded instance with a registered migration chain from version A to version B, calling `migrate(instance, B)` should produce an instance at version B with the migration function applied. Calling `migrate()` with a version that has no path should throw.

**Validates: Requirements 14.3, 14.4**

### Property 34: Builder accumulates fields and builds correctly

*For any* sequence of `.field()` and `.optional()` calls on a builder, `.build()` should produce a definition whose schema contains exactly those fields with correct optional flags.

**Validates: Requirements 15.2, 15.3, 15.4**

### Property 35: Structural subtyping correctness

*For any* two branded interface definitions, `isSubtype(A, B)` should return `true` if and only if A's schema contains every field in B's schema with a compatible type.

**Validates: Requirements 16.1, 16.2, 16.3**

### Property 36: Codec pipeline execution order and error handling

*For any* codec pipeline with N transform steps, `execute()` should apply steps in order and return a success result for valid input. If any step throws, `execute()` should return a failure result identifying the failing step index.

**Validates: Requirements 17.2, 17.3, 17.4**

### Property 37: Opaque type wrap/unwrap round-trip

*For any* opaque type definition and any valid value, `unwrap(wrap(value))` should equal the original value. Calling `unwrap()` with a value not created by the corresponding `wrap()` should throw.

**Validates: Requirements 18.2, 18.3, 18.4**

## Error Handling

All error handling follows the existing library conventions:

1. **Validation errors** (from `create()`, `assertOfInterface()`, decorators): Throw `Error` with descriptive messages including the interface/primitive ID, field name, expected type, and actual value type.

2. **Registration errors** (duplicate cross-kind IDs, duplicate composition fields): Throw `Error` with messages identifying the conflicting IDs or field names and their sources.

3. **Safe parse results**: Return discriminated unions `{ success: true, value }` or `{ success: false, error: { message, code, input, ... } }` — never throw.

4. **Serialization errors**: `deserialize()` returns failure results. `deserializeOrThrow()` throws for convenience.

5. **Migration errors**: Throw when no migration path exists, with a message listing the source version, target version, and available versions.

6. **Codec pipeline errors**: Return failure results with the step index and original error message. Never throw from `execute()`.

7. **Opaque type errors**: `unwrap()` throws when the value lacks the correct `OPAQUE_ID` symbol.

Error codes follow the pattern established by `SafeParseErrorCode` in the enum guards:
- `INVALID_DEFINITION` — the definition argument is not a valid branded interface/primitive definition
- `INVALID_VALUE_TYPE` — the value is not the expected base type
- `FIELD_VALIDATION_FAILED` — one or more fields failed schema validation
- `NOT_BRANDED_INSTANCE` — the value is not a branded instance of the expected definition

## Testing Strategy

### Testing Framework

- **Unit tests**: Jest 30 (already configured in the project)
- **Property-based tests**: fast-check 4.5.3 (already a dependency)
- **Minimum iterations**: 100 per property test

### Dual Testing Approach

**Unit tests** cover:
- Specific examples demonstrating correct behavior for each API function
- Edge cases: empty schemas, single-field schemas, deeply nested objects
- Error conditions: all error paths with expected error messages
- Integration points: cross-validation with branded enums, decorator behavior
- Built-in refinement types with known valid/invalid examples (e.g., specific email strings, UUID formats)

**Property-based tests** cover:
- All 37 correctness properties defined above
- Each property is a single `fc.assert(fc.property(...))` call
- Custom arbitraries for generating random field schemas, matching data, and non-matching data
- Each test tagged with: `Feature: branded-interfaces, Property {N}: {title}`

### Custom Arbitraries (fast-check)

Key generators needed:
- `arbFieldDescriptor()` — generates random `FieldDescriptor` objects with valid type/optional/nullable combinations
- `arbInterfaceSchema()` — generates random `InterfaceSchema` with 1-10 fields
- `arbMatchingData(schema)` — given a schema, generates a plain object that matches it
- `arbNonMatchingData(schema)` — given a schema, generates a plain object that does NOT match it
- `arbPrimitiveBaseType()` — generates `'string' | 'number' | 'boolean'`
- `arbMatchingPrimitive(baseType)` — generates a value of the correct base type
- `arbNonMatchingPrimitive(baseType)` — generates a value of the wrong base type
- `arbUniqueId()` — generates unique string IDs for definitions (to avoid registry collisions across test runs)

### Test File Organization

```
src/lib/branded-interfaces/__tests__/
  factory.test.ts          — Properties 1-4, unit tests for createBrandedInterface
  primitives.test.ts       — Properties 5-8, unit tests for createBrandedPrimitive and refinements
  registry.test.ts         — Properties 9-10, unit tests for registry functions
  guards.test.ts           — Properties 11-13, unit tests for type guards
  accessors.test.ts        — Property 14, unit tests for metadata accessors
  compose.test.ts          — Properties 15-18, unit tests for composition/extension
  variants.test.ts         — Properties 19-22, unit tests for partial/pick/omit
  diff.test.ts             — Properties 23-24, unit tests for diff/intersect
  serializer.test.ts       — Properties 25-26, unit tests for serialization
  json-schema.test.ts      — Properties 27-28, unit tests for JSON Schema generation
  zod-schema.test.ts       — Property 29, unit tests for Zod schema generation
  watch.test.ts            — Property 30, unit tests for watchers
  decorators.test.ts       — Property 31, unit tests for decorators
  versioning.test.ts       — Properties 32-33, unit tests for versioning/migration
  builder.test.ts          — Property 34, unit tests for builder pattern
  subtype.test.ts          — Property 35, unit tests for structural subtyping
  codec.test.ts            — Property 36, unit tests for codec pipelines
  opaque.test.ts           — Property 37, unit tests for opaque types
  arbitraries.ts           — Shared fast-check arbitrary generators
```
