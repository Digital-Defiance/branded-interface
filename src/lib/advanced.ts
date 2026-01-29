/**
 * Advanced enum operations for branded enums.
 *
 * Provides functions for deriving new enums from existing ones,
 * including subsetting, exclusion, and transformation operations.
 */

import { AnyBrandedEnum, BrandedEnum, ENUM_ID, ENUM_VALUES, EnumKeys, EnumValues } from './types.js';
import { createBrandedEnum } from './factory.js';

/**
 * Checks if an object is a branded enum (has Symbol metadata).
 *
 * @param obj - The object to check
 * @returns true if obj is a branded enum
 */
function isBrandedEnum(obj: unknown): obj is AnyBrandedEnum {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    ENUM_ID in obj &&
    ENUM_VALUES in obj &&
    typeof (obj as AnyBrandedEnum)[ENUM_ID] === 'string' &&
    (obj as AnyBrandedEnum)[ENUM_VALUES] instanceof Set
  );
}

/**
 * Creates a new branded enum containing only the specified keys from the source enum.
 *
 * This function derives a subset of an existing branded enum by selecting specific keys.
 * The resulting enum is registered as an independent enum in the global registry.
 *
 * Type safety is maintained - the resulting enum's type reflects only the selected keys.
 *
 * @template E - The source branded enum type
 * @template K - The keys to include in the subset (must be keys of E)
 * @param newId - Unique identifier for the new subset enum. If already registered,
 *   returns the existing enum (idempotent behavior).
 * @param sourceEnum - The branded enum to derive the subset from
 * @param keys - Array of keys to include in the subset. All keys must exist in sourceEnum.
 * @returns A new branded enum containing only the specified key-value pairs,
 *   or the existing enum if newId is already registered
 * @throws {Error} Throws `Error` with message `enumSubset requires a branded enum as the source`
 *   if sourceEnum is not a valid branded enum.
 * @throws {Error} Throws `Error` with message `enumSubset requires at least one key`
 *   if keys array is empty.
 * @throws {Error} Throws `Error` with message `Key "${key}" does not exist in enum "${enumId}"`
 *   if any specified key does not exist in the source enum.
 *
 * @example
 * // Basic usage - create a subset of colors
 * const AllColors = createBrandedEnum('all-colors', {
 *   Red: 'red',
 *   Green: 'green',
 *   Blue: 'blue',
 *   Yellow: 'yellow',
 * } as const);
 *
 * const PrimaryColors = enumSubset('primary-colors', AllColors, ['Red', 'Blue', 'Yellow']);
 * // PrimaryColors has: Red, Blue, Yellow (no Green)
 *
 * PrimaryColors.Red; // 'red'
 * PrimaryColors.Blue; // 'blue'
 * // PrimaryColors.Green; // TypeScript error - Green doesn't exist
 *
 * @example
 * // Type safety with subset
 * const Status = createBrandedEnum('status', {
 *   Active: 'active',
 *   Inactive: 'inactive',
 *   Pending: 'pending',
 *   Archived: 'archived',
 * } as const);
 *
 * const ActiveStatuses = enumSubset('active-statuses', Status, ['Active', 'Pending']);
 * type ActiveStatusValue = typeof ActiveStatuses[keyof typeof ActiveStatuses];
 * // ActiveStatusValue = 'active' | 'pending'
 *
 * @example
 * // Error handling for invalid keys
 * try {
 *   enumSubset('invalid', AllColors, ['Red', 'Purple']); // Purple doesn't exist
 * } catch (e) {
 *   console.log(e.message);
 *   // 'Key "Purple" does not exist in enum "all-colors"'
 * }
 */
export function enumSubset<
  E extends AnyBrandedEnum,
  K extends keyof E & string,
>(
  newId: string,
  sourceEnum: E,
  keys: readonly K[]
): BrandedEnum<Pick<E, K> & Record<string, string>> {
  // Validate that sourceEnum is a branded enum
  if (!isBrandedEnum(sourceEnum)) {
    throw new Error('enumSubset requires a branded enum as the source');
  }

  // Validate that keys array is not empty
  if (keys.length === 0) {
    throw new Error('enumSubset requires at least one key');
  }

  const sourceEnumId = sourceEnum[ENUM_ID];

  // Build the subset values object
  const subsetValues: Record<string, string> = {};

  for (const key of keys) {
    // Validate that the key exists in the source enum
    if (!(key in sourceEnum)) {
      throw new Error(
        `Key "${key}" does not exist in enum "${sourceEnumId}"`
      );
    }

    // Copy the key-value pair
    subsetValues[key] = (sourceEnum as Record<string, string>)[key];
  }

  // Create and return the new branded enum (this handles registration)
  return createBrandedEnum(newId, subsetValues) as BrandedEnum<
    Pick<E, K> & Record<string, string>
  >;
}

/**
 * Creates a new branded enum by excluding the specified keys from the source enum.
 *
 * This function derives a new enum from an existing branded enum by removing specific keys.
 * It is the complement of `enumSubset` - instead of specifying which keys to include,
 * you specify which keys to exclude.
 *
 * The resulting enum is registered as an independent enum in the global registry.
 * Type safety is maintained - the resulting enum's type reflects only the remaining keys.
 *
 * @template E - The source branded enum type
 * @template K - The keys to exclude from the result (must be keys of E)
 * @param newId - Unique identifier for the new enum. If already registered,
 *   returns the existing enum (idempotent behavior).
 * @param sourceEnum - The branded enum to derive from
 * @param keysToExclude - Array of keys to exclude. All keys must exist in sourceEnum.
 * @returns A new branded enum containing all key-value pairs except the excluded ones,
 *   or the existing enum if newId is already registered
 * @throws {Error} Throws `Error` with message `enumExclude requires a branded enum as the source`
 *   if sourceEnum is not a valid branded enum.
 * @throws {Error} Throws `Error` with message `enumExclude: excluding all keys would result in an empty enum`
 *   if excluding all keys would leave no keys remaining.
 * @throws {Error} Throws `Error` with message `Key "${key}" does not exist in enum "${enumId}"`
 *   if any specified key to exclude does not exist in the source enum.
 *
 * @example
 * // Basic usage - exclude specific colors
 * const AllColors = createBrandedEnum('all-colors', {
 *   Red: 'red',
 *   Green: 'green',
 *   Blue: 'blue',
 *   Yellow: 'yellow',
 * } as const);
 *
 * const NonPrimaryColors = enumExclude('non-primary', AllColors, ['Red', 'Blue', 'Yellow']);
 * // NonPrimaryColors has only: Green
 *
 * NonPrimaryColors.Green; // 'green'
 * // NonPrimaryColors.Red; // TypeScript error - Red was excluded
 *
 * @example
 * // Exclude deprecated values
 * const Status = createBrandedEnum('status', {
 *   Active: 'active',
 *   Inactive: 'inactive',
 *   Pending: 'pending',
 *   Deprecated: 'deprecated',
 * } as const);
 *
 * const CurrentStatuses = enumExclude('current-statuses', Status, ['Deprecated']);
 * type CurrentStatusValue = typeof CurrentStatuses[keyof typeof CurrentStatuses];
 * // CurrentStatusValue = 'active' | 'inactive' | 'pending'
 *
 * @example
 * // Error handling for invalid keys
 * try {
 *   enumExclude('invalid', AllColors, ['Purple']); // Purple doesn't exist
 * } catch (e) {
 *   console.log(e.message);
 *   // 'Key "Purple" does not exist in enum "all-colors"'
 * }
 */
export function enumExclude<
  E extends AnyBrandedEnum,
  K extends keyof E & string,
>(
  newId: string,
  sourceEnum: E,
  keysToExclude: readonly K[]
): BrandedEnum<Omit<E, K> & Record<string, string>> {
  // Validate that sourceEnum is a branded enum
  if (!isBrandedEnum(sourceEnum)) {
    throw new Error('enumExclude requires a branded enum as the source');
  }

  const sourceEnumId = sourceEnum[ENUM_ID];

  // Validate that all keys to exclude exist in the source enum
  for (const key of keysToExclude) {
    if (!(key in sourceEnum)) {
      throw new Error(
        `Key "${key}" does not exist in enum "${sourceEnumId}"`
      );
    }
  }

  // Create a Set for O(1) lookup of excluded keys
  const excludeSet = new Set<string>(keysToExclude);

  // Get all keys from the source enum (excluding Symbol metadata)
  const allKeys = Object.keys(sourceEnum);

  // Build the result values object with non-excluded keys
  const resultValues: Record<string, string> = {};

  for (const key of allKeys) {
    if (!excludeSet.has(key)) {
      resultValues[key] = (sourceEnum as Record<string, string>)[key];
    }
  }

  // Validate that we have at least one key remaining
  if (Object.keys(resultValues).length === 0) {
    throw new Error(
      'enumExclude: excluding all keys would result in an empty enum'
    );
  }

  // Create and return the new branded enum (this handles registration)
  return createBrandedEnum(newId, resultValues) as BrandedEnum<
    Omit<E, K> & Record<string, string>
  >;
}

/**
 * Type representing the result of mapping enum values through a transform function.
 * Preserves the keys but transforms the value types.
 */
type MappedEnumValues<E extends Record<string, string>> = {
  [K in keyof E]: string;
};

/**
 * Creates a new branded enum by transforming all values through a mapper function.
 *
 * This function derives a new enum from an existing branded enum by applying a
 * transformation function to each value. The keys remain unchanged, but the values
 * are transformed according to the provided mapper.
 *
 * Common use cases include:
 * - Prefixing values (e.g., adding a namespace)
 * - Suffixing values (e.g., adding a version)
 * - Case transformation (e.g., uppercase, lowercase)
 * - Custom transformations (e.g., encoding, formatting)
 *
 * The resulting enum is registered as an independent enum in the global registry.
 *
 * @template E - The source branded enum type
 * @param newId - Unique identifier for the new enum. If already registered,
 *   returns the existing enum (idempotent behavior).
 * @param sourceEnum - The branded enum to derive from
 * @param mapper - Function that transforms each value. Receives the original value
 *   and the key, and returns the transformed value.
 * @returns A new branded enum with transformed values,
 *   or the existing enum if newId is already registered
 * @throws {Error} Throws `Error` with message `enumMap requires a branded enum as the source`
 *   if sourceEnum is not a valid branded enum.
 * @throws {Error} Throws `Error` with message `enumMap mapper must return a string`
 *   if the mapper function returns a non-string value.
 *
 * @example
 * // Prefix all values with a namespace
 * const Status = createBrandedEnum('status', {
 *   Active: 'active',
 *   Inactive: 'inactive',
 * } as const);
 *
 * const PrefixedStatus = enumMap('prefixed-status', Status, (value) => `app.${value}`);
 * // PrefixedStatus.Active === 'app.active'
 * // PrefixedStatus.Inactive === 'app.inactive'
 *
 * @example
 * // Uppercase all values
 * const Colors = createBrandedEnum('colors', {
 *   Red: 'red',
 *   Green: 'green',
 *   Blue: 'blue',
 * } as const);
 *
 * const UpperColors = enumMap('upper-colors', Colors, (value) => value.toUpperCase());
 * // UpperColors.Red === 'RED'
 * // UpperColors.Green === 'GREEN'
 * // UpperColors.Blue === 'BLUE'
 *
 * @example
 * // Transform with key context
 * const Sizes = createBrandedEnum('sizes', {
 *   Small: 's',
 *   Medium: 'm',
 *   Large: 'l',
 * } as const);
 *
 * const VerboseSizes = enumMap('verbose-sizes', Sizes, (value, key) => `${key.toLowerCase()}-${value}`);
 * // VerboseSizes.Small === 'small-s'
 * // VerboseSizes.Medium === 'medium-m'
 * // VerboseSizes.Large === 'large-l'
 */
export function enumMap<E extends AnyBrandedEnum>(
  newId: string,
  sourceEnum: E,
  mapper: (value: string, key: string) => string
): BrandedEnum<MappedEnumValues<E> & Record<string, string>> {
  // Validate that sourceEnum is a branded enum
  if (!isBrandedEnum(sourceEnum)) {
    throw new Error('enumMap requires a branded enum as the source');
  }

  // Get all keys from the source enum (excluding Symbol metadata)
  const allKeys = Object.keys(sourceEnum);

  // Build the result values object with transformed values
  const resultValues: Record<string, string> = {};

  for (const key of allKeys) {
    const originalValue = sourceEnum[key as keyof E] as string;
    const transformedValue = mapper(originalValue, key);

    // Validate that the mapper returned a string
    if (typeof transformedValue !== 'string') {
      throw new Error('enumMap mapper must return a string');
    }

    resultValues[key] = transformedValue;
  }

  // Create and return the new branded enum (this handles registration)
  return createBrandedEnum(newId, resultValues) as BrandedEnum<
    MappedEnumValues<E> & Record<string, string>
  >;
}

/**
 * Type representing an enum where each key maps to itself as a value.
 */
type KeysAsValues<K extends readonly string[]> = {
  [P in K[number]]: P;
};

/**
 * Creates a branded enum from an array of keys where each key equals its value.
 *
 * This is a convenience function for the common pattern where enum keys and values
 * are identical, such as `{ Active: 'Active', Inactive: 'Inactive' }`.
 *
 * The resulting enum is registered as an independent enum in the global registry.
 * Type safety is maintained - the resulting enum's type reflects the exact literal
 * types of the provided keys.
 *
 * @template K - The array of string keys (use `as const` for literal types)
 * @param enumId - Unique identifier for the new enum. If already registered,
 *   returns the existing enum (idempotent behavior).
 * @param keys - Array of strings that will become both keys and values.
 *   Use `as const` for literal type inference.
 * @returns A new branded enum where each key maps to itself,
 *   or the existing enum if enumId is already registered
 * @throws {Error} Throws `Error` with message `enumFromKeys requires at least one key`
 *   if keys array is empty.
 * @throws {Error} Throws `Error` with message `enumFromKeys requires all keys to be non-empty strings`
 *   if any key is not a non-empty string.
 * @throws {Error} Throws `Error` with message `enumFromKeys: duplicate key "${key}" found`
 *   if the keys array contains duplicates.
 *
 * @example
 * // Basic usage - create enum from string array
 * const Status = enumFromKeys('status', ['Active', 'Inactive', 'Pending'] as const);
 * // Equivalent to: { Active: 'Active', Inactive: 'Inactive', Pending: 'Pending' }
 *
 * Status.Active; // 'Active'
 * Status.Inactive; // 'Inactive'
 * Status.Pending; // 'Pending'
 *
 * @example
 * // Type inference with as const
 * const Colors = enumFromKeys('colors', ['Red', 'Green', 'Blue'] as const);
 * type ColorValue = typeof Colors[keyof typeof Colors];
 * // ColorValue = 'Red' | 'Green' | 'Blue'
 *
 * @example
 * // Useful for string literal unions
 * const Directions = enumFromKeys('directions', ['North', 'South', 'East', 'West'] as const);
 *
 * function move(direction: typeof Directions[keyof typeof Directions]) {
 *   // direction is 'North' | 'South' | 'East' | 'West'
 * }
 *
 * move(Directions.North); // OK
 * move('North'); // Also OK due to literal type
 *
 * @example
 * // Error handling
 * try {
 *   enumFromKeys('empty', []); // Empty array
 * } catch (e) {
 *   console.log(e.message);
 *   // 'enumFromKeys requires at least one key'
 * }
 */
export function enumFromKeys<K extends readonly string[]>(
  enumId: string,
  keys: K
): BrandedEnum<KeysAsValues<K> & Record<string, string>> {
  // Validate that keys array is not empty
  if (keys.length === 0) {
    throw new Error('enumFromKeys requires at least one key');
  }

  // Track seen keys to detect duplicates
  const seenKeys = new Set<string>();

  // Build the values object where each key maps to itself
  const values: Record<string, string> = {};

  for (const key of keys) {
    // Validate that each key is a non-empty string
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error('enumFromKeys requires all keys to be non-empty strings');
    }

    // Check for duplicate keys
    if (seenKeys.has(key)) {
      throw new Error(`enumFromKeys: duplicate key "${key}" found`);
    }

    seenKeys.add(key);
    values[key] = key;
  }

  // Create and return the new branded enum (this handles registration)
  return createBrandedEnum(enumId, values) as BrandedEnum<
    KeysAsValues<K> & Record<string, string>
  >;
}

/**
 * Result of comparing two branded enums with enumDiff.
 */
export interface EnumDiffResult {
  /** Keys that exist only in the first enum */
  readonly onlyInFirst: ReadonlyArray<{ key: string; value: string }>;
  /** Keys that exist only in the second enum */
  readonly onlyInSecond: ReadonlyArray<{ key: string; value: string }>;
  /** Keys that exist in both enums but have different values */
  readonly differentValues: ReadonlyArray<{
    key: string;
    firstValue: string;
    secondValue: string;
  }>;
  /** Keys that exist in both enums with the same values */
  readonly sameValues: ReadonlyArray<{ key: string; value: string }>;
}

/**
 * Compares two branded enums and returns their differences.
 *
 * This function analyzes two branded enums and categorizes their keys into:
 * - Keys only in the first enum
 * - Keys only in the second enum
 * - Keys in both with different values
 * - Keys in both with the same values
 *
 * Useful for:
 * - Migration: Identifying what changed between enum versions
 * - Debugging: Understanding differences between similar enums
 * - Validation: Ensuring enums have expected overlap or differences
 *
 * @template E1 - The first branded enum type
 * @template E2 - The second branded enum type
 * @param firstEnum - The first branded enum to compare
 * @param secondEnum - The second branded enum to compare
 * @returns An EnumDiffResult object containing categorized differences
 * @throws {Error} Throws `Error` with message `enumDiff requires branded enums as arguments`
 *   if either argument is not a valid branded enum.
 *
 * @example
 * // Compare two versions of a status enum
 * const StatusV1 = createBrandedEnum('status-v1', {
 *   Active: 'active',
 *   Inactive: 'inactive',
 * } as const);
 *
 * const StatusV2 = createBrandedEnum('status-v2', {
 *   Active: 'active',
 *   Inactive: 'disabled',  // Changed value
 *   Pending: 'pending',    // New key
 * } as const);
 *
 * const diff = enumDiff(StatusV1, StatusV2);
 * // diff.onlyInFirst: []
 * // diff.onlyInSecond: [{ key: 'Pending', value: 'pending' }]
 * // diff.differentValues: [{ key: 'Inactive', firstValue: 'inactive', secondValue: 'disabled' }]
 * // diff.sameValues: [{ key: 'Active', value: 'active' }]
 *
 * @example
 * // Find keys removed between versions
 * const ColorsOld = createBrandedEnum('colors-old', {
 *   Red: 'red',
 *   Green: 'green',
 *   Blue: 'blue',
 * } as const);
 *
 * const ColorsNew = createBrandedEnum('colors-new', {
 *   Red: 'red',
 *   Blue: 'blue',
 * } as const);
 *
 * const diff = enumDiff(ColorsOld, ColorsNew);
 * // diff.onlyInFirst: [{ key: 'Green', value: 'green' }]
 * // diff.onlyInSecond: []
 *
 * @example
 * // Check if enums are identical
 * const diff = enumDiff(enumA, enumB);
 * const areIdentical = diff.onlyInFirst.length === 0 &&
 *                      diff.onlyInSecond.length === 0 &&
 *                      diff.differentValues.length === 0;
 */
export function enumDiff(
  firstEnum: AnyBrandedEnum,
  secondEnum: AnyBrandedEnum
): EnumDiffResult {
  // Validate that both arguments are branded enums
  if (!isBrandedEnum(firstEnum) || !isBrandedEnum(secondEnum)) {
    throw new Error('enumDiff requires branded enums as arguments');
  }

  // Get all keys from both enums (excluding Symbol metadata)
  const firstKeys = new Set(Object.keys(firstEnum));
  const secondKeys = new Set(Object.keys(secondEnum));

  const onlyInFirst: Array<{ key: string; value: string }> = [];
  const onlyInSecond: Array<{ key: string; value: string }> = [];
  const differentValues: Array<{
    key: string;
    firstValue: string;
    secondValue: string;
  }> = [];
  const sameValues: Array<{ key: string; value: string }> = [];

  // Find keys only in first enum and keys in both
  for (const key of firstKeys) {
    const firstValue = (firstEnum as Record<string, string>)[key];

    if (!secondKeys.has(key)) {
      // Key only exists in first enum
      onlyInFirst.push({ key, value: firstValue });
    } else {
      // Key exists in both - compare values
      const secondValue = (secondEnum as Record<string, string>)[key];

      if (firstValue === secondValue) {
        sameValues.push({ key, value: firstValue });
      } else {
        differentValues.push({ key, firstValue, secondValue });
      }
    }
  }

  // Find keys only in second enum
  for (const key of secondKeys) {
    if (!firstKeys.has(key)) {
      const secondValue = (secondEnum as Record<string, string>)[key];
      onlyInSecond.push({ key, value: secondValue });
    }
  }

  return {
    onlyInFirst,
    onlyInSecond,
    differentValues,
    sameValues,
  };
}

/**
 * Result entry for a shared value found across multiple enums.
 */
export interface EnumIntersectEntry {
  /** The shared value that exists in multiple enums */
  readonly value: string;
  /** Array of enum IDs that contain this value */
  readonly enumIds: readonly string[];
}

/**
 * Finds values that exist in multiple branded enums.
 *
 * This function analyzes multiple branded enums and identifies values that
 * appear in more than one enum. For each shared value, it returns the value
 * along with the IDs of all enums that contain it.
 *
 * Useful for:
 * - Detecting value collisions across enums
 * - Finding common values for potential refactoring
 * - Debugging i18n key conflicts
 * - Identifying intentional value overlaps
 *
 * @param enums - Array of branded enums to analyze for intersections
 * @returns Array of EnumIntersectEntry objects, each containing a shared value
 *   and the IDs of enums containing that value. Only values appearing in 2+
 *   enums are included. Results are sorted by value for consistent ordering.
 * @throws {Error} Throws `Error` with message `enumIntersect requires at least two branded enums`
 *   if fewer than two enums are provided.
 * @throws {Error} Throws `Error` with message `enumIntersect requires all arguments to be branded enums`
 *   if any argument is not a valid branded enum.
 *
 * @example
 * // Find shared values between color enums
 * const PrimaryColors = createBrandedEnum('primary', {
 *   Red: 'red',
 *   Blue: 'blue',
 *   Yellow: 'yellow',
 * } as const);
 *
 * const WarmColors = createBrandedEnum('warm', {
 *   Red: 'red',
 *   Orange: 'orange',
 *   Yellow: 'yellow',
 * } as const);
 *
 * const shared = enumIntersect(PrimaryColors, WarmColors);
 * // shared = [
 * //   { value: 'red', enumIds: ['primary', 'warm'] },
 * //   { value: 'yellow', enumIds: ['primary', 'warm'] }
 * // ]
 *
 * @example
 * // Detect i18n key collisions across multiple libraries
 * const LibAKeys = createBrandedEnum('lib-a', {
 *   Submit: 'submit',
 *   Cancel: 'cancel',
 * } as const);
 *
 * const LibBKeys = createBrandedEnum('lib-b', {
 *   Submit: 'submit',
 *   Reset: 'reset',
 * } as const);
 *
 * const LibCKeys = createBrandedEnum('lib-c', {
 *   Submit: 'submit',
 *   Clear: 'clear',
 * } as const);
 *
 * const collisions = enumIntersect(LibAKeys, LibBKeys, LibCKeys);
 * // collisions = [
 * //   { value: 'submit', enumIds: ['lib-a', 'lib-b', 'lib-c'] }
 * // ]
 *
 * @example
 * // Check if enums have any overlap
 * const shared = enumIntersect(enumA, enumB);
 * if (shared.length === 0) {
 *   console.log('No shared values between enums');
 * }
 */
export function enumIntersect(
  ...enums: AnyBrandedEnum[]
): EnumIntersectEntry[] {
  // Validate that at least two enums are provided
  if (enums.length < 2) {
    throw new Error('enumIntersect requires at least two branded enums');
  }

  // Validate that all arguments are branded enums
  for (const enumObj of enums) {
    if (!isBrandedEnum(enumObj)) {
      throw new Error('enumIntersect requires all arguments to be branded enums');
    }
  }

  // Build a map of value -> Set of enum IDs containing that value
  const valueToEnumIds = new Map<string, Set<string>>();

  for (const enumObj of enums) {
    const enumId = enumObj[ENUM_ID];
    const values = enumObj[ENUM_VALUES];

    for (const value of values) {
      if (!valueToEnumIds.has(value)) {
        valueToEnumIds.set(value, new Set());
      }
      valueToEnumIds.get(value)!.add(enumId);
    }
  }

  // Filter to only values that appear in multiple enums
  const result: EnumIntersectEntry[] = [];

  for (const [value, enumIds] of valueToEnumIds) {
    if (enumIds.size >= 2) {
      result.push({
        value,
        enumIds: Array.from(enumIds).sort(),
      });
    }
  }

  // Sort by value for consistent ordering
  result.sort((a, b) => a.value.localeCompare(b.value));

  return result;
}

/**
 * Converts a branded enum to a plain Record object, stripping all metadata.
 *
 * This function creates a new plain object containing only the key-value pairs
 * from the branded enum, without any Symbol metadata properties. The result is
 * a simple `Record<string, string>` that can be safely serialized, spread, or
 * used in contexts where branded enum metadata is not needed.
 *
 * Useful for:
 * - Serialization scenarios where you need a plain object
 * - Interoperability with APIs that expect plain objects
 * - Creating snapshots of enum state without metadata
 * - Passing enum data to external systems
 *
 * @template E - The branded enum type
 * @param enumObj - The branded enum to convert
 * @returns A plain Record<string, string> containing only the key-value pairs
 * @throws {Error} Throws `Error` with message `enumToRecord requires a branded enum`
 *   if enumObj is not a valid branded enum.
 *
 * @example
 * // Basic usage - convert to plain object
 * const Status = createBrandedEnum('status', {
 *   Active: 'active',
 *   Inactive: 'inactive',
 *   Pending: 'pending',
 * } as const);
 *
 * const plainStatus = enumToRecord(Status);
 * // plainStatus = { Active: 'active', Inactive: 'inactive', Pending: 'pending' }
 * // No Symbol metadata, just a plain object
 *
 * @example
 * // Serialization scenario
 * const Colors = createBrandedEnum('colors', {
 *   Red: 'red',
 *   Green: 'green',
 *   Blue: 'blue',
 * } as const);
 *
 * // Send to an API that expects plain objects
 * const payload = {
 *   availableColors: enumToRecord(Colors),
 * };
 * await fetch('/api/config', {
 *   method: 'POST',
 *   body: JSON.stringify(payload),
 * });
 *
 * @example
 * // Comparing with spread operator
 * const Status = createBrandedEnum('status', { Active: 'active' } as const);
 *
 * // Both produce the same result for enumerable properties:
 * const spread = { ...Status };
 * const record = enumToRecord(Status);
 * // spread and record are equivalent plain objects
 *
 * // But enumToRecord is explicit about intent and validates input
 *
 * @example
 * // Type safety
 * const Sizes = createBrandedEnum('sizes', {
 *   Small: 's',
 *   Medium: 'm',
 *   Large: 'l',
 * } as const);
 *
 * const record = enumToRecord(Sizes);
 * // record type is Record<string, string>
 * // Can be used anywhere a plain object is expected
 */
export function enumToRecord<E extends AnyBrandedEnum>(
  enumObj: E
): Record<string, string> {
  // Validate that enumObj is a branded enum
  if (!isBrandedEnum(enumObj)) {
    throw new Error('enumToRecord requires a branded enum');
  }

  // Create a new plain object with only the enumerable key-value pairs
  const result: Record<string, string> = {};

  for (const key of Object.keys(enumObj)) {
    result[key] = enumObj[key as keyof E] as string;
  }

  return result;
}

/**
 * The key used to store the enum watcher registry on globalThis.
 * Namespaced to avoid collisions with other libraries.
 */
const WATCHER_REGISTRY_KEY = '__brandedEnumWatcherRegistry__' as const;

/**
 * Type of access event that triggered the callback.
 */
export type EnumAccessType = 'get' | 'has' | 'keys' | 'values' | 'entries';

/**
 * Information about an enum access event.
 */
export interface EnumAccessEvent {
  /** The enum ID of the accessed enum */
  readonly enumId: string;
  /** The type of access that occurred */
  readonly accessType: EnumAccessType;
  /** The key that was accessed (for 'get' and 'has' types) */
  readonly key?: string;
  /** The value that was returned (for 'get' type) */
  readonly value?: string;
  /** Timestamp of the access */
  readonly timestamp: number;
}

/**
 * Callback function type for enum access events.
 */
export type EnumWatchCallback = (event: EnumAccessEvent) => void;

/**
 * Internal registry for enum watchers.
 */
interface EnumWatcherRegistry {
  /** Map from enum ID to Set of callbacks */
  readonly watchers: Map<string, Set<EnumWatchCallback>>;
  /** Global callbacks that receive all enum access events */
  readonly globalWatchers: Set<EnumWatchCallback>;
}

/**
 * Gets or initializes the watcher registry on globalThis.
 */
function getWatcherRegistry(): EnumWatcherRegistry {
  const global = globalThis as typeof globalThis & {
    [WATCHER_REGISTRY_KEY]?: EnumWatcherRegistry;
  };

  if (!global[WATCHER_REGISTRY_KEY]) {
    global[WATCHER_REGISTRY_KEY] = {
      watchers: new Map(),
      globalWatchers: new Set(),
    };
  }

  return global[WATCHER_REGISTRY_KEY];
}

/**
 * Result of calling watchEnum, containing the watched proxy and unwatch function.
 */
export interface WatchEnumResult<E extends AnyBrandedEnum> {
  /** The proxied enum that triggers callbacks on access */
  readonly watched: E;
  /** Function to remove the watcher and stop receiving callbacks */
  readonly unwatch: () => void;
}

/**
 * Creates a watched version of a branded enum that triggers callbacks on access.
 *
 * This function wraps a branded enum in a Proxy that intercepts property access
 * and calls registered callbacks. This is useful for debugging, development tooling,
 * and understanding how enums are used throughout an application.
 *
 * The watched enum behaves identically to the original enum - all values, metadata,
 * and type information are preserved. The only difference is that access events
 * are reported to the callback.
 *
 * **Note:** This feature is intended for development and debugging purposes.
 * Using watched enums in production may have performance implications due to
 * the Proxy overhead.
 *
 * @template E - The branded enum type
 * @param enumObj - The branded enum to watch
 * @param callback - Function called whenever the enum is accessed
 * @returns An object containing the watched enum proxy and an unwatch function
 * @throws {Error} Throws `Error` with message `watchEnum requires a branded enum`
 *   if enumObj is not a valid branded enum.
 *
 * @example
 * // Basic usage - log all enum accesses
 * const Status = createBrandedEnum('status', {
 *   Active: 'active',
 *   Inactive: 'inactive',
 * } as const);
 *
 * const { watched, unwatch } = watchEnum(Status, (event) => {
 *   console.log(`Accessed ${event.enumId}.${event.key} = ${event.value}`);
 * });
 *
 * watched.Active; // Logs: "Accessed status.Active = active"
 * watched.Inactive; // Logs: "Accessed status.Inactive = inactive"
 *
 * // Stop watching
 * unwatch();
 * watched.Active; // No longer logs
 *
 * @example
 * // Track enum usage for debugging
 * const accessLog: EnumAccessEvent[] = [];
 *
 * const { watched: WatchedColors } = watchEnum(Colors, (event) => {
 *   accessLog.push(event);
 * });
 *
 * // Use the watched enum in your code
 * doSomething(WatchedColors.Red);
 * doSomethingElse(WatchedColors.Blue);
 *
 * // Later, analyze the access log
 * console.log(`Enum accessed ${accessLog.length} times`);
 * console.log('Keys accessed:', accessLog.map(e => e.key));
 *
 * @example
 * // Detect unused enum values
 * const usedKeys = new Set<string>();
 *
 * const { watched } = watchEnum(MyEnum, (event) => {
 *   if (event.key) usedKeys.add(event.key);
 * });
 *
 * // After running your application/tests
 * const allKeys = Object.keys(MyEnum);
 * const unusedKeys = allKeys.filter(k => !usedKeys.has(k));
 * console.log('Unused enum keys:', unusedKeys);
 *
 * @example
 * // Performance monitoring
 * const { watched } = watchEnum(Status, (event) => {
 *   if (event.accessType === 'get') {
 *     performance.mark(`enum-access-${event.enumId}-${event.key}`);
 *   }
 * });
 */
export function watchEnum<E extends AnyBrandedEnum>(
  enumObj: E,
  callback: EnumWatchCallback
): WatchEnumResult<E> {
  // Validate that enumObj is a branded enum
  if (!isBrandedEnum(enumObj)) {
    throw new Error('watchEnum requires a branded enum');
  }

  const enumId = enumObj[ENUM_ID];
  const registry = getWatcherRegistry();

  // Add callback to the registry for this enum
  if (!registry.watchers.has(enumId)) {
    registry.watchers.set(enumId, new Set());
  }
  registry.watchers.get(enumId)!.add(callback);

  // Track if this watcher is still active
  let isActive = true;

  // Create a Proxy to intercept access
  const proxy = new Proxy(enumObj, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      // Only trigger callback for active watchers and string keys (not symbols)
      if (isActive && typeof prop === 'string') {
        const event: EnumAccessEvent = {
          enumId,
          accessType: 'get',
          key: prop,
          value: typeof value === 'string' ? value : undefined,
          timestamp: Date.now(),
        };

        // Call the specific callback
        callback(event);

        // Also call any global watchers
        for (const globalCallback of registry.globalWatchers) {
          globalCallback(event);
        }
      }

      return value;
    },

    has(target, prop) {
      const result = Reflect.has(target, prop);

      // Only trigger callback for active watchers and string keys
      if (isActive && typeof prop === 'string') {
        const event: EnumAccessEvent = {
          enumId,
          accessType: 'has',
          key: prop,
          timestamp: Date.now(),
        };

        callback(event);

        for (const globalCallback of registry.globalWatchers) {
          globalCallback(event);
        }
      }

      return result;
    },

    ownKeys(target) {
      const keys = Reflect.ownKeys(target);

      if (isActive) {
        const event: EnumAccessEvent = {
          enumId,
          accessType: 'keys',
          timestamp: Date.now(),
        };

        callback(event);

        for (const globalCallback of registry.globalWatchers) {
          globalCallback(event);
        }
      }

      return keys;
    },

    getOwnPropertyDescriptor(target, prop) {
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
  });

  // Create unwatch function
  const unwatch = () => {
    isActive = false;
    const callbacks = registry.watchers.get(enumId);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        registry.watchers.delete(enumId);
      }
    }
  };

  return {
    watched: proxy as E,
    unwatch,
  };
}

/**
 * Registers a global callback that receives access events from all watched enums.
 *
 * This is useful for centralized logging or monitoring of enum usage across
 * an entire application without needing to wrap each enum individually.
 *
 * @param callback - Function called for every enum access event
 * @returns A function to unregister the global callback
 *
 * @example
 * // Centralized enum access logging
 * const unregister = watchAllEnums((event) => {
 *   console.log(`[${event.enumId}] ${event.accessType}: ${event.key}`);
 * });
 *
 * // All watched enums will now trigger this callback
 * watchedStatus.Active; // Logs: "[status] get: Active"
 * watchedColors.Red; // Logs: "[colors] get: Red"
 *
 * // Stop global watching
 * unregister();
 */
export function watchAllEnums(callback: EnumWatchCallback): () => void {
  const registry = getWatcherRegistry();
  registry.globalWatchers.add(callback);

  return () => {
    registry.globalWatchers.delete(callback);
  };
}

/**
 * Clears all enum watchers (both specific and global).
 *
 * This is primarily useful for testing or when you need to reset
 * the watcher state completely.
 *
 * @example
 * // In test cleanup
 * afterEach(() => {
 *   clearAllEnumWatchers();
 * });
 */
export function clearAllEnumWatchers(): void {
  const registry = getWatcherRegistry();
  registry.watchers.clear();
  registry.globalWatchers.clear();
}

/**
 * Gets the number of active watchers for a specific enum.
 *
 * @param enumId - The enum ID to check
 * @returns The number of active watchers for this enum
 *
 * @example
 * const { watched } = watchEnum(Status, callback1);
 * watchEnum(Status, callback2);
 *
 * getEnumWatcherCount('status'); // 2
 */
export function getEnumWatcherCount(enumId: string): number {
  const registry = getWatcherRegistry();
  return registry.watchers.get(enumId)?.size ?? 0;
}

/**
 * Gets the number of global watchers.
 *
 * @returns The number of active global watchers
 */
export function getGlobalWatcherCount(): number {
  const registry = getWatcherRegistry();
  return registry.globalWatchers.size;
}


/**
 * A helper function for exhaustiveness checking in switch statements.
 *
 * This function should be called in the `default` case of a switch statement
 * when you want to ensure all cases are handled. If the switch is exhaustive,
 * TypeScript will infer that this function is never called (the value is `never`).
 * If a case is missing, TypeScript will show a compile-time error.
 *
 * At runtime, if this function is somehow called (e.g., due to a type assertion
 * or JavaScript interop), it throws a descriptive error.
 *
 * @param value - The value that should be unreachable. TypeScript should infer this as `never`.
 * @param message - Optional custom error message. Defaults to a descriptive message including the value.
 * @returns Never returns - always throws an error if called at runtime.
 * @throws {Error} Throws `Error` with message `Exhaustive check failed: unexpected value "${value}"`
 *   or the custom message if provided.
 *
 * @example
 * // Basic usage with a branded enum
 * const Status = createBrandedEnum('status', {
 *   Active: 'active',
 *   Inactive: 'inactive',
 *   Pending: 'pending',
 * } as const);
 *
 * type StatusValue = typeof Status[keyof typeof Status];
 *
 * function handleStatus(status: StatusValue): string {
 *   switch (status) {
 *     case Status.Active:
 *       return 'User is active';
 *     case Status.Inactive:
 *       return 'User is inactive';
 *     case Status.Pending:
 *       return 'User is pending';
 *     default:
 *       // TypeScript knows this is unreachable if all cases are handled
 *       return exhaustive(status);
 *   }
 * }
 *
 * @example
 * // Compile-time error when a case is missing
 * function handleStatusIncomplete(status: StatusValue): string {
 *   switch (status) {
 *     case Status.Active:
 *       return 'User is active';
 *     case Status.Inactive:
 *       return 'User is inactive';
 *     // Missing: case Status.Pending
 *     default:
 *       // TypeScript error: Argument of type '"pending"' is not assignable to parameter of type 'never'
 *       return exhaustive(status);
 *   }
 * }
 *
 * @example
 * // Custom error message
 * function processValue(value: StatusValue): void {
 *   switch (value) {
 *     case Status.Active:
 *     case Status.Inactive:
 *     case Status.Pending:
 *       console.log('Handled:', value);
 *       break;
 *     default:
 *       exhaustive(value, `Unknown status value encountered: ${value}`);
 *   }
 * }
 *
 * @example
 * // Works with any discriminated union, not just branded enums
 * type Shape =
 *   | { kind: 'circle'; radius: number }
 *   | { kind: 'square'; side: number }
 *   | { kind: 'rectangle'; width: number; height: number };
 *
 * function getArea(shape: Shape): number {
 *   switch (shape.kind) {
 *     case 'circle':
 *       return Math.PI * shape.radius ** 2;
 *     case 'square':
 *       return shape.side ** 2;
 *     case 'rectangle':
 *       return shape.width * shape.height;
 *     default:
 *       return exhaustive(shape);
 *   }
 * }
 */
export function exhaustive(value: never, message?: string): never {
  const errorMessage =
    message ?? `Exhaustive check failed: unexpected value "${String(value)}"`;
  throw new Error(errorMessage);
}

/**
 * Creates an exhaustiveness guard function bound to a specific branded enum.
 *
 * This factory function returns a guard function that can be used in switch
 * statement default cases. The returned function provides better error messages
 * by including the enum ID in the error.
 *
 * This is useful when you want to:
 * - Have consistent error messages that include the enum name
 * - Create reusable guards for specific enums
 * - Provide more context in error messages for debugging
 *
 * @template E - The branded enum type
 * @param enumObj - The branded enum to create a guard for
 * @returns A function that throws an error with the enum ID included in the message
 * @throws {Error} Throws `Error` with message `exhaustiveGuard requires a branded enum`
 *   if enumObj is not a valid branded enum.
 *
 * @example
 * // Create a guard for a specific enum
 * const Status = createBrandedEnum('status', {
 *   Active: 'active',
 *   Inactive: 'inactive',
 *   Pending: 'pending',
 * } as const);
 *
 * const assertStatusExhaustive = exhaustiveGuard(Status);
 *
 * type StatusValue = typeof Status[keyof typeof Status];
 *
 * function handleStatus(status: StatusValue): string {
 *   switch (status) {
 *     case Status.Active:
 *       return 'Active';
 *     case Status.Inactive:
 *       return 'Inactive';
 *     case Status.Pending:
 *       return 'Pending';
 *     default:
 *       // Error message will include "status" enum ID
 *       return assertStatusExhaustive(status);
 *   }
 * }
 *
 * @example
 * // Inline usage without storing the guard
 * function processStatus(status: StatusValue): void {
 *   switch (status) {
 *     case Status.Active:
 *     case Status.Inactive:
 *     case Status.Pending:
 *       console.log('Processing:', status);
 *       break;
 *     default:
 *       exhaustiveGuard(Status)(status);
 *   }
 * }
 *
 * @example
 * // Runtime error message example
 * // If somehow called with an unexpected value at runtime:
 * // Error: Exhaustive check failed for enum "status": unexpected value "unknown"
 *
 * @example
 * // Compile-time error when case is missing
 * function incompleteHandler(status: StatusValue): string {
 *   switch (status) {
 *     case Status.Active:
 *       return 'Active';
 *     // Missing: Inactive and Pending cases
 *     default:
 *       // TypeScript error: Argument of type '"inactive" | "pending"' is not assignable to parameter of type 'never'
 *       return assertStatusExhaustive(status);
 *   }
 * }
 */
export function exhaustiveGuard<E extends AnyBrandedEnum>(
  enumObj: E
): (value: never) => never {
  // Validate that enumObj is a branded enum
  if (!isBrandedEnum(enumObj)) {
    throw new Error('exhaustiveGuard requires a branded enum');
  }

  const enumId = enumObj[ENUM_ID];

  return (value: never): never => {
    throw new Error(
      `Exhaustive check failed for enum "${enumId}": unexpected value "${String(value)}"`
    );
  };
}

// =============================================================================
// JSON Schema Generation
// =============================================================================

/**
 * Options for customizing JSON Schema generation.
 */
export interface ToJsonSchemaOptions {
  /**
   * Custom title for the schema. Defaults to the enum ID.
   */
  readonly title?: string;

  /**
   * Description for the schema. If not provided, a default description
   * mentioning the enum ID will be used.
   */
  readonly description?: string;

  /**
   * Whether to include the $schema property. Defaults to true.
   */
  readonly includeSchema?: boolean;

  /**
   * The JSON Schema draft version to use. Defaults to 'draft-07'.
   */
  readonly schemaVersion?: 'draft-04' | 'draft-06' | 'draft-07' | '2019-09' | '2020-12';
}

/**
 * JSON Schema representation of a branded enum.
 *
 * This interface represents the structure of the generated JSON Schema,
 * following the JSON Schema specification.
 */
export interface EnumJsonSchema {
  /**
   * The JSON Schema version URI (if includeSchema is true).
   */
  readonly $schema?: string;

  /**
   * The title of the schema (typically the enum ID).
   */
  readonly title: string;

  /**
   * Description of the schema.
   */
  readonly description: string;

  /**
   * The type constraint - always 'string' for branded enums.
   */
  readonly type: 'string';

  /**
   * The enum constraint containing all valid values.
   */
  readonly enum: readonly string[];
}

/**
 * Maps schema version options to their corresponding $schema URIs.
 */
const SCHEMA_VERSION_URIS: Record<NonNullable<ToJsonSchemaOptions['schemaVersion']>, string> = {
  'draft-04': 'http://json-schema.org/draft-04/schema#',
  'draft-06': 'http://json-schema.org/draft-06/schema#',
  'draft-07': 'http://json-schema.org/draft-07/schema#',
  '2019-09': 'https://json-schema.org/draft/2019-09/schema',
  '2020-12': 'https://json-schema.org/draft/2020-12/schema',
};

/**
 * Generates a JSON Schema from a branded enum.
 *
 * This function creates a JSON Schema object that validates strings against
 * the values of a branded enum. The generated schema can be used with any
 * JSON Schema validator to ensure that input values are valid enum members.
 *
 * The schema includes:
 * - `$schema`: The JSON Schema version URI (optional, defaults to draft-07)
 * - `title`: The enum ID or a custom title
 * - `description`: A description of the enum
 * - `type`: Always 'string' for branded enums
 * - `enum`: An array of all valid enum values
 *
 * @template E - The branded enum type
 * @param enumObj - The branded enum to generate a schema for
 * @param options - Optional configuration for schema generation
 * @returns A JSON Schema object that validates against the enum values
 * @throws {Error} Throws `Error` with message `toJsonSchema requires a branded enum`
 *   if enumObj is not a valid branded enum.
 *
 * @example
 * // Basic usage - generate schema with defaults
 * const Status = createBrandedEnum('status', {
 *   Active: 'active',
 *   Inactive: 'inactive',
 *   Pending: 'pending',
 * } as const);
 *
 * const schema = toJsonSchema(Status);
 * // {
 * //   $schema: 'http://json-schema.org/draft-07/schema#',
 * //   title: 'status',
 * //   description: 'Enum values for status',
 * //   type: 'string',
 * //   enum: ['active', 'inactive', 'pending']
 * // }
 *
 * @example
 * // Custom title and description
 * const Priority = createBrandedEnum('priority', {
 *   High: 'high',
 *   Medium: 'medium',
 *   Low: 'low',
 * } as const);
 *
 * const schema = toJsonSchema(Priority, {
 *   title: 'Task Priority',
 *   description: 'The priority level of a task',
 * });
 * // {
 * //   $schema: 'http://json-schema.org/draft-07/schema#',
 * //   title: 'Task Priority',
 * //   description: 'The priority level of a task',
 * //   type: 'string',
 * //   enum: ['high', 'medium', 'low']
 * // }
 *
 * @example
 * // Without $schema property
 * const schema = toJsonSchema(Status, { includeSchema: false });
 * // {
 * //   title: 'status',
 * //   description: 'Enum values for status',
 * //   type: 'string',
 * //   enum: ['active', 'inactive', 'pending']
 * // }
 *
 * @example
 * // Using a different schema version
 * const schema = toJsonSchema(Status, { schemaVersion: '2020-12' });
 * // {
 * //   $schema: 'https://json-schema.org/draft/2020-12/schema',
 * //   title: 'status',
 * //   description: 'Enum values for status',
 * //   type: 'string',
 * //   enum: ['active', 'inactive', 'pending']
 * // }
 *
 * @example
 * // Use with JSON Schema validators
 * import Ajv from 'ajv';
 *
 * const schema = toJsonSchema(Status);
 * const ajv = new Ajv();
 * const validate = ajv.compile(schema);
 *
 * validate('active'); // true
 * validate('inactive'); // true
 * validate('unknown'); // false
 *
 * @example
 * // Embed in a larger schema
 * const userSchema = {
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string' },
 *     status: toJsonSchema(Status, { includeSchema: false }),
 *   },
 *   required: ['name', 'status'],
 * };
 *
 * @example
 * // Generate schemas for API documentation
 * const schemas = {
 *   Status: toJsonSchema(Status),
 *   Priority: toJsonSchema(Priority),
 * };
 *
 * // Export for OpenAPI/Swagger
 * const openApiComponents = {
 *   schemas: Object.fromEntries(
 *     Object.entries(schemas).map(([name, schema]) => [
 *       name,
 *       { ...schema, $schema: undefined }, // OpenAPI doesn't use $schema
 *     ])
 *   ),
 * };
 */
export function toJsonSchema<E extends AnyBrandedEnum>(
  enumObj: E,
  options: ToJsonSchemaOptions = {}
): EnumJsonSchema {
  // Validate that enumObj is a branded enum
  if (!isBrandedEnum(enumObj)) {
    throw new Error('toJsonSchema requires a branded enum');
  }

  const enumId = enumObj[ENUM_ID];
  const values = enumObj[ENUM_VALUES];

  // Extract options with defaults
  const {
    title = enumId,
    description = `Enum values for ${enumId}`,
    includeSchema = true,
    schemaVersion = 'draft-07',
  } = options;

  // Build the schema object
  const schema: EnumJsonSchema = {
    title,
    description,
    type: 'string',
    enum: Array.from(values).sort(),
  };

  // Add $schema if requested
  if (includeSchema) {
    return {
      $schema: SCHEMA_VERSION_URIS[schemaVersion],
      ...schema,
    };
  }

  return schema;
}

// =============================================================================
// Zod Schema Generation
// =============================================================================

/**
 * Options for customizing Zod schema definition generation.
 */
export interface ToZodSchemaOptions {
  /**
   * Optional description to include in the schema definition.
   * When provided, the generated schema will include a `description` field
   * that can be used with Zod's `.describe()` method.
   */
  readonly description?: string;
}

/**
 * Zod-compatible schema definition for a branded enum.
 *
 * This interface represents a schema definition object that can be used
 * to construct a Zod enum schema without depending on Zod at runtime.
 * The definition follows Zod's internal structure for enum schemas.
 *
 * To use with Zod:
 * ```typescript
 * import { z } from 'zod';
 * const def = toZodSchema(MyEnum);
 * const schema = z.enum(def.values);
 * if (def.description) {
 *   schema.describe(def.description);
 * }
 * ```
 */
export interface ZodEnumSchemaDefinition<T extends readonly [string, ...string[]]> {
  /**
   * The type identifier for this schema definition.
   * Always 'ZodEnum' to indicate this is an enum schema.
   */
  readonly typeName: 'ZodEnum';

  /**
   * The enum values as a readonly tuple.
   * This matches Zod's requirement for `z.enum()` which requires
   * at least one value (hence the `[string, ...string[]]` type).
   */
  readonly values: T;

  /**
   * Optional description for the schema.
   * Can be used with Zod's `.describe()` method.
   */
  readonly description?: string;

  /**
   * The enum ID from the branded enum.
   * Useful for debugging and documentation purposes.
   */
  readonly enumId: string;
}

/**
 * Generates a Zod-compatible schema definition from a branded enum.
 *
 * This function creates a schema definition object that can be used to
 * construct a Zod enum schema. The library maintains zero dependencies
 * by returning a definition object rather than a Zod instance.
 *
 * The returned definition includes:
 * - `typeName`: Always 'ZodEnum' to identify the schema type
 * - `values`: A tuple of all enum values (sorted for consistency)
 * - `description`: Optional description for the schema
 * - `enumId`: The branded enum's ID for reference
 *
 * **Zero Dependencies**: This function does not import or depend on Zod.
 * It returns a plain object that you can use to construct a Zod schema
 * in your own code where Zod is available.
 *
 * @template E - The branded enum type
 * @param enumObj - The branded enum to generate a schema definition for
 * @param options - Optional configuration for schema generation
 * @returns A Zod-compatible schema definition object
 * @throws {Error} Throws `Error` with message `toZodSchema requires a branded enum`
 *   if enumObj is not a valid branded enum.
 * @throws {Error} Throws `Error` with message `toZodSchema requires an enum with at least one value`
 *   if the enum has no values (Zod requires at least one value for z.enum()).
 *
 * @example
 * // Basic usage - generate schema definition
 * const Status = createBrandedEnum('status', {
 *   Active: 'active',
 *   Inactive: 'inactive',
 *   Pending: 'pending',
 * } as const);
 *
 * const schemaDef = toZodSchema(Status);
 * // {
 * //   typeName: 'ZodEnum',
 * //   values: ['active', 'inactive', 'pending'],
 * //   enumId: 'status'
 * // }
 *
 * @example
 * // Use with Zod to create an actual schema
 * import { z } from 'zod';
 *
 * const Status = createBrandedEnum('status', {
 *   Active: 'active',
 *   Inactive: 'inactive',
 * } as const);
 *
 * const def = toZodSchema(Status);
 * const statusSchema = z.enum(def.values);
 *
 * // Validate values
 * statusSchema.parse('active'); // 'active'
 * statusSchema.parse('invalid'); // throws ZodError
 *
 * @example
 * // With description
 * const Priority = createBrandedEnum('priority', {
 *   High: 'high',
 *   Medium: 'medium',
 *   Low: 'low',
 * } as const);
 *
 * const def = toZodSchema(Priority, {
 *   description: 'Task priority level',
 * });
 * // {
 * //   typeName: 'ZodEnum',
 * //   values: ['high', 'low', 'medium'],
 * //   description: 'Task priority level',
 * //   enumId: 'priority'
 * // }
 *
 * // Use with Zod
 * const schema = z.enum(def.values).describe(def.description!);
 *
 * @example
 * // Type-safe schema creation helper
 * import { z } from 'zod';
 *
 * function createZodEnumFromBranded<E extends BrandedEnum<Record<string, string>>>(
 *   enumObj: E,
 *   description?: string
 * ) {
 *   const def = toZodSchema(enumObj, { description });
 *   const schema = z.enum(def.values);
 *   return description ? schema.describe(description) : schema;
 * }
 *
 * const statusSchema = createZodEnumFromBranded(Status, 'User status');
 *
 * @example
 * // Generate schemas for multiple enums
 * const schemas = {
 *   status: toZodSchema(Status),
 *   priority: toZodSchema(Priority),
 *   category: toZodSchema(Category),
 * };
 *
 * // Later, construct Zod schemas as needed
 * import { z } from 'zod';
 * const zodSchemas = Object.fromEntries(
 *   Object.entries(schemas).map(([key, def]) => [key, z.enum(def.values)])
 * );
 *
 * @example
 * // Use in form validation
 * import { z } from 'zod';
 *
 * const statusDef = toZodSchema(Status);
 * const priorityDef = toZodSchema(Priority);
 *
 * const taskSchema = z.object({
 *   title: z.string().min(1),
 *   status: z.enum(statusDef.values),
 *   priority: z.enum(priorityDef.values),
 * });
 *
 * type Task = z.infer<typeof taskSchema>;
 * // { title: string; status: 'active' | 'inactive' | 'pending'; priority: 'high' | 'medium' | 'low' }
 */
export function toZodSchema<E extends AnyBrandedEnum>(
  enumObj: E,
  options: ToZodSchemaOptions = {}
): ZodEnumSchemaDefinition<readonly [string, ...string[]]> {
  // Validate that enumObj is a branded enum
  if (!isBrandedEnum(enumObj)) {
    throw new Error('toZodSchema requires a branded enum');
  }

  const enumId = enumObj[ENUM_ID];
  const values = enumObj[ENUM_VALUES];

  // Convert Set to sorted array
  const valuesArray = Array.from(values).sort();

  // Zod's z.enum() requires at least one value
  if (valuesArray.length === 0) {
    throw new Error('toZodSchema requires an enum with at least one value');
  }

  // Build the schema definition
  const definition: ZodEnumSchemaDefinition<readonly [string, ...string[]]> = {
    typeName: 'ZodEnum',
    values: valuesArray as unknown as readonly [string, ...string[]],
    enumId,
  };

  // Add description if provided
  if (options.description !== undefined) {
    return {
      ...definition,
      description: options.description,
    };
  }

  return definition;
}

// =============================================================================
// Enum Serializer
// =============================================================================

/**
 * Options for customizing enum serialization behavior.
 */
export interface EnumSerializerOptions<T extends string = string> {
  /**
   * Custom transform function applied during serialization.
   * Transforms the enum value before it is serialized.
   * 
   * @param value - The original enum value
   * @returns The transformed value for serialization
   */
  readonly serialize?: (value: T) => string;

  /**
   * Custom transform function applied during deserialization.
   * Transforms the serialized value before validation.
   * This is applied BEFORE validation against the enum.
   * 
   * @param value - The serialized value
   * @returns The transformed value to validate against the enum
   */
  readonly deserialize?: (value: string) => string;
}

/**
 * Result of a successful deserialization.
 * 
 * @template T - The type of the deserialized value
 */
export interface DeserializeSuccess<T> {
  /** Indicates the deserialization was successful */
  readonly success: true;
  /** The validated and deserialized enum value */
  readonly value: T;
}

/**
 * Result of a failed deserialization.
 */
export interface DeserializeFailure {
  /** Indicates the deserialization failed */
  readonly success: false;
  /** Error information about the failure */
  readonly error: {
    /** Human-readable error message */
    readonly message: string;
    /** The input value that failed deserialization */
    readonly input: unknown;
    /** The enum ID (if available) */
    readonly enumId?: string;
    /** The valid values for the enum (if available) */
    readonly validValues?: readonly string[];
  };
}

/**
 * Union type representing the result of deserialization.
 * 
 * @template T - The type of the successfully deserialized value
 */
export type DeserializeResult<T> = DeserializeSuccess<T> | DeserializeFailure;

/**
 * A serializer/deserializer pair for branded enum values.
 * 
 * Provides methods to serialize enum values (optionally with transformation)
 * and deserialize values back with validation against the enum.
 * 
 * @template E - The branded enum type
 */
export interface EnumSerializer<E extends AnyBrandedEnum> {
  /**
   * The branded enum this serializer is bound to.
   */
  readonly enumObj: E;

  /**
   * The enum ID for reference.
   */
  readonly enumId: string;

  /**
   * Serializes an enum value to a string.
   * 
   * If a custom serialize transform was provided, it is applied to the value.
   * 
   * @param value - The enum value to serialize
   * @returns The serialized string value
   */
  serialize(value: EnumValues<E>): string;

  /**
   * Deserializes a string value back to an enum value.
   * 
   * If a custom deserialize transform was provided, it is applied before validation.
   * Returns a result object indicating success or failure with detailed error info.
   * 
   * @param value - The string value to deserialize
   * @returns A DeserializeResult indicating success or failure
   */
  deserialize(value: unknown): DeserializeResult<EnumValues<E>>;

  /**
   * Deserializes a string value, throwing an error if invalid.
   * 
   * This is a convenience method that throws instead of returning a result object.
   * 
   * @param value - The string value to deserialize
   * @returns The validated enum value
   * @throws Error if the value is not valid for the enum
   */
  deserializeOrThrow(value: unknown): EnumValues<E>;
}

/**
 * Creates a serializer/deserializer pair for a branded enum.
 * 
 * The serializer provides methods to convert enum values to strings (with optional
 * transformation) and to deserialize strings back to validated enum values.
 * 
 * This is useful for:
 * - Storing enum values in databases or localStorage with custom formats
 * - Transmitting enum values over APIs with encoding/decoding
 * - Migrating between different value formats
 * - Adding prefixes/suffixes for namespacing during serialization
 * 
 * **Serialization Flow:**
 * 1. Take an enum value
 * 2. Apply custom `serialize` transform (if provided)
 * 3. Return the serialized string
 * 
 * **Deserialization Flow:**
 * 1. Take a string input
 * 2. Apply custom `deserialize` transform (if provided)
 * 3. Validate the result against the enum
 * 4. Return success with the value, or failure with error details
 * 
 * @template E - The branded enum type
 * @param enumObj - The branded enum to create a serializer for
 * @param options - Optional configuration for custom transforms
 * @returns An EnumSerializer object with serialize and deserialize methods
 * @throws {Error} Throws `Error` with message `enumSerializer requires a branded enum`
 *   if enumObj is not a valid branded enum.
 * 
 * @example
 * // Basic usage without transforms
 * const Status = createBrandedEnum('status', {
 *   Active: 'active',
 *   Inactive: 'inactive',
 * } as const);
 * 
 * const serializer = enumSerializer(Status);
 * 
 * // Serialize
 * const serialized = serializer.serialize(Status.Active); // 'active'
 * 
 * // Deserialize
 * const result = serializer.deserialize('active');
 * if (result.success) {
 *   console.log(result.value); // 'active'
 * }
 * 
 * @example
 * // With custom transforms - add prefix during serialization
 * const Priority = createBrandedEnum('priority', {
 *   High: 'high',
 *   Medium: 'medium',
 *   Low: 'low',
 * } as const);
 * 
 * const serializer = enumSerializer(Priority, {
 *   serialize: (value) => `priority:${value}`,
 *   deserialize: (value) => value.replace('priority:', ''),
 * });
 * 
 * // Serialize adds prefix
 * serializer.serialize(Priority.High); // 'priority:high'
 * 
 * // Deserialize removes prefix and validates
 * const result = serializer.deserialize('priority:high');
 * if (result.success) {
 *   console.log(result.value); // 'high'
 * }
 * 
 * @example
 * // Base64 encoding for storage
 * const Secret = createBrandedEnum('secret', {
 *   Token: 'token',
 *   Key: 'key',
 * } as const);
 * 
 * const serializer = enumSerializer(Secret, {
 *   serialize: (value) => btoa(value),
 *   deserialize: (value) => atob(value),
 * });
 * 
 * serializer.serialize(Secret.Token); // 'dG9rZW4=' (base64 of 'token')
 * serializer.deserialize('dG9rZW4='); // { success: true, value: 'token' }
 * 
 * @example
 * // Error handling
 * const result = serializer.deserialize('invalid');
 * if (!result.success) {
 *   console.log(result.error.message);
 *   // 'Value "invalid" is not a member of enum "status"'
 *   console.log(result.error.validValues);
 *   // ['active', 'inactive']
 * }
 * 
 * @example
 * // Using deserializeOrThrow for simpler code when errors should throw
 * try {
 *   const value = serializer.deserializeOrThrow('active');
 *   console.log(value); // 'active'
 * } catch (e) {
 *   console.error('Invalid value:', e.message);
 * }
 * 
 * @example
 * // Case-insensitive deserialization
 * const Colors = createBrandedEnum('colors', {
 *   Red: 'red',
 *   Green: 'green',
 *   Blue: 'blue',
 * } as const);
 * 
 * const caseInsensitiveSerializer = enumSerializer(Colors, {
 *   deserialize: (value) => value.toLowerCase(),
 * });
 * 
 * caseInsensitiveSerializer.deserialize('RED'); // { success: true, value: 'red' }
 * caseInsensitiveSerializer.deserialize('Red'); // { success: true, value: 'red' }
 * caseInsensitiveSerializer.deserialize('red'); // { success: true, value: 'red' }
 */
export function enumSerializer<E extends AnyBrandedEnum>(
  enumObj: E,
  options: EnumSerializerOptions<EnumValues<E>> = {}
): EnumSerializer<E> {
  // Validate that enumObj is a branded enum
  if (!isBrandedEnum(enumObj)) {
    throw new Error('enumSerializer requires a branded enum');
  }

  const enumId = enumObj[ENUM_ID];
  const values = enumObj[ENUM_VALUES];
  const validValues = Array.from(values).sort();

  const { serialize: serializeTransform, deserialize: deserializeTransform } = options;

  return {
    enumObj,
    enumId,

    serialize(value: EnumValues<E>): string {
      // Apply custom transform if provided
      if (serializeTransform) {
        return serializeTransform(value);
      }
      return value;
    },

    deserialize(value: unknown): DeserializeResult<EnumValues<E>> {
      // Check if value is a string
      if (typeof value !== 'string') {
        const valueType = value === null ? 'null' : typeof value;
        return {
          success: false,
          error: {
            message: `Expected a string value, received ${valueType}`,
            input: value,
            enumId,
            validValues,
          },
        };
      }

      // Apply custom deserialize transform if provided
      let transformedValue = value;
      if (deserializeTransform) {
        try {
          transformedValue = deserializeTransform(value);
        } catch (e) {
          return {
            success: false,
            error: {
              message: `Deserialize transform failed: ${e instanceof Error ? e.message : String(e)}`,
              input: value,
              enumId,
              validValues,
            },
          };
        }
      }

      // Validate against the enum
      if (!values.has(transformedValue)) {
        return {
          success: false,
          error: {
            message: `Value "${transformedValue}" is not a member of enum "${enumId}"`,
            input: value,
            enumId,
            validValues,
          },
        };
      }

      return {
        success: true,
        value: transformedValue as EnumValues<E>,
      };
    },

    deserializeOrThrow(value: unknown): EnumValues<E> {
      const result = this.deserialize(value);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.value;
    },
  };
}
