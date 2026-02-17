/**
 * Type guards and safe parsing for branded interfaces and primitives.
 *
 * Provides runtime type checking, assertion, and safe parsing with
 * discriminated union results for branded types.
 */

import {
  INTERFACE_ID,
  BrandedInterfaceDefinition,
  BrandedInstance,
  BrandedPrimitiveDefinition,
  InterfaceSafeParseResult,
} from './types.js';

// =============================================================================
// isOfInterface
// =============================================================================

/**
 * Type guard that checks if a value is a branded instance of the given interface definition.
 *
 * Checks that the value is a non-null, non-array object with an INTERFACE_ID symbol
 * matching the definition's ID.
 */
export function isOfInterface<T extends Record<string, unknown>>(
  value: unknown,
  definition: BrandedInterfaceDefinition<T>
): value is BrandedInstance<T> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  return (value as Record<symbol, unknown>)[INTERFACE_ID] === definition.id;
}

// =============================================================================
// assertOfInterface
// =============================================================================

/**
 * Asserts that a value is a branded instance of the given interface definition.
 * Throws a descriptive error if the assertion fails.
 */
export function assertOfInterface<T extends Record<string, unknown>>(
  value: unknown,
  definition: BrandedInterfaceDefinition<T>
): BrandedInstance<T> {
  if (!isOfInterface(value, definition)) {
    throw new Error(
      `Value is not a branded instance of interface "${definition.id}"`
    );
  }
  return value;
}


// =============================================================================
// safeParseInterface
// =============================================================================

/**
 * Safely parses a value against a branded interface definition.
 *
 * Returns a discriminated union result:
 * - If the definition is invalid: failure with code 'INVALID_DEFINITION'
 * - If the value is not an object: failure with code 'INVALID_VALUE_TYPE'
 * - If the value is already a branded instance: success with the value
 * - If the value is a plain object matching the schema: validates, brands, and returns success
 * - If validation fails: failure with code 'FIELD_VALIDATION_FAILED' and field errors
 */
export function safeParseInterface<T extends Record<string, unknown>>(
  value: unknown,
  definition: BrandedInterfaceDefinition<T>
): InterfaceSafeParseResult<BrandedInstance<T>> {
  try {
    // Check that definition is a valid BrandedInterfaceDefinition
    if (
      !definition ||
      typeof definition !== 'object' ||
      (definition as unknown as Record<symbol, unknown>)[INTERFACE_ID] === undefined
    ) {
      return {
        success: false,
        error: {
          message: 'Invalid definition: not a BrandedInterfaceDefinition',
          code: 'INVALID_DEFINITION',
          input: value,
        },
      };
    }

    // Check that value is an object
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
      return {
        success: false,
        error: {
          message: `Expected an object but got "${actual}"`,
          code: 'INVALID_VALUE_TYPE',
          input: value,
          interfaceId: definition.id,
        },
      };
    }

    // If already a branded instance of this definition, return success
    if ((value as Record<symbol, unknown>)[INTERFACE_ID] === definition.id) {
      return {
        success: true,
        value: value as BrandedInstance<T>,
      };
    }

    // Try to validate and brand the plain object
    if (definition.validate(value)) {
      const branded = definition.create(value as T);
      return {
        success: true,
        value: branded,
      };
    }

    // Validation failed — try to extract field-level errors
    return buildFieldValidationFailure(value, definition);
  } catch (err: unknown) {
    // Catch errors from create() or validate() and extract field info
    const message = err instanceof Error ? err.message : String(err);
    const fieldErrors = extractFieldErrors(message);

    return {
      success: false,
      error: {
        message,
        code: 'FIELD_VALIDATION_FAILED',
        input: value,
        interfaceId: definition.id,
        ...(fieldErrors.length > 0 ? { fieldErrors } : {}),
      },
    };
  }
}

/**
 * Builds a FIELD_VALIDATION_FAILED failure result by attempting create()
 * to extract the specific field error message.
 */
function buildFieldValidationFailure<T extends Record<string, unknown>>(
  value: unknown,
  definition: BrandedInterfaceDefinition<T>
): InterfaceSafeParseResult<BrandedInstance<T>> {
  try {
    // Attempt create() to get a descriptive error
    definition.create(value as T);
    // If create succeeds unexpectedly, return success
    // (shouldn't happen since validate() returned false)
    return {
      success: false,
      error: {
        message: `Value does not match interface "${definition.id}" schema`,
        code: 'FIELD_VALIDATION_FAILED',
        input: value,
        interfaceId: definition.id,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const fieldErrors = extractFieldErrors(message);

    return {
      success: false,
      error: {
        message,
        code: 'FIELD_VALIDATION_FAILED',
        input: value,
        interfaceId: definition.id,
        ...(fieldErrors.length > 0 ? { fieldErrors } : {}),
      },
    };
  }
}

/**
 * Extracts field-level errors from an error message.
 * Looks for patterns like: Field "fieldName" ...
 */
function extractFieldErrors(message: string): Array<{ field: string; message: string }> {
  const fieldErrors: Array<{ field: string; message: string }> = [];
  const fieldMatch = message.match(/Field "([^"]+)"/);
  if (fieldMatch) {
    fieldErrors.push({
      field: fieldMatch[1],
      message,
    });
  }
  return fieldErrors;
}

// =============================================================================
// isOfPrimitive
// =============================================================================

/**
 * Type guard that checks if a value is a valid branded primitive of the given definition.
 *
 * Checks that the value has the correct base type and passes the definition's
 * validation predicate.
 */
export function isOfPrimitive<T extends string | number | boolean>(
  value: unknown,
  definition: BrandedPrimitiveDefinition<T>
): value is T {
  if (typeof value !== definition.baseType) {
    return false;
  }
  return definition.validate(value);
}
