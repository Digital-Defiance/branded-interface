/**
 * Type guards for branded enums.
 *
 * Provides runtime type checking and assertion functions
 * for validating values against branded enums.
 */

import {
  AnyBrandedEnum,
  BrandedEnum,
  BrandedEnumValue,
  ENUM_ID,
  ENUM_VALUES,
  EnumValues,
} from './types.js';

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
 * Checks if a value belongs to a specific branded enum.
 *
 * Returns true if and only if:
 * - enumObj is a valid branded enum (has Symbol metadata)
 * - value is a string
 * - value exists in the enum's value Set
 *
 * This function provides TypeScript type narrowing - when it returns true,
 * the value's type is narrowed to the enum's value type.
 *
 * @template E - The branded enum type
 * @param value - The value to check. Can be any type; non-strings return false.
 * @param enumObj - The branded enum to check against
 * @returns `true` if value is in the enum (with type narrowing), `false` otherwise.
 *   Returns `false` for non-string values, null, undefined, or if enumObj
 *   is not a branded enum.
 *
 * @example
 * // Basic type guard usage
 * const Status = createBrandedEnum('status', { Active: 'active', Inactive: 'inactive' } as const);
 *
 * function handleStatus(value: unknown) {
 *   if (isFromEnum(value, Status)) {
 *     // value is narrowed to 'active' | 'inactive'
 *     console.log('Valid status:', value);
 *   } else {
 *     console.log('Invalid status');
 *   }
 * }
 *
 * @example
 * // Returns false for non-string values
 * isFromEnum(123, Status); // false
 * isFromEnum(null, Status); // false
 * isFromEnum(undefined, Status); // false
 *
 * @example
 * // Returns false for non-branded enum objects
 * isFromEnum('active', { Active: 'active' }); // false (not a branded enum)
 */
export function isFromEnum<E extends AnyBrandedEnum>(
  value: unknown,
  enumObj: E
): value is EnumValues<E> {
  // Return false for non-string values
  if (typeof value !== 'string') {
    return false;
  }

  // Return false if enumObj is not a branded enum
  if (!isBrandedEnum(enumObj)) {
    return false;
  }

  // Check if value exists in enum's value Set
  return enumObj[ENUM_VALUES].has(value);
}

/**
 * Asserts that a value belongs to a branded enum, throwing if not.
 *
 * Use this function when you want to validate a value and throw an error
 * if it's invalid, rather than handling the false case manually.
 *
 * @template E - The branded enum type
 * @param value - The value to check. Can be any type.
 * @param enumObj - The branded enum to check against
 * @returns The value with narrowed type if valid
 * @throws {Error} Throws `Error` with message `Second argument is not a branded enum`
 *   if enumObj is not a valid branded enum.
 * @throws {Error} Throws `Error` with message `Value "${value}" is not a member of enum "${enumId}"`
 *   if the value is not found in the enum.
 *
 * @example
 * // Successful assertion
 * const Status = createBrandedEnum('status', { Active: 'active', Inactive: 'inactive' } as const);
 * const validated = assertFromEnum('active', Status);
 * // validated is typed as 'active' | 'inactive'
 *
 * @example
 * // Throws for invalid value
 * try {
 *   assertFromEnum('unknown', Status);
 * } catch (e) {
 *   console.log(e.message); // 'Value "unknown" is not a member of enum "status"'
 * }
 *
 * @example
 * // Throws for non-branded enum
 * try {
 *   assertFromEnum('active', { Active: 'active' });
 * } catch (e) {
 *   console.log(e.message); // 'Second argument is not a branded enum'
 * }
 */
export function assertFromEnum<E extends AnyBrandedEnum>(
  value: unknown,
  enumObj: E
): EnumValues<E> {
  // Check if enumObj is a branded enum
  if (!isBrandedEnum(enumObj)) {
    throw new Error('Second argument is not a branded enum');
  }

  // Check if value is in the enum
  if (!isFromEnum(value, enumObj)) {
    const enumId = enumObj[ENUM_ID];
    throw new Error(`Value "${value}" is not a member of enum "${enumId}"`);
  }

  return value as EnumValues<E>;
}

/**
 * Safely parses a value against a branded enum, returning a default if invalid.
 *
 * This is a non-throwing alternative to `assertFromEnum`. Instead of throwing
 * an error when the value is not in the enum, it returns the provided default value.
 *
 * Use this function when you want to handle invalid values gracefully without
 * try/catch blocks, such as when parsing user input or external data.
 *
 * @template E - The branded enum type
 * @param value - The value to parse. Can be any type; non-strings will return the default.
 * @param enumObj - The branded enum to validate against
 * @param defaultValue - The value to return if parsing fails. Must be a valid enum value.
 * @returns The original value if it exists in the enum, otherwise the default value.
 *   The return type is narrowed to the enum's value type.
 *
 * @example
 * // Basic usage with default fallback
 * const Status = createBrandedEnum('status', {
 *   Active: 'active',
 *   Inactive: 'inactive',
 *   Pending: 'pending',
 * } as const);
 *
 * // Valid value returns as-is
 * parseEnum('active', Status, Status.Pending); // 'active'
 *
 * // Invalid value returns default
 * parseEnum('unknown', Status, Status.Pending); // 'pending'
 *
 * // Non-string value returns default
 * parseEnum(null, Status, Status.Inactive); // 'inactive'
 * parseEnum(123, Status, Status.Inactive); // 'inactive'
 *
 * @example
 * // Parsing user input safely
 * function handleUserStatus(input: unknown): void {
 *   const status = parseEnum(input, Status, Status.Pending);
 *   // status is guaranteed to be 'active' | 'inactive' | 'pending'
 *   console.log('Processing status:', status);
 * }
 *
 * @example
 * // Parsing API response with fallback
 * interface ApiResponse {
 *   status?: string;
 * }
 *
 * function processResponse(response: ApiResponse) {
 *   const status = parseEnum(response.status, Status, Status.Inactive);
 *   // Handles undefined, null, or invalid status values gracefully
 *   return { status };
 * }
 *
 * @example
 * // Chaining with optional values
 * const userStatus = parseEnum(
 *   localStorage.getItem('userStatus'),
 *   Status,
 *   Status.Active
 * );
 */
export function parseEnum<E extends AnyBrandedEnum>(
  value: unknown,
  enumObj: E,
  defaultValue: EnumValues<E>
): EnumValues<E> {
  // If the value is valid, return it
  if (isFromEnum(value, enumObj)) {
    return value;
  }

  // Otherwise return the default
  return defaultValue;
}

// =============================================================================
// Safe Parse Result Types
// =============================================================================

/**
 * Represents a successful parse result from safeParseEnum.
 *
 * @template T - The type of the successfully parsed value
 */
export interface SafeParseSuccess<T> {
  /** Indicates the parse was successful */
  readonly success: true;
  /** The validated enum value */
  readonly value: T;
}

/**
 * Represents a failed parse result from safeParseEnum.
 *
 * Contains detailed error information for debugging and user feedback.
 */
export interface SafeParseFailure {
  /** Indicates the parse failed */
  readonly success: false;
  /** Detailed error information */
  readonly error: SafeParseError;
}

/**
 * Detailed error information for a failed parse.
 */
export interface SafeParseError {
  /** Human-readable error message */
  readonly message: string;
  /** The code identifying the type of error */
  readonly code: SafeParseErrorCode;
  /** The input value that failed validation */
  readonly input: unknown;
  /** The enum ID (if available) */
  readonly enumId?: string;
  /** The valid values for the enum (if available) */
  readonly validValues?: readonly string[];
}

/**
 * Error codes for safe parse failures.
 */
export type SafeParseErrorCode =
  | 'INVALID_ENUM_OBJECT'
  | 'INVALID_VALUE_TYPE'
  | 'VALUE_NOT_IN_ENUM';

/**
 * Union type representing the result of safeParseEnum.
 *
 * @template T - The type of the successfully parsed value
 */
export type SafeParseResult<T> = SafeParseSuccess<T> | SafeParseFailure;

/**
 * Safely parses a value against a branded enum, returning a result object.
 *
 * This function provides validated deserialization with detailed error information.
 * Unlike `parseEnum` which returns a default value on failure, or `assertFromEnum`
 * which throws an error, `safeParseEnum` returns a discriminated union result
 * that allows for explicit success/failure handling.
 *
 * The result is either:
 * - `{ success: true, value: T }` - The value is valid and typed correctly
 * - `{ success: false, error: SafeParseError }` - The value is invalid with details
 *
 * Error codes:
 * - `INVALID_ENUM_OBJECT` - The enumObj is not a valid branded enum
 * - `INVALID_VALUE_TYPE` - The value is not a string
 * - `VALUE_NOT_IN_ENUM` - The value is a string but not in the enum
 *
 * @template E - The branded enum type
 * @param value - The value to parse. Can be any type.
 * @param enumObj - The branded enum to validate against
 * @returns A SafeParseResult containing either the validated value or error details
 *
 * @example
 * // Basic usage with success
 * const Status = createBrandedEnum('status', {
 *   Active: 'active',
 *   Inactive: 'inactive',
 * } as const);
 *
 * const result = safeParseEnum('active', Status);
 * if (result.success) {
 *   console.log('Valid status:', result.value); // 'active'
 * } else {
 *   console.log('Error:', result.error.message);
 * }
 *
 * @example
 * // Handling invalid value
 * const result = safeParseEnum('unknown', Status);
 * if (!result.success) {
 *   console.log(result.error.code); // 'VALUE_NOT_IN_ENUM'
 *   console.log(result.error.message); // 'Value "unknown" is not a member of enum "status"'
 *   console.log(result.error.validValues); // ['active', 'inactive']
 * }
 *
 * @example
 * // Handling non-string input
 * const result = safeParseEnum(123, Status);
 * if (!result.success) {
 *   console.log(result.error.code); // 'INVALID_VALUE_TYPE'
 *   console.log(result.error.message); // 'Expected a string value, received number'
 * }
 *
 * @example
 * // Parsing API response
 * interface ApiResponse {
 *   status?: string;
 * }
 *
 * function processResponse(response: ApiResponse) {
 *   const result = safeParseEnum(response.status, Status);
 *   if (result.success) {
 *     return { status: result.value };
 *   } else {
 *     // Log detailed error for debugging
 *     console.error('Invalid status:', result.error);
 *     return { status: Status.Inactive }; // fallback
 *   }
 * }
 *
 * @example
 * // Form validation with detailed errors
 * function validateForm(data: Record<string, unknown>) {
 *   const statusResult = safeParseEnum(data.status, Status);
 *   const errors: string[] = [];
 *
 *   if (!statusResult.success) {
 *     errors.push(`Status: ${statusResult.error.message}`);
 *   }
 *
 *   return {
 *     isValid: errors.length === 0,
 *     errors,
 *     data: statusResult.success ? { status: statusResult.value } : null,
 *   };
 * }
 *
 * @example
 * // Type narrowing with result
 * const result = safeParseEnum(userInput, Status);
 * if (result.success) {
 *   // result.value is typed as 'active' | 'inactive'
 *   handleStatus(result.value);
 * } else {
 *   // result.error is typed as SafeParseError
 *   showError(result.error.message);
 * }
 */
export function safeParseEnum<E extends AnyBrandedEnum>(
  value: unknown,
  enumObj: E
): SafeParseResult<EnumValues<E>> {
  // Check if enumObj is a branded enum
  if (!isBrandedEnum(enumObj)) {
    return {
      success: false,
      error: {
        message: 'Second argument is not a branded enum',
        code: 'INVALID_ENUM_OBJECT',
        input: value,
      },
    };
  }

  const enumId = enumObj[ENUM_ID];
  const validValues = Array.from(enumObj[ENUM_VALUES]).sort();

  // Check if value is a string
  if (typeof value !== 'string') {
    const valueType = value === null ? 'null' : typeof value;
    return {
      success: false,
      error: {
        message: `Expected a string value, received ${valueType}`,
        code: 'INVALID_VALUE_TYPE',
        input: value,
        enumId,
        validValues,
      },
    };
  }

  // Check if value is in the enum
  if (!enumObj[ENUM_VALUES].has(value)) {
    return {
      success: false,
      error: {
        message: `Value "${value}" is not a member of enum "${enumId}"`,
        code: 'VALUE_NOT_IN_ENUM',
        input: value,
        enumId,
        validValues,
      },
    };
  }

  // Success case
  return {
    success: true,
    value: value as EnumValues<E>,
  };
}
