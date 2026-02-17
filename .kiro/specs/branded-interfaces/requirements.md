# Requirements Document

## Introduction

This document specifies the requirements for the Branded Interfaces module, a major extension to the `@digitaldefiance/branded-interface` library. The module extends the branding concept from enums to arbitrary interfaces, primitives, and structured data. It provides a type-safe factory system for creating branded (nominal) types with runtime validation, composition, serialization, and schema generation capabilities that mirror and integrate with the existing branded enum system.

## Glossary

- **Branded_Interface**: A runtime-validated, nominally-typed object produced by a Branded_Interface_Definition. Carries phantom type brand metadata and validates its shape at construction time.
- **Branded_Interface_Definition**: The frozen descriptor object returned by `createBrandedInterface()`. Contains the schema, validator, constructor, and metadata for a specific branded interface type. Analogous to a branded enum object.
- **Branded_Primitive**: A primitive value (string, number, boolean) wrapped with a phantom type brand and optional validation predicate. Produced by `createBrandedPrimitive()`.
- **Branded_Primitive_Definition**: The frozen descriptor returned by `createBrandedPrimitive()`. Contains the validator, constructor, and metadata for a branded primitive type.
- **Refinement_Type**: A Branded_Primitive with an attached validation predicate that constrains the set of valid values beyond the base type (e.g., `Email`, `PositiveInt`, `NonEmptyString`).
- **Interface_Registry**: A global registry on `globalThis` that tracks all Branded_Interface_Definitions and Branded_Primitive_Definitions, analogous to the existing `BrandedEnumRegistry`.
- **Field_Schema**: A descriptor for a single field in a Branded_Interface_Definition, specifying the field name, type, whether it is optional, nullable, and any validation predicate or branded type reference.
- **Schema_Version**: A numeric version tag attached to a Branded_Interface_Definition, enabling migration between schema versions.
- **Codec_Pipeline**: A composable chain of parse, validate, transform, and brand steps that processes raw input into a validated branded instance.
- **Builder**: A fluent API object for incrementally constructing a Branded_Interface_Definition by chaining `.field()`, `.optional()`, `.validate()`, and `.build()` calls.
- **System**: The Branded Interfaces module within the `@digitaldefiance/branded-interface` library.

## Requirements

### Requirement 1: Branded Interface Factory

**User Story:** As a developer, I want to create branded interface types with runtime validation, so that I can enforce nominal typing and shape validation on plain objects.

#### Acceptance Criteria

1. WHEN `createBrandedInterface()` is called with a unique interface ID and a field schema, THE System SHALL return a frozen Branded_Interface_Definition containing a `create()` constructor, a `validate()` function, and Symbol-based metadata.
2. WHEN `createBrandedInterface()` is called with an interface ID that is already registered, THE System SHALL return the existing Branded_Interface_Definition (idempotent behavior).
3. WHEN `create()` is called on a Branded_Interface_Definition with a valid plain object matching the field schema, THE System SHALL return a frozen branded instance with non-enumerable Symbol metadata for the interface ID.
4. WHEN `create()` is called with an object that does not match the field schema, THE System SHALL throw a descriptive error identifying which fields failed validation.
5. WHEN a field schema includes a reference to a Branded_Enum or another Branded_Interface_Definition, THE System SHALL cross-validate the field value against the referenced branded type.
6. THE System SHALL support field types including `string`, `number`, `boolean`, `object`, `array`, references to Branded_Enum types, references to other Branded_Interface_Definitions, and references to Branded_Primitive_Definitions.
7. THE System SHALL support optional and nullable field modifiers in the field schema.

### Requirement 2: Branded Primitives and Refinement Types

**User Story:** As a developer, I want to create branded primitive types with validation predicates, so that I can distinguish between semantically different values of the same base type (e.g., UserId vs OrderId, Email vs NonEmptyString).

#### Acceptance Criteria

1. WHEN `createBrandedPrimitive()` is called with a unique primitive ID, a base type (`string`, `number`, or `boolean`), and an optional validation predicate, THE System SHALL return a frozen Branded_Primitive_Definition with a `create()` constructor and `validate()` function.
2. WHEN `createBrandedPrimitive()` is called with a primitive ID that is already registered, THE System SHALL return the existing Branded_Primitive_Definition (idempotent behavior).
3. WHEN `create()` is called on a Branded_Primitive_Definition with a value matching the base type and passing the validation predicate, THE System SHALL return the branded value.
4. WHEN `create()` is called with a value that does not match the base type, THE System SHALL throw a descriptive error.
5. WHEN `create()` is called with a value that matches the base type but fails the validation predicate, THE System SHALL throw a descriptive error including the predicate name.
6. THE System SHALL provide built-in refinement type factories for common patterns: `Email`, `NonEmptyString`, `PositiveInt`, `NonNegativeInt`, `Url`, and `Uuid`.

### Requirement 3: Interface Registry

**User Story:** As a developer, I want all branded interface and primitive definitions tracked in a global registry, so that I can discover, introspect, and look up branded types at runtime across module boundaries.

#### Acceptance Criteria

1. WHEN a Branded_Interface_Definition is created, THE System SHALL register it in the Interface_Registry on `globalThis`.
2. WHEN a Branded_Primitive_Definition is created, THE System SHALL register it in the Interface_Registry on `globalThis`.
3. THE System SHALL provide `getAllInterfaceIds()` to retrieve all registered interface and primitive IDs.
4. THE System SHALL provide `getInterfaceById()` to retrieve a Branded_Interface_Definition or Branded_Primitive_Definition by its ID.
5. THE System SHALL provide `resetInterfaceRegistry()` for testing purposes to clear all registered definitions.
6. IF a registration is attempted with a duplicate ID of a different kind (e.g., an interface ID colliding with a primitive ID), THEN THE System SHALL throw a descriptive error.

### Requirement 4: Type Guards and Safe Parsing

**User Story:** As a developer, I want type guard functions for branded interfaces and primitives, so that I can safely validate unknown data at runtime boundaries.

#### Acceptance Criteria

1. WHEN `isOfInterface()` is called with a value and a Branded_Interface_Definition, THE System SHALL return `true` if the value is a branded instance of that definition, and `false` otherwise.
2. WHEN `assertOfInterface()` is called with a value that is not a branded instance of the specified definition, THE System SHALL throw a descriptive error.
3. WHEN `safeParseInterface()` is called with a value and a Branded_Interface_Definition, THE System SHALL return a discriminated union result with either `{ success: true, value }` or `{ success: false, error }` containing a descriptive error code and message.
4. WHEN `isOfPrimitive()` is called with a value and a Branded_Primitive_Definition, THE System SHALL return `true` if the value is a branded instance of that primitive, and `false` otherwise.
5. WHEN `safeParseInterface()` is called with a plain object that matches the schema but is not yet branded, THE System SHALL validate and brand the object, returning a success result.

### Requirement 5: Metadata and Accessors

**User Story:** As a developer, I want to retrieve metadata from branded interface instances and definitions, so that I can introspect types at runtime for debugging and tooling.

#### Acceptance Criteria

1. THE System SHALL provide `getInterfaceId()` to retrieve the interface ID from a branded instance or definition.
2. THE System SHALL provide `getInterfaceSchema()` to retrieve the field schema from a Branded_Interface_Definition.
3. THE System SHALL provide `getInterfaceFields()` to retrieve the list of field names from a Branded_Interface_Definition.
4. THE System SHALL provide `interfaceFieldCount()` to retrieve the number of fields in a Branded_Interface_Definition.

### Requirement 6: Composition and Extension

**User Story:** As a developer, I want to compose and extend branded interfaces, so that I can build complex types from simpler ones without duplication.

#### Acceptance Criteria

1. WHEN `composeInterfaces()` is called with a new ID and two or more Branded_Interface_Definitions, THE System SHALL return a new Branded_Interface_Definition containing all fields from all source definitions.
2. IF `composeInterfaces()` encounters duplicate field names across source definitions, THEN THE System SHALL throw a descriptive error identifying the conflicting field and source definitions.
3. WHEN `extendInterface()` is called with a base Branded_Interface_Definition, a new ID, and additional fields, THE System SHALL return a new Branded_Interface_Definition containing all base fields plus the additional fields.
4. IF `extendInterface()` encounters a field name that conflicts with an existing base field, THEN THE System SHALL throw a descriptive error.

### Requirement 7: Partial, Pick, and Omit Variants

**User Story:** As a developer, I want to derive partial, picked, and omitted variants of branded interfaces, so that I can create type-safe subsets for different use cases (e.g., creation DTOs, update patches).

#### Acceptance Criteria

1. WHEN `partialInterface()` is called with a Branded_Interface_Definition and a new ID, THE System SHALL return a new Branded_Interface_Definition where all fields are optional.
2. WHEN `pickFields()` is called with a Branded_Interface_Definition, a new ID, and a list of field names, THE System SHALL return a new Branded_Interface_Definition containing only the specified fields.
3. WHEN `omitFields()` is called with a Branded_Interface_Definition, a new ID, and a list of field names, THE System SHALL return a new Branded_Interface_Definition containing all fields except the specified ones.
4. IF `pickFields()` is called with a field name that does not exist in the source definition, THEN THE System SHALL throw a descriptive error.
5. IF `omitFields()` is called with a field name that does not exist in the source definition, THEN THE System SHALL throw a descriptive error.

### Requirement 8: Interface Diff and Intersect

**User Story:** As a developer, I want to compute the difference and intersection of branded interface schemas, so that I can analyze and compare type structures at runtime.

#### Acceptance Criteria

1. WHEN `interfaceDiff()` is called with two Branded_Interface_Definitions, THE System SHALL return an object describing fields unique to each definition and fields present in both.
2. WHEN `interfaceIntersect()` is called with two Branded_Interface_Definitions, THE System SHALL return a new Branded_Interface_Definition containing only the fields present in both source definitions with compatible types.
3. IF `interfaceIntersect()` encounters fields with the same name but incompatible types, THEN THE System SHALL exclude those fields from the result and include them in a `conflicts` list.

### Requirement 9: Serialization and Deserialization

**User Story:** As a developer, I want to serialize branded interface instances to JSON and deserialize them back with brand validation, so that I can safely transmit branded data across boundaries.

#### Acceptance Criteria

1. WHEN `interfaceSerializer()` is called with a Branded_Interface_Definition, THE System SHALL return a serializer object with `serialize()` and `deserialize()` methods.
2. WHEN `serialize()` is called on a branded instance, THE System SHALL produce a JSON string representation of the instance data without Symbol metadata.
3. WHEN `deserialize()` is called with a valid JSON string, THE System SHALL parse, validate against the schema, brand the result, and return a success result.
4. WHEN `deserialize()` is called with an invalid JSON string or data that does not match the schema, THE System SHALL return a failure result with a descriptive error.
5. FOR ALL valid branded instances, serializing then deserializing SHALL produce a value equivalent to the original instance (round-trip property).

### Requirement 10: JSON Schema Generation

**User Story:** As a developer, I want to generate JSON Schema from branded interface definitions, so that I can use them for API documentation, form validation, and interoperability.

#### Acceptance Criteria

1. WHEN `interfaceToJsonSchema()` is called with a Branded_Interface_Definition, THE System SHALL return a valid JSON Schema object describing the interface structure.
2. THE System SHALL map field types to appropriate JSON Schema types (string, number, boolean, object, array).
3. WHEN a field references a Branded_Enum, THE System SHALL generate an `enum` constraint in the JSON Schema with the valid enum values.
4. WHEN a field references a Branded_Primitive_Definition with a known refinement (Email, Uuid, Url), THE System SHALL generate appropriate `format` annotations in the JSON Schema.
5. THE System SHALL correctly represent optional and nullable fields using JSON Schema `required` array and `nullable`/type union patterns.

### Requirement 11: Zod Schema Generation

**User Story:** As a developer, I want to generate Zod schema definitions from branded interface definitions, so that I can integrate with Zod-based validation pipelines.

#### Acceptance Criteria

1. WHEN `interfaceToZodSchema()` is called with a Branded_Interface_Definition, THE System SHALL return a Zod schema definition object describing the interface structure.
2. THE System SHALL map field types to appropriate Zod schema types.
3. WHEN a field references a Branded_Enum, THE System SHALL generate a `z.enum()` constraint with the valid enum values.
4. THE System SHALL correctly represent optional and nullable fields using Zod `.optional()` and `.nullable()` patterns.

### Requirement 12: Watch and Observable

**User Story:** As a developer, I want to observe branded interface creation and validation events, so that I can implement logging, metrics, and debugging tools.

#### Acceptance Criteria

1. WHEN `watchInterface()` is called with a Branded_Interface_Definition and a callback, THE System SHALL invoke the callback whenever `create()` or `validate()` is called on that definition.
2. THE System SHALL provide an `unwatch()` function returned from `watchInterface()` to remove the callback.
3. WHEN the callback is invoked, THE System SHALL pass an event object containing the interface ID, the event type (`create` or `validate`), and the value involved.

### Requirement 13: Decorators

**User Story:** As a developer, I want class decorators for branded interface validation, so that I can use branded types in class-based architectures with automatic validation.

#### Acceptance Criteria

1. WHEN `@BrandedField()` is applied to a class accessor property with a Branded_Interface_Definition or Branded_Primitive_Definition, THE System SHALL validate assigned values against the branded type at runtime.
2. WHEN an invalid value is assigned to a `@BrandedField()` decorated property, THE System SHALL throw a descriptive error.
3. WHEN `@BrandedClass()` is applied to a class with one or more Branded_Interface_Definitions or Branded_Primitive_Definitions, THE System SHALL register the class in the consumer registry for introspection.

### Requirement 14: Interface Versioning

**User Story:** As a developer, I want to version branded interface schemas and define migration functions, so that I can evolve data structures over time while maintaining backward compatibility.

#### Acceptance Criteria

1. WHEN `createBrandedInterface()` is called with a `version` option, THE System SHALL store the Schema_Version in the Branded_Interface_Definition metadata.
2. WHEN `addMigration()` is called with a Branded_Interface_Definition, a source version, a target version, and a migration function, THE System SHALL register the migration.
3. WHEN `migrate()` is called with a branded instance and a target version, THE System SHALL apply the registered migration chain to transform the instance to the target version.
4. IF `migrate()` is called with a target version for which no migration path exists, THEN THE System SHALL throw a descriptive error.

### Requirement 15: Builder Pattern

**User Story:** As a developer, I want a fluent builder API for constructing branded interface definitions, so that I can define complex schemas incrementally with a readable syntax.

#### Acceptance Criteria

1. WHEN `BrandedInterfaceBuilder.create()` is called with an interface ID, THE System SHALL return a Builder instance.
2. WHEN `.field()` is called on a Builder with a field name and type descriptor, THE System SHALL add the field to the pending schema.
3. WHEN `.optional()` is called on a Builder with a field name and type descriptor, THE System SHALL add an optional field to the pending schema.
4. WHEN `.build()` is called on a Builder, THE System SHALL call `createBrandedInterface()` with the accumulated schema and return the resulting Branded_Interface_Definition.
5. IF `.build()` is called on a Builder with no fields defined, THEN THE System SHALL throw a descriptive error.

### Requirement 16: Structural Subtyping Checks

**User Story:** As a developer, I want to check if one branded interface is a structural subtype of another at runtime, so that I can implement safe upcasting and compatibility checks.

#### Acceptance Criteria

1. WHEN `isSubtype()` is called with two Branded_Interface_Definitions, THE System SHALL return `true` if the first definition contains all fields of the second definition with compatible types.
2. WHEN `isSubtype()` is called and the first definition is missing fields from the second, THE System SHALL return `false`.
3. WHEN `isSubtype()` is called and a shared field has an incompatible type, THE System SHALL return `false`.

### Requirement 17: Codec and Transform Pipelines

**User Story:** As a developer, I want to define composable transformation pipelines for branded interfaces, so that I can chain parsing, validation, transformation, and branding steps in a declarative way.

#### Acceptance Criteria

1. WHEN `createCodec()` is called with a Branded_Interface_Definition, THE System SHALL return a Codec_Pipeline with `.pipe()` and `.execute()` methods.
2. WHEN `.pipe()` is called with a transform function, THE System SHALL append the transform to the pipeline.
3. WHEN `.execute()` is called with raw input, THE System SHALL run the input through all pipeline steps in order and return a result object with either the branded output or an error.
4. IF any step in the pipeline throws or returns an error, THEN THE System SHALL short-circuit and return a failure result identifying the failing step.

### Requirement 18: Opaque Type Wrappers

**User Story:** As a developer, I want opaque type wrappers that completely hide the underlying type, so that I can enforce that branded values are only accessed through designated unwrap functions.

#### Acceptance Criteria

1. WHEN `createOpaqueType()` is called with a type ID and a base type, THE System SHALL return an opaque type definition with `wrap()` and `unwrap()` functions.
2. WHEN `wrap()` is called with a valid value, THE System SHALL return an opaque branded value that does not expose the underlying type in its TypeScript type signature.
3. WHEN `unwrap()` is called with an opaque branded value, THE System SHALL return the underlying value with its original type.
4. IF `unwrap()` is called with a value that was not created by the corresponding `wrap()`, THEN THE System SHALL throw a descriptive error.
