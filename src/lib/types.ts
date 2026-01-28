/**
 * Core type definitions for branded-enum library
 *
 * These types enable runtime-identifiable enum-like objects in TypeScript
 * with zero runtime overhead for value access.
 */

/**
 * Symbol key for storing the enum ID metadata.
 * Using a Symbol prevents collision with user-defined keys.
 */
export const ENUM_ID: unique symbol = Symbol('ENUM_ID');

/**
 * Symbol key for storing the enum values Set.
 * Using a Symbol prevents collision with user-defined keys.
 */
export const ENUM_VALUES: unique symbol = Symbol('ENUM_VALUES');

/**
 * Metadata attached to branded enums via Symbol properties.
 * These properties are non-enumerable and won't appear in
 * Object.keys(), Object.values(), or JSON serialization.
 */
export interface BrandedEnumMetadata {
  readonly [ENUM_ID]: string;
  readonly [ENUM_VALUES]: Set<string>;
}

/**
 * A branded enum object - combines the user's values object with metadata.
 * The object is frozen (Readonly) to prevent modification after creation.
 *
 * @template T - The shape of the enum values object (Record<string, string>)
 */
export type BrandedEnum<T extends Record<string, string>> = Readonly<T> &
  BrandedEnumMetadata;

/**
 * Base constraint type for branded enums that works with both
 * `as const` objects and regular Record<string, string> objects.
 *
 * This type is more permissive than `BrandedEnum<Record<string, string>>`
 * and allows literal types from `as const` assertions.
 */
export type AnyBrandedEnum = {
  readonly [ENUM_ID]: string;
  readonly [ENUM_VALUES]: Set<string>;
};

/**
 * Utility type to extract the union of all value types from a branded enum.
 * Useful for typing variables that can hold any value from the enum.
 *
 * @template E - A BrandedEnum type
 *
 * @example
 * const Status = createBrandedEnum('status', { Active: 'active', Inactive: 'inactive' } as const);
 * type StatusValue = BrandedEnumValue<typeof Status>; // 'active' | 'inactive'
 */
export type BrandedEnumValue<E extends AnyBrandedEnum> =
  E extends BrandedEnum<infer T> ? T[keyof T] : never;

/**
 * Registry entry for tracking a single branded enum in the global registry.
 */
export interface RegistryEntry {
  /** The unique identifier for this enum */
  readonly enumId: string;
  /** The branded enum object itself */
  readonly enumObj: BrandedEnum<Record<string, string>>;
  /** Set of all values in this enum for O(1) lookup */
  readonly values: Set<string>;
}

/**
 * Global registry structure stored on globalThis.
 * Enables cross-bundle tracking of all branded enums.
 */
export interface BrandedEnumRegistry {
  /** Map from enumId to registry entry */
  readonly enums: Map<string, RegistryEntry>;
  /** Reverse index: value -> Set of enumIds containing that value */
  readonly valueIndex: Map<string, Set<string>>;
}

/**
 * The key used to store the registry on globalThis.
 * Namespaced to avoid collisions with other libraries.
 */
export const REGISTRY_KEY = '__brandedEnumRegistry__' as const;

/**
 * The key used to store the enum consumer registry on globalThis.
 * Tracks which classes consume which branded enums.
 */
export const CONSUMER_REGISTRY_KEY = '__brandedEnumConsumerRegistry__' as const;

/**
 * Entry tracking a class that consumes branded enums.
 */
export interface EnumConsumerEntry {
  /** The class constructor function */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly classRef: new (...args: any[]) => any;
  /** The class name */
  readonly className: string;
  /** Set of enum IDs that this class consumes */
  readonly enumIds: Set<string>;
}

/**
 * Global registry for tracking enum consumers (classes decorated with @EnumClass).
 * Enables debugging and introspection of enum usage across the codebase.
 */
export interface EnumConsumerRegistry {
  /** Map from class name to consumer entry */
  readonly consumers: Map<string, EnumConsumerEntry>;
  /** Reverse index: enumId -> Set of class names consuming that enum */
  readonly enumToConsumers: Map<string, Set<string>>;
}

// =============================================================================
// Compile-Time Validation Types
// =============================================================================

/**
 * Extracts the union of all keys from a branded enum.
 *
 * This utility type provides compile-time access to all key names of a branded enum,
 * excluding the Symbol metadata keys (ENUM_ID and ENUM_VALUES).
 *
 * @template E - A BrandedEnum type
 *
 * @example
 * const Status = createBrandedEnum('status', {
 *   Active: 'active',
 *   Inactive: 'inactive',
 *   Pending: 'pending',
 * } as const);
 *
 * type StatusKeys = EnumKeys<typeof Status>;
 * // StatusKeys = 'Active' | 'Inactive' | 'Pending'
 *
 * @example
 * // Use in function parameters
 * function getStatusLabel<E extends AnyBrandedEnum>(
 *   enumObj: E,
 *   key: EnumKeys<E>
 * ): string {
 *   return enumObj[key] as string;
 * }
 */
export type EnumKeys<E> = E extends BrandedEnum<infer T>
  ? keyof T & string
  : E extends AnyBrandedEnum
    ? Exclude<keyof E, typeof ENUM_ID | typeof ENUM_VALUES> & string
    : never;

/**
 * Extracts the union of all values from a branded enum.
 *
 * This is an alias for BrandedEnumValue that provides a more intuitive name
 * when working with compile-time type utilities.
 *
 * @template E - A BrandedEnum type
 *
 * @example
 * const Status = createBrandedEnum('status', {
 *   Active: 'active',
 *   Inactive: 'inactive',
 *   Pending: 'pending',
 * } as const);
 *
 * type StatusValues = EnumValues<typeof Status>;
 * // StatusValues = 'active' | 'inactive' | 'pending'
 *
 * @example
 * // Use for type-safe value handling
 * function processStatus(value: EnumValues<typeof Status>) {
 *   // value is 'active' | 'inactive' | 'pending'
 * }
 */
export type EnumValues<E> = E extends BrandedEnum<infer T>
  ? T[keyof T]
  : E extends AnyBrandedEnum
    ? Exclude<E[Exclude<keyof E, typeof ENUM_ID | typeof ENUM_VALUES>], Set<string>> & string
    : never;

/**
 * Validates that a value type V is a valid value of branded enum E at compile time.
 *
 * If V is a valid value of E, this type resolves to V.
 * If V is NOT a valid value of E, this type resolves to `never`, causing a compile error
 * when used in contexts that expect a non-never type.
 *
 * This enables compile-time validation of enum values without runtime overhead.
 *
 * @template E - A BrandedEnum type
 * @template V - The value type to validate
 *
 * @example
 * const Status = createBrandedEnum('status', {
 *   Active: 'active',
 *   Inactive: 'inactive',
 * } as const);
 *
 * // Valid - 'active' is in Status
 * type Valid = ValidEnumValue<typeof Status, 'active'>; // 'active'
 *
 * // Invalid - 'unknown' is not in Status
 * type Invalid = ValidEnumValue<typeof Status, 'unknown'>; // never
 *
 * @example
 * // Use in function to enforce valid values at compile time
 * function setStatus<V extends string>(
 *   value: ValidEnumValue<typeof Status, V>
 * ): void {
 *   // Only compiles if value is 'active' | 'inactive'
 * }
 *
 * setStatus('active'); // OK
 * setStatus('inactive'); // OK
 * // setStatus('unknown'); // Compile error: Argument of type 'never' is not assignable
 *
 * @example
 * // Type-level assertion
 * type AssertActive = ValidEnumValue<typeof Status, 'active'>; // 'active' - OK
 * type AssertBad = ValidEnumValue<typeof Status, 'bad'>; // never - indicates invalid
 */
export type ValidEnumValue<E, V extends string> = V extends EnumValues<E>
  ? V
  : never;

/**
 * Creates a strict parameter type that only accepts valid values from a branded enum.
 *
 * This utility type is designed for function parameters where you want to enforce
 * that only values from a specific branded enum are accepted at compile time.
 *
 * Unlike using `BrandedEnumValue<E>` directly, `StrictEnumParam` provides better
 * error messages and works well with generic functions.
 *
 * @template E - A BrandedEnum type
 *
 * @example
 * const Status = createBrandedEnum('status', {
 *   Active: 'active',
 *   Inactive: 'inactive',
 *   Pending: 'pending',
 * } as const);
 *
 * // Function that only accepts Status values
 * function updateStatus(newStatus: StrictEnumParam<typeof Status>): void {
 *   console.log(`Status updated to: ${newStatus}`);
 * }
 *
 * updateStatus(Status.Active); // OK
 * updateStatus('active'); // OK (literal type matches)
 * // updateStatus('unknown'); // Compile error
 *
 * @example
 * // Use with multiple enum parameters
 * const Priority = createBrandedEnum('priority', {
 *   High: 'high',
 *   Medium: 'medium',
 *   Low: 'low',
 * } as const);
 *
 * function createTask(
 *   status: StrictEnumParam<typeof Status>,
 *   priority: StrictEnumParam<typeof Priority>
 * ): void {
 *   // Both parameters are type-safe
 * }
 *
 * createTask(Status.Active, Priority.High); // OK
 * createTask('active', 'high'); // OK
 * // createTask('active', 'invalid'); // Compile error on second param
 *
 * @example
 * // Generic function with strict enum constraint
 * function processValue<E extends AnyBrandedEnum>(
 *   enumObj: E,
 *   value: StrictEnumParam<E>
 * ): void {
 *   // value is guaranteed to be a valid value of enumObj
 * }
 */
export type StrictEnumParam<E> = EnumValues<E>;
