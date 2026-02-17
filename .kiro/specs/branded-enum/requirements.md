# Requirements Document

## Introduction

The branded-interface library provides runtime-identifiable enum-like types for TypeScript. Standard TypeScript enums are erased at runtime, making it impossible to determine which enum a string value originated from. This is problematic in large codebases with multiple libraries that may have overlapping string values for i18n keys or other purposes.

The library enables:
- Creating enum-like objects with embedded metadata for runtime identification
- Type guards to check if a value belongs to a specific enum
- A global registry to track all branded enums across bundles
- Zero runtime overhead for value access (values remain raw strings)

## Glossary

- **Branded_Enum**: An enum-like object created by the library that carries metadata (`__enumId`, `__values`) for runtime identification while keeping values as raw strings
- **Enum_Registry**: A global registry (using `globalThis`) that tracks all created branded enums and their values for cross-bundle compatibility
- **Enum_ID**: A unique string identifier assigned to each branded enum during creation
- **Type_Guard**: A function that narrows the type of a value by checking if it belongs to a specific branded enum
- **Value_Set**: The internal Set of string values belonging to a branded enum, used for O(1) membership checks

## Requirements

### Requirement 1: Create Branded Enum

**User Story:** As a developer, I want to create enum-like objects with runtime metadata, so that I can identify which enum a string value belongs to at runtime.

#### Acceptance Criteria

1. WHEN a developer calls `createBrandedEnum(enumId, values)` with a unique ID and values object, THE Branded_Enum_Factory SHALL return a branded enum object containing all provided values as properties
2. WHEN a branded enum is created, THE Branded_Enum_Factory SHALL attach `__enumId` metadata containing the provided enum ID
3. WHEN a branded enum is created, THE Branded_Enum_Factory SHALL attach `__values` metadata containing a Set of all enum values
4. WHEN accessing a value from a branded enum (e.g., `MyEnum.SomeKey`), THE Branded_Enum SHALL return the raw string value without any wrapper
5. WHEN a branded enum is created with `as const` values, THE Type_System SHALL infer literal types for all values
6. WHEN a branded enum is created, THE Branded_Enum_Factory SHALL register it in the global Enum_Registry

### Requirement 2: Type Guard for Enum Membership

**User Story:** As a developer, I want to check if a string value belongs to a specific branded enum, so that I can route values to the correct handler.

#### Acceptance Criteria

1. WHEN `isFromEnum(value, enumObj)` is called with a value that exists in the enum, THE Type_Guard SHALL return `true`
2. WHEN `isFromEnum(value, enumObj)` is called with a value that does not exist in the enum, THE Type_Guard SHALL return `false`
3. WHEN `isFromEnum` returns `true`, THE Type_System SHALL narrow the value's type to the enum's value type
4. WHEN `isFromEnum` is called with a non-string value, THE Type_Guard SHALL return `false`
5. WHEN `isFromEnum` is called with an object that is not a branded enum, THE Type_Guard SHALL return `false`

### Requirement 3: Find Enum Sources

**User Story:** As a developer, I want to find all enums that contain a given value, so that I can handle ambiguous values or debug collisions.

#### Acceptance Criteria

1. WHEN `findEnumSources(value)` is called with a value that exists in one or more enums, THE Enum_Registry SHALL return an array of enum IDs containing that value
2. WHEN `findEnumSources(value)` is called with a value that exists in no enums, THE Enum_Registry SHALL return an empty array
3. WHEN multiple enums contain the same value, THE Enum_Registry SHALL return all matching enum IDs

### Requirement 4: Get Enum Metadata

**User Story:** As a developer, I want to retrieve metadata from branded enums, so that I can inspect enum properties programmatically.

#### Acceptance Criteria

1. WHEN `getEnumId(enumObj)` is called with a branded enum, THE Metadata_Accessor SHALL return the enum's ID string
2. WHEN `getEnumId(enumObj)` is called with a non-branded enum object, THE Metadata_Accessor SHALL return `undefined`
3. WHEN `getEnumValues(enumObj)` is called with a branded enum, THE Metadata_Accessor SHALL return an array of all enum values
4. WHEN `getEnumValues(enumObj)` is called with a non-branded enum object, THE Metadata_Accessor SHALL return `undefined`

### Requirement 5: Global Registry Management

**User Story:** As a developer, I want branded enums to work across multiple bundles, so that I can use them in a monorepo with multiple packages.

#### Acceptance Criteria

1. WHEN a branded enum is created, THE Enum_Registry SHALL store it using `globalThis` for cross-bundle access
2. WHEN the same enum ID is used to create multiple enums, THE Enum_Registry SHALL throw an error to prevent ID collisions
3. WHEN `getAllEnumIds()` is called, THE Enum_Registry SHALL return an array of all registered enum IDs
4. WHEN `getEnumById(enumId)` is called with a valid ID, THE Enum_Registry SHALL return the corresponding branded enum object
5. WHEN `getEnumById(enumId)` is called with an invalid ID, THE Enum_Registry SHALL return `undefined`

### Requirement 6: Serialization Compatibility

**User Story:** As a developer, I want branded enum values to serialize correctly, so that I can use them with JSON APIs and storage.

#### Acceptance Criteria

1. WHEN a branded enum value is passed to `JSON.stringify()`, THE Serializer SHALL produce the raw string value
2. WHEN a branded enum object is passed to `JSON.stringify()`, THE Serializer SHALL produce a JSON object with string values (excluding metadata)
3. WHEN iterating over a branded enum with `Object.keys()` or `Object.values()`, THE Iterator SHALL exclude metadata properties (`__enumId`, `__values`)

### Requirement 7: TypeScript Type Inference

**User Story:** As a developer, I want full TypeScript type inference for branded enums, so that I can get autocomplete and type checking.

#### Acceptance Criteria

1. WHEN a branded enum is created with `as const` values, THE Type_System SHALL infer the exact literal types for each value
2. WHEN extracting a union type from a branded enum (e.g., `typeof MyEnum[keyof typeof MyEnum]`), THE Type_System SHALL produce a union of all literal value types
3. WHEN using a type guard, THE Type_System SHALL narrow the type correctly in conditional branches

### Requirement 8: Standard Enum Compatibility

**User Story:** As a developer, I want branded enums to behave like standard TypeScript enums, so that I can use them as drop-in replacements.

#### Acceptance Criteria

1. WHEN iterating with `Object.keys(enumObj)`, THE Branded_Enum SHALL return all key names (excluding metadata)
2. WHEN iterating with `Object.values(enumObj)`, THE Branded_Enum SHALL return all values (excluding metadata)
3. WHEN iterating with `Object.entries(enumObj)`, THE Branded_Enum SHALL return key-value pairs (excluding metadata)
4. WHEN using `in` operator to check for a key, THE Branded_Enum SHALL return `true` for valid keys and `false` for metadata keys
5. WHEN spreading a branded enum into another object, THE Spread_Operation SHALL copy only the enum values (excluding metadata)
6. WHEN using a branded enum value in a switch statement, THE Type_System SHALL provide exhaustiveness checking

### Requirement 9: Novel Enum Features

**User Story:** As a developer, I want additional features beyond standard enums, so that I can solve problems that standard enums cannot.

#### Acceptance Criteria

1. WHEN `hasValue(enumObj, value)` is called, THE Branded_Enum SHALL return `true` if the value exists in the enum (reverse lookup)
2. WHEN `getKeyForValue(enumObj, value)` is called with a valid value, THE Branded_Enum SHALL return the corresponding key name
3. WHEN `getKeyForValue(enumObj, value)` is called with an invalid value, THE Branded_Enum SHALL return `undefined`
4. WHEN `enumSize(enumObj)` is called, THE Branded_Enum SHALL return the count of enum values
5. WHEN `enumEntries(enumObj)` is called, THE Branded_Enum SHALL return an iterator of [key, value] pairs suitable for `for...of` loops
6. WHEN `isValidKey(enumObj, key)` is called, THE Branded_Enum SHALL return `true` if the key exists in the enum
7. WHEN `assertFromEnum(value, enumObj)` is called with an invalid value, THE Type_Guard SHALL throw a descriptive error
8. WHEN `assertFromEnum(value, enumObj)` is called with a valid value, THE Type_Guard SHALL return the value with narrowed type

### Requirement 10: Enum Composition

**User Story:** As a developer, I want to compose branded enums from other enums, so that I can create combined enums for broader use cases.

#### Acceptance Criteria

1. WHEN `mergeEnums(newId, ...enums)` is called with multiple branded enums, THE Enum_Factory SHALL create a new branded enum containing all values from all source enums
2. WHEN merging enums with duplicate values, THE Enum_Factory SHALL preserve the value (allowing intentional overlaps)
3. WHEN merging enums with duplicate keys, THE Enum_Factory SHALL throw an error to prevent key collisions
4. WHEN a merged enum is created, THE Enum_Registry SHALL register it as a new independent enum
