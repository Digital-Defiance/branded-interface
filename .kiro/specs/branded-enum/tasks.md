# Implementation Plan: branded-interface

## Overview

This plan implements the branded-interface library as a new Nx library in the monorepo. The library provides runtime-identifiable enum-like types for TypeScript with zero runtime overhead for value access.

## Tasks

- [ ] 1. Set up library project structure
  - [x] 1.1 Generate new Nx standalone nx-monorepo typescript library `branded-interface` using `@nx/js:library`
    - Configure as publishable library with `@digitaldefiance/branded-interface` package name
    - Set up TypeScript configuration
    - Configure Jest for testing with fast-check support
    - _Requirements: Project setup_

  - [x] 1.2 Create core type definitions in `src/types.ts`
    - Define Symbol constants for ENUM_ID and ENUM_VALUES
    - Define BrandedEnumMetadata interface
    - Define BrandedEnum<T> type
    - Define BrandedEnumValue<E> utility type
    - Define RegistryEntry and BrandedEnumRegistry interfaces
    - _Requirements: 1.1, 1.2, 1.3, 7.1, 7.2_

- [x] 2. Implement global registry
  - [x] 2.1 Create registry module in `src/registry.ts`
    - Implement getRegistry() with lazy initialization on globalThis
    - Implement registerEnum() to add enum to registry and value index
    - Implement internal lookups for registry operations
    - _Requirements: 5.1, 1.6_

  - [x] 2.2 Implement registry query functions
    - Implement getAllEnumIds() returning array of registered IDs
    - Implement getEnumById(enumId) returning enum or undefined
    - Implement findEnumSources(value) returning array of enum IDs
    - _Requirements: 5.3, 5.4, 5.5, 3.1, 3.2, 3.3_

  - [x] 2.3 Write property test for registry lookup correctness
    - **Property 6: Registry Lookup Correctness**
    - **Validates: Requirements 5.3, 5.4, 5.5**

  - [x] 2.4 Write property test for find enum sources
    - **Property 3: Find Enum Sources Correctness**
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 3. Implement branded enum factory
  - [x] 3.1 Create factory module in `src/factory.ts`
    - Implement createBrandedEnum(enumId, values) function
    - Attach non-enumerable Symbol properties for metadata
    - Freeze the resulting object
    - Register in global registry
    - Throw error for duplicate enum IDs
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 5.2_

  - [x] 3.2 Write property test for enum creation correctness
    - **Property 1: Enum Creation Correctness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.6**

  - [x] 3.3 Write property test for duplicate ID rejection
    - **Property 5: Duplicate ID Rejection**
    - **Validates: Requirements 5.2**

  - [x] 3.4 Write property test for serialization correctness
    - **Property 7: Serialization and Enumeration Correctness**
    - **Validates: Requirements 6.1, 6.2, 6.3, 8.1, 8.2, 8.3, 8.4, 8.5**

- [x] 4. Checkpoint - Ensure core functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement type guards
  - [x] 5.1 Create guards module in `src/guards.ts`
    - Implement isFromEnum(value, enumObj) type guard
    - Check if enumObj is a branded enum (has Symbol metadata)
    - Check if value exists in enum's value Set
    - Return false for non-string values
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 5.2 Implement assertFromEnum(value, enumObj)
    - Throw descriptive error if value not in enum
    - Throw error if enumObj is not a branded enum
    - Return value with narrowed type if valid
    - _Requirements: 9.7, 9.8_

  - [x] 5.3 Write property test for type guard correctness
    - **Property 2: Type Guard Correctness**
    - **Validates: Requirements 2.1, 2.2, 2.4, 2.5**

  - [x] 5.4 Write property test for assert type guard
    - **Property 12: Assert Type Guard Correctness**
    - **Validates: Requirements 9.7, 9.8**

- [x] 6. Implement metadata accessors
  - [x] 6.1 Create accessors module in `src/accessors.ts`
    - Implement getEnumId(enumObj) returning ID or undefined
    - Implement getEnumValues(enumObj) returning values array or undefined
    - Implement enumSize(enumObj) returning count or undefined
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 9.4_

  - [x] 6.2 Write property test for metadata accessor correctness
    - **Property 4: Metadata Accessor Correctness**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

  - [x] 6.3 Write property test for enum size correctness
    - **Property 9: Enum Size Correctness**
    - **Validates: Requirements 9.4**

- [x] 7. Implement utility functions
  - [x] 7.1 Create utils module in `src/utils.ts`
    - Implement hasValue(enumObj, value) for reverse lookup
    - Implement getKeyForValue(enumObj, value) returning key or undefined
    - Implement isValidKey(enumObj, key) returning boolean
    - Implement enumEntries(enumObj) returning iterator
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.6_

  - [x] 7.2 Write property test for reverse lookup correctness
    - **Property 8: Reverse Lookup Correctness**
    - **Validates: Requirements 9.1, 9.2, 9.3**

  - [x] 7.3 Write property test for key validation correctness
    - **Property 11: Key Validation Correctness**
    - **Validates: Requirements 9.6**

  - [x] 7.4 Write property test for enum entries iterator
    - **Property 10: Enum Entries Iterator Correctness**
    - **Validates: Requirements 9.5**

- [x] 8. Checkpoint - Ensure all core features work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement enum composition
  - [x] 9.1 Create merge module in `src/merge.ts`
    - Implement mergeEnums(newId, ...enums) function
    - Collect all key-value pairs from source enums
    - Throw error for duplicate keys
    - Allow duplicate values (intentional overlaps)
    - Register merged enum in global registry
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 9.2 Write property test for enum merge correctness
    - **Property 13: Enum Merge Correctness**
    - **Validates: Requirements 10.1, 10.2, 10.4**

  - [x] 9.3 Write property test for merge key collision rejection
    - **Property 14: Merge Key Collision Rejection**
    - **Validates: Requirements 10.3**

- [x] 10. Create public API and exports
  - [x] 10.1 Create main entry point in `src/index.ts`
    - Export all public functions from modules
    - Export all public types
    - Do NOT export internal Symbol constants
    - _Requirements: All_

  - [x] 10.2 Add JSDoc documentation to all exported functions
    - Document parameters, return types, and examples
    - Document error conditions
    - _Requirements: Documentation_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify library builds successfully with `nx build branded-interface`
  - Verify all property tests pass with minimum 100 iterations

- [x] 12. Write comprehensive README.md
    - Explain library purpose and benefits
    - Show usage examples
    - Document all public APIs
    - Include installation instructions
    - _Requirements: Documentation_

- [x] 13. Think up and implement any out of the box, groundbreaking features we can offer based on our design
  - [x] 13.1 Implement `@EnumValue` decorator for class properties
    - Create decorator that validates property values against a branded enum at runtime
    - Throw descriptive error if assigned value is not in the enum
    - Support optional/nullable properties
    - _Requirements: Novel feature - runtime validation via decorators_

  - [x] 13.2 Implement `@EnumClass` decorator for enum-backed classes
    - Create class decorator that auto-registers class as enum consumer
    - Track which classes use which enums for debugging/introspection
    - _Requirements: Novel feature - enum usage tracking_

  - [x] 13.3 Implement `enumSubset` for creating filtered enums
    - Create function to derive a new enum from a subset of keys
    - Maintain type safety with the subset
    - Register subset as independent enum in registry
    - _Requirements: Novel feature - enum subsetting_

  - [x] 13.4 Implement `enumExclude` for creating enums by exclusion
    - Create function to derive enum by excluding specific keys
    - Complement to enumSubset
    - _Requirements: Novel feature - enum exclusion_

  - [x] 13.5 Implement `enumMap` for transforming enum values
    - Create function to transform all values through a mapper function
    - Useful for prefixing, suffixing, or transforming values
    - _Requirements: Novel feature - enum value transformation_

  - [x] 13.6 Implement `enumFromKeys` for creating enums from key arrays
    - Create function that generates enum where keys equal values
    - Common pattern: `{ Active: 'Active', Inactive: 'Inactive' }`
    - _Requirements: Novel feature - simplified enum creation_

  - [x] 13.7 Implement `enumDiff` for comparing enums
    - Create function to find keys/values that differ between enums
    - Useful for migration and debugging
    - _Requirements: Novel feature - enum comparison_

  - [x] 13.8 Implement `enumIntersect` for finding common values
    - Create function to find values that exist in multiple enums
    - Return array of shared values with their source enum IDs
    - _Requirements: Novel feature - enum intersection analysis_

  - [x] 13.9 Implement `parseEnum` for safe parsing with default
    - Create function that returns parsed value or default if invalid
    - Alternative to assertFromEnum that doesn't throw
    - _Requirements: Novel feature - safe parsing_

  - [x] 13.10 Implement `enumToRecord` for converting to plain objects
    - Create function to strip metadata and return plain Record
    - Useful for serialization scenarios
    - _Requirements: Novel feature - enum conversion_

  - [x] 13.11 Implement `watchEnum` for enum change detection (development)
    - Create function to register callbacks when enum is accessed
    - Useful for debugging and development tooling
    - _Requirements: Novel feature - development tooling_

  - [x] 13.12 Implement compile-time validation types
    - Create `ValidEnumValue<E, V>` type that errors if V is not in E
    - Create `EnumKeys<E>` and `EnumValues<E>` utility types
    - Create `StrictEnumParam<E>` for function parameters
    - _Requirements: Novel feature - compile-time safety_

  - [x] 13.13 Implement `exhaustive` helper for switch statements
    - Create `exhaustive(value): never` that throws if called (unreachable code check)
    - Create `exhaustiveGuard<E>(enumObj)` returning a function for switch default cases
    - Provide runtime exhaustiveness checking with descriptive errors
    - _Requirements: Novel feature - exhaustiveness checking_

  - [x] 13.14 Implement `toJsonSchema` for JSON Schema generation
    - Create function to generate JSON Schema from branded enum
    - Output schema with `enum` constraint containing all values
    - Include metadata like title (enum ID) and description
    - _Requirements: Novel feature - schema generation_

  - [x] 13.15 Implement `toZodSchema` for Zod schema generation
    - Create function to generate Zod enum schema from branded enum
    - Return `z.enum([...values])` equivalent
    - Note: Returns schema definition object, not Zod instance (zero deps)
    - _Requirements: Novel feature - schema generation_

  - [x] 13.16 Implement `safeParseEnum` for validated deserialization
    - Create function returning `{ success: true, value } | { success: false, error }`
    - Parse unknown input and validate against branded enum
    - Provide detailed error information on failure
    - _Requirements: Novel feature - safe deserialization_

  - [x] 13.17 Implement `enumSerializer` for custom serialization
    - Create serializer/deserializer pair for branded enum values
    - Support custom transform functions for serialization
    - Validate on deserialization
    - _Requirements: Novel feature - serialization_

  - [x] 13.18 Write unit tests for all new features
    - Test decorators with various scenarios
    - Test subset/exclude/map/diff functions
    - Test compile-time types (type-level tests)
    - Test exhaustiveness helpers
    - Test schema generation (JSON Schema, Zod)
    - Test safe parsing and serialization
    - _Requirements: Testing_

  - [x] 13.19 Add JSDoc documentation for all new exports
    - Document all new functions with examples
    - Document decorator usage patterns
    - Document schema generation output formats
    - _Requirements: Documentation_

  - [x] 13.20 Update README with new features section
    - Add "Advanced Features" section
    - Include examples for each new capability
    - Document decorator setup requirements
    - _Requirements: Documentation_
  
  - [x] 13.21 Add code examples folder with examples for entire library
    - Build runnable code examples for every feature individually
    - Show before/after comparisons where applicable
    - Demonstrate best practices and anti-patterns
    - _Requirements: Documentation_

## Notes

- All tasks are required including property-based tests
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- The library has zero dependencies (uses only TypeScript built-ins)
