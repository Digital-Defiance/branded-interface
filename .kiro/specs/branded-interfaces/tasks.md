# Implementation Plan: Branded Interfaces

## Overview

I've copied the branded enum repository. Make it into the branded-interface repository.

Incremental implementation of the branded interfaces module for `@digitaldefiance/branded-interface`. Each task builds on previous ones, with property tests and unit tests wired in close to the implementation they validate. All code lives under `src/lib/branded-interfaces/` with a barrel export added to `src/index.ts`.

## Tasks

- [x] 1. Core types, factory, and registry
  - [x] 1.1 Create `src/lib/branded-interfaces/types.ts` with all Symbol definitions, `FieldDescriptor`, `InterfaceSchema`, `BrandedInterfaceMetadata`, `BrandedInstance`, `BrandedInterfaceDefinition`, `BrandedPrimitiveDefinition`, `OpaqueTypeDefinition`, `OpaqueValue`, registry types, event types, result types, diff/intersect types, codec types, migration types, builder types, and JSON/Zod schema output types
    - Define `INTERFACE_ID`, `INTERFACE_SCHEMA`, `INTERFACE_VERSION`, `PRIMITIVE_ID`, `PRIMITIVE_BASE_TYPE`, `OPAQUE_ID` symbols
    - Define `INTERFACE_REGISTRY_KEY` constant
    - Export all types and symbols
    - _Requirements: 1.1, 1.6, 1.7, 2.1, 3.1, 3.2_

  - [x] 1.2 Create `src/lib/branded-interfaces/registry.ts` with `getInterfaceRegistry()`, `registerInterfaceEntry()`, `getAllInterfaceIds()`, `getInterfaceById()`, `resetInterfaceRegistry()`
    - Use `globalThis[INTERFACE_REGISTRY_KEY]` pattern matching existing enum registry
    - `registerInterfaceEntry()` should throw on cross-kind ID collision
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 1.3 Create `src/lib/branded-interfaces/factory.ts` with `createBrandedInterface()` and `createBrandedPrimitive()`
    - `createBrandedInterface()`: check registry for idempotence, build `create()` with field validation and Symbol metadata attachment, build `validate()`, freeze definition, register
    - `createBrandedPrimitive()`: check registry for idempotence, build `create()` with base type check and predicate validation, build `validate()`, freeze definition, register
    - Field validation in `create()` must iterate schema, check types, handle optional/nullable, cross-validate branded-interface/interface/primitive refs via registry lookups
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 1.4 Write property tests for factory and registry
    - **Property 1: Interface definition structure and freezing**
    - **Validates: Requirements 1.1**
    - **Property 2: Interface factory idempotence**
    - **Validates: Requirements 1.2**
    - **Property 3: Valid data produces branded instances**
    - **Validates: Requirements 1.3, 1.5, 1.6, 1.7**
    - **Property 4: Invalid data is rejected with field-level errors**
    - **Validates: Requirements 1.4, 1.5**
    - **Property 5: Primitive definition structure and freezing**
    - **Validates: Requirements 2.1**
    - **Property 6: Primitive factory idempotence**
    - **Validates: Requirements 2.2**
    - **Property 7: Primitive create accepts valid values and rejects invalid**
    - **Validates: Requirements 2.3, 2.4, 2.5**
    - **Property 9: Registry tracks all created definitions**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
    - **Property 10: Registry rejects cross-kind ID collisions**
    - **Validates: Requirements 3.6**
    - Create `src/lib/branded-interfaces/__tests__/arbitraries.ts` with shared generators: `arbFieldDescriptor`, `arbInterfaceSchema`, `arbMatchingData`, `arbNonMatchingData`, `arbPrimitiveBaseType`, `arbMatchingPrimitive`, `arbNonMatchingPrimitive`, `arbUniqueId`

  - [x] 1.5 Write unit tests for factory and registry
    - Test `createBrandedInterface()` with specific examples: simple schema, nested refs, optional/nullable fields
    - Test `createBrandedPrimitive()` with string/number/boolean base types
    - Test registry functions: `getAllInterfaceIds()`, `getInterfaceById()`, `resetInterfaceRegistry()`
    - Test error cases: invalid field data, cross-kind ID collision
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 2. Checkpoint - Core foundation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Refinement types, guards, and accessors
  - [x] 3.1 Create `src/lib/branded-interfaces/refinements.ts` with built-in refinement types: `Email`, `NonEmptyString`, `PositiveInt`, `NonNegativeInt`, `Url`, `Uuid`
    - Each created via `createBrandedPrimitive()` with appropriate validation predicates
    - Email: regex-based validation
    - NonEmptyString: `value.trim().length > 0`
    - PositiveInt: `Number.isInteger(value) && value > 0`
    - NonNegativeInt: `Number.isInteger(value) && value >= 0`
    - Url: URL constructor-based validation
    - Uuid: UUID v4 regex validation
    - _Requirements: 2.6_

  - [x] 3.2 Create `src/lib/branded-interfaces/guards.ts` with `isOfInterface()`, `assertOfInterface()`, `safeParseInterface()`, `isOfPrimitive()`
    - `isOfInterface()`: check for `INTERFACE_ID` symbol matching definition ID
    - `assertOfInterface()`: call `isOfInterface()`, throw if false
    - `safeParseInterface()`: return discriminated union, validate and brand unbranded objects on success
    - `isOfPrimitive()`: check for `PRIMITIVE_ID` symbol matching definition ID
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 3.3 Create `src/lib/branded-interfaces/accessors.ts` with `getInterfaceId()`, `getInterfaceSchema()`, `getInterfaceFields()`, `interfaceFieldCount()`
    - Each checks for the appropriate Symbol before accessing metadata
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 3.4 Write property tests for refinements, guards, and accessors
    - **Property 8: Built-in refinement types validate correctly**
    - **Validates: Requirements 2.6**
    - **Property 11: Type guard consistency**
    - **Validates: Requirements 4.1, 4.2**
    - **Property 12: Safe parse brands unbranded valid objects**
    - **Validates: Requirements 4.3, 4.5**
    - **Property 13: Primitive type guard correctness**
    - **Validates: Requirements 4.4**
    - **Property 14: Metadata accessors return correct values**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

  - [x] 3.5 Write unit tests for refinements, guards, and accessors
    - Test each refinement type with known valid/invalid values (e.g., `test@example.com` for Email, `not-an-email` rejected)
    - Test guards with branded and non-branded values
    - Test accessors with definitions and non-definition objects
    - _Requirements: 2.6, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4_

- [x] 4. Checkpoint - Validation layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Composition, variants, diff, and subtyping
  - [x] 5.1 Create `src/lib/branded-interfaces/compose.ts` with `composeInterfaces()`, `extendInterface()`, `partialInterface()`, `pickFields()`, `omitFields()`
    - All functions create new definitions via `createBrandedInterface()`
    - `composeInterfaces()`: merge schemas, throw on duplicate field names
    - `extendInterface()`: merge base schema with additional fields, throw on conflicts
    - `partialInterface()`: clone schema with all fields set to `optional: true`
    - `pickFields()`: create schema with only specified fields, throw on unknown field names
    - `omitFields()`: create schema with all fields except specified, throw on unknown field names
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 5.2 Create `src/lib/branded-interfaces/diff.ts` with `interfaceDiff()` and `interfaceIntersect()`
    - `interfaceDiff()`: partition fields into onlyInFirst, onlyInSecond, inBoth
    - `interfaceIntersect()`: create definition with compatible shared fields, report conflicts
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 5.3 Create `src/lib/branded-interfaces/subtype.ts` with `isSubtype()`
    - Check that candidate contains all supertype fields with compatible types (same `type`, same `ref` if present)
    - _Requirements: 16.1, 16.2, 16.3_

  - [x] 5.4 Write property tests for composition, variants, diff, and subtyping
    - **Property 15: Composition produces union of fields**
    - **Validates: Requirements 6.1**
    - **Property 16: Composition rejects duplicate fields**
    - **Validates: Requirements 6.2**
    - **Property 17: Extension adds fields to base**
    - **Validates: Requirements 6.3**
    - **Property 18: Extension rejects conflicting fields**
    - **Validates: Requirements 6.4**
    - **Property 19: Partial makes all fields optional**
    - **Validates: Requirements 7.1**
    - **Property 20: Pick retains only specified fields**
    - **Validates: Requirements 7.2**
    - **Property 21: Omit removes only specified fields**
    - **Validates: Requirements 7.3**
    - **Property 22: Pick and Omit reject unknown field names**
    - **Validates: Requirements 7.4, 7.5**
    - **Property 23: Diff partitions fields correctly**
    - **Validates: Requirements 8.1**
    - **Property 24: Intersect produces compatible shared fields and reports conflicts**
    - **Validates: Requirements 8.2, 8.3**
    - **Property 35: Structural subtyping correctness**
    - **Validates: Requirements 16.1, 16.2, 16.3**

  - [x] 5.5 Write unit tests for composition, variants, diff, and subtyping
    - Test compose with 2-3 non-overlapping definitions, test duplicate field error
    - Test extend with base + additional fields, test conflict error
    - Test partial/pick/omit with specific schemas
    - Test diff with overlapping and non-overlapping definitions
    - Test intersect with compatible and incompatible shared fields
    - Test isSubtype with subtype, non-subtype, and incompatible-type cases
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 16.1, 16.2, 16.3_

- [x] 6. Checkpoint - Composition layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Serialization, JSON Schema, and Zod Schema
  - [x] 7.1 Create `src/lib/branded-interfaces/serializer.ts` with `interfaceSerializer()`
    - `serialize()`: extract enumerable properties, `JSON.stringify()`
    - `deserialize()`: parse JSON, validate against schema via definition's `validate()`, brand via `create()`, return discriminated union result
    - `deserializeOrThrow()`: call `deserialize()`, throw on failure
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 7.2 Create `src/lib/branded-interfaces/json-schema.ts` with `interfaceToJsonSchema()`
    - Map FieldDescriptor types to JSON Schema types
    - Handle optional via `required` array, nullable via type union `[type, "null"]`
    - For `branded-interface` refs: look up enum in enum registry, emit `{ enum: [...values] }`
    - For `branded-primitive` refs with known refinements: emit `format` annotations
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 7.3 Create `src/lib/branded-interfaces/zod-schema.ts` with `interfaceToZodSchema()`
    - Map FieldDescriptor types to Zod type strings
    - Handle optional/nullable with `.optional()` and `.nullable()` patterns
    - For `branded-interface` refs: emit `z.enum()` with values
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 7.4 Write property tests for serialization and schema generation
    - **Property 25: Serialization round-trip**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
    - **Property 26: Deserialization rejects invalid input**
    - **Validates: Requirements 9.4**
    - **Property 27: JSON Schema correctness**
    - **Validates: Requirements 10.1, 10.2, 10.5**
    - **Property 28: JSON Schema enum references**
    - **Validates: Requirements 10.3**
    - **Property 29: Zod schema correctness**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4**

  - [x] 7.5 Write unit tests for serialization and schema generation
    - Test serialize/deserialize round-trip with specific instances
    - Test deserialize with invalid JSON, wrong types, missing fields
    - Test JSON Schema output for each field type, optional/nullable, enum refs, refinement format annotations
    - Test Zod schema output for each field type, optional/nullable, enum refs
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4_

- [x] 8. Checkpoint - Serialization layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Watch, decorators, versioning, builder, codec, and opaque types
  - [x] 9.1 Create `src/lib/branded-interfaces/watch.ts` with `watchInterface()`
    - Use a watcher registry on `globalThis` under a separate key
    - Return `{ unwatch }` function
    - Hook into factory's `create()` and `validate()` to invoke callbacks
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 9.2 Create `src/lib/branded-interfaces/decorators.ts` with `@BrandedField()` and `@BrandedClass()`
    - `@BrandedField()`: TC39 stage 3 class accessor decorator, validate via definition's `validate()` on set/init
    - `@BrandedClass()`: class decorator, register in consumer registry
    - Follow same pattern as existing `@EnumValue` and `@EnumClass`
    - _Requirements: 13.1, 13.2, 13.3_

  - [x] 9.3 Create `src/lib/branded-interfaces/versioning.ts` with `addMigration()` and `migrate()`
    - Store migrations in a Map on `globalThis` keyed by interface ID
    - `migrate()`: find path from instance version to target version, apply migration chain, re-brand at target version
    - Throw if no migration path exists
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 9.4 Create `src/lib/branded-interfaces/builder.ts` with `createBuilder()`
    - Fluent API: `.field(name, descriptor)`, `.optional(name, descriptor)`, `.build()`
    - `.build()` calls `createBrandedInterface()` with accumulated schema
    - Throw if no fields defined on `.build()`
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [x] 9.5 Create `src/lib/branded-interfaces/codec.ts` with `createCodec()`
    - Initial step: validate and brand via definition
    - `.pipe(transform)`: append transform, return new pipeline
    - `.execute(input)`: run all steps, catch errors, return result with step index on failure
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

  - [x] 9.6 Create `src/lib/branded-interfaces/opaque.ts` with `createOpaqueType()`
    - `wrap()`: create object with `OPAQUE_ID` symbol and stored value
    - `unwrap()`: check `OPAQUE_ID` matches, return stored value
    - Register in interface registry as kind `'opaque'`
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [x] 9.7 Write property tests for advanced features
    - **Property 30: Watcher invocation on create and validate**
    - **Validates: Requirements 12.1, 12.2, 12.3**
    - **Property 31: Decorator validates assignments**
    - **Validates: Requirements 13.1, 13.2**
    - **Property 32: Version stored in definition metadata**
    - **Validates: Requirements 14.1**
    - **Property 33: Migration transforms to target version**
    - **Validates: Requirements 14.3, 14.4**
    - **Property 34: Builder accumulates fields and builds correctly**
    - **Validates: Requirements 15.2, 15.3, 15.4**
    - **Property 35: Structural subtyping correctness** (already in 5.4, skip if done)
    - **Property 36: Codec pipeline execution order and error handling**
    - **Validates: Requirements 17.2, 17.3, 17.4**
    - **Property 37: Opaque type wrap/unwrap round-trip**
    - **Validates: Requirements 18.2, 18.3, 18.4**

  - [x] 9.8 Write unit tests for advanced features
    - Test watchInterface with create/validate events, test unwatch
    - Test @BrandedField with valid/invalid assignments, optional/nullable
    - Test @BrandedClass registration in consumer registry
    - Test addMigration and migrate with version chains, test missing path error
    - Test builder with field/optional/build, test empty build error
    - Test codec pipeline with transforms, test error short-circuit
    - Test opaque wrap/unwrap round-trip, test unwrap with wrong value
    - _Requirements: 12.1, 12.2, 12.3, 13.1, 13.2, 13.3, 14.1, 14.2, 14.3, 14.4, 15.1, 15.2, 15.3, 15.4, 15.5, 17.1, 17.2, 17.3, 17.4, 18.1, 18.2, 18.3, 18.4_

- [x] 10. Checkpoint - Advanced features
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Barrel export and public API wiring
  - [x] 11.1 Create `src/lib/branded-interfaces/index.ts` barrel file exporting all public APIs
    - Export all types from `types.ts`
    - Export factory functions from `factory.ts`
    - Export registry functions from `registry.ts`
    - Export guards from `guards.ts`
    - Export accessors from `accessors.ts`
    - Export composition functions from `compose.ts`
    - Export diff/intersect from `diff.ts`
    - Export subtype from `subtype.ts`
    - Export serializer from `serializer.ts`
    - Export JSON schema from `json-schema.ts`
    - Export Zod schema from `zod-schema.ts`
    - Export watch from `watch.ts`
    - Export decorators from `decorators.ts`
    - Export versioning from `versioning.ts`
    - Export builder from `builder.ts`
    - Export codec from `codec.ts`
    - Export opaque from `opaque.ts`
    - Export refinements from `refinements.ts`
    - _Requirements: all_

  - [x] 11.2 Update `src/index.ts` to add a `Branded Interfaces` section re-exporting from `src/lib/branded-interfaces/index.ts`
    - Follow the existing pattern of sectioned exports with comments
    - _Requirements: all_

- [x] 12. Clean up old branded-enum code
  - Get rid of anything that is not branded-interface
- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.



## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (37 total)
- Unit tests validate specific examples and edge cases
- All files use `.js` extension in imports for ESM compatibility (matching existing codebase convention)
- Registry cleanup via `resetInterfaceRegistry()` should be called in `beforeEach` of all test files
