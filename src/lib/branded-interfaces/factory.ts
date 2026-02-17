/**
 * Factory functions for creating branded interfaces and branded primitives.
 *
 * These factories validate data against schemas, attach Symbol-based metadata,
 * freeze results, and register definitions in the global interface registry.
 */

import {
  INTERFACE_ID,
  INTERFACE_SCHEMA,
  INTERFACE_VERSION,
  PRIMITIVE_ID,
  PRIMITIVE_BASE_TYPE,
  InterfaceSchema,
  FieldDescriptor,
  BrandedInterfaceDefinition,
  BrandedInstance,
  BrandedPrimitiveDefinition,
  PrimitiveBaseType,
} from './types.js';

import {
  getInterfaceById,
  registerInterfaceEntry,
} from './registry.js';

import { getEnumById } from '../registry.js';
import { ENUM_VALUES } from '../types.js';
import { notifyWatchers } from './watch.js';

// =============================================================================
// Field Validation
// =============================================================================

/**
 * Validates a single field value against its descriptor.
 * Throws a descriptive error if validation fails.
 */
function validateField(
  fieldName: string,
  value: unknown,
  descriptor: FieldDescriptor,
  interfaceId: string
): void {
  // Handle optional fields: allow undefined or missing
  if (descriptor.optional && value === undefined) {
    return;
  }

  // Handle nullable fields: allow null
  if (descriptor.nullable && value === null) {
    return;
  }

  // Required field missing check
  if (value === undefined || value === null) {
    if (!descriptor.optional && value === undefined) {
      throw new Error(
        `Field "${fieldName}" is required but missing in interface "${interfaceId}"`
      );
    }
    if (!descriptor.nullable && value === null) {
      throw new Error(
        `Field "${fieldName}" expected type "${descriptor.type}" but got "null" in interface "${interfaceId}"`
      );
    }
  }

  // Type checking based on descriptor type
  switch (descriptor.type) {
    case 'string':
    case 'number':
    case 'boolean': {
      if (typeof value !== descriptor.type) {
        throw new Error(
          `Field "${fieldName}" expected type "${descriptor.type}" but got "${typeof value}" in interface "${interfaceId}"`
        );
      }
      break;
    }
    case 'object': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
        throw new Error(
          `Field "${fieldName}" expected type "object" but got "${actual}" in interface "${interfaceId}"`
        );
      }
      break;
    }
    case 'array': {
      if (!Array.isArray(value)) {
        throw new Error(
          `Field "${fieldName}" expected type "array" but got "${typeof value}" in interface "${interfaceId}"`
        );
      }
      // Validate each element against items descriptor if present
      if (descriptor.items) {
        for (let i = 0; i < (value as unknown[]).length; i++) {
          validateField(
            `${fieldName}[${i}]`,
            (value as unknown[])[i],
            descriptor.items,
            interfaceId
          );
        }
      }
      break;
    }
    case 'branded-enum': {
      validateBrandedEnumRef(fieldName, value, descriptor, interfaceId);
      break;
    }
    case 'branded-interface': {
      validateBrandedInterfaceRef(fieldName, value, descriptor, interfaceId);
      break;
    }
    case 'branded-primitive': {
      validateBrandedPrimitiveRef(fieldName, value, descriptor, interfaceId);
      break;
    }
  }

  // Run custom validation predicate if present
  if (descriptor.validate && !descriptor.validate(value)) {
    throw new Error(
      `Field "${fieldName}" failed custom validation in interface "${interfaceId}"`
    );
  }
}

/**
 * Validates a field value against a branded-interface reference.
 */
function validateBrandedEnumRef(
  fieldName: string,
  value: unknown,
  descriptor: FieldDescriptor,
  interfaceId: string
): void {
  const refId = descriptor.ref;
  if (!refId) {
    throw new Error(
      `Field "${fieldName}" has type "branded-enum" but no ref specified in interface "${interfaceId}"`
    );
  }

  const enumObj = getEnumById(refId);
  if (!enumObj) {
    throw new Error(
      `Field "${fieldName}" references enum "${refId}" which is not registered, in interface "${interfaceId}"`
    );
  }

  const values = enumObj[ENUM_VALUES] as Set<string>;
  if (!values.has(value as string)) {
    throw new Error(
      `Field "${fieldName}" failed validation against referenced type "${refId}" in interface "${interfaceId}"`
    );
  }
}

/**
 * Validates a field value against a branded-interface reference.
 */
function validateBrandedInterfaceRef(
  fieldName: string,
  value: unknown,
  descriptor: FieldDescriptor,
  interfaceId: string
): void {
  const refId = descriptor.ref;
  if (!refId) {
    throw new Error(
      `Field "${fieldName}" has type "branded-interface" but no ref specified in interface "${interfaceId}"`
    );
  }

  const entry = getInterfaceById(refId);
  if (!entry || entry.kind !== 'interface') {
    throw new Error(
      `Field "${fieldName}" references interface "${refId}" which is not registered, in interface "${interfaceId}"`
    );
  }

  // Check that the value has the matching INTERFACE_ID symbol
  if (
    typeof value !== 'object' ||
    value === null ||
    (value as Record<symbol, unknown>)[INTERFACE_ID] !== refId
  ) {
    throw new Error(
      `Field "${fieldName}" failed validation against referenced type "${refId}" in interface "${interfaceId}"`
    );
  }
}

/**
 * Validates a field value against a branded-primitive reference.
 */
function validateBrandedPrimitiveRef(
  fieldName: string,
  value: unknown,
  descriptor: FieldDescriptor,
  interfaceId: string
): void {
  const refId = descriptor.ref;
  if (!refId) {
    throw new Error(
      `Field "${fieldName}" has type "branded-primitive" but no ref specified in interface "${interfaceId}"`
    );
  }

  const entry = getInterfaceById(refId);
  if (!entry || entry.kind !== 'primitive') {
    throw new Error(
      `Field "${fieldName}" references primitive "${refId}" which is not registered, in interface "${interfaceId}"`
    );
  }

  const primDef = entry.definition as BrandedPrimitiveDefinition;
  if (!primDef.validate(value)) {
    throw new Error(
      `Field "${fieldName}" failed validation against referenced type "${refId}" in interface "${interfaceId}"`
    );
  }
}


// =============================================================================
// Schema Validation (all fields)
// =============================================================================

/**
 * Validates all fields of a data object against an interface schema.
 * Throws on the first validation failure with a descriptive error.
 */
function validateSchema(
  data: Record<string, unknown>,
  schema: InterfaceSchema,
  interfaceId: string
): void {
  for (const [fieldName, descriptor] of Object.entries(schema)) {
    validateField(fieldName, data[fieldName], descriptor, interfaceId);
  }
}

// =============================================================================
// createBrandedInterface
// =============================================================================

/**
 * Creates a branded interface definition with runtime validation.
 *
 * The returned definition is frozen and registered in the global interface registry.
 * Calling this function with an already-registered ID returns the existing definition
 * (idempotent behavior).
 *
 * @param interfaceId - Unique identifier for this interface
 * @param schema - Field schema describing the interface shape
 * @param options - Optional configuration (version number)
 * @returns A frozen BrandedInterfaceDefinition
 */
export function createBrandedInterface<T extends Record<string, unknown>>(
  interfaceId: string,
  schema: InterfaceSchema,
  options?: { version?: number }
): BrandedInterfaceDefinition<T> {
  // Idempotent: return existing definition if already registered
  const existing = getInterfaceById(interfaceId);
  if (existing && existing.kind === 'interface') {
    return existing.definition as unknown as BrandedInterfaceDefinition<T>;
  }

  const version = options?.version ?? 1;

  // Build create() function
  const create = (data: T): BrandedInstance<T> => {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw new Error(
        `Expected a plain object for interface "${interfaceId}" but got "${Array.isArray(data) ? 'array' : data === null ? 'null' : typeof data}"`
      );
    }

    validateSchema(data as Record<string, unknown>, schema, interfaceId);

    // Create a copy with Symbol metadata attached as non-enumerable
    const instance = { ...data } as T & Record<symbol, unknown>;

    Object.defineProperty(instance, INTERFACE_ID, {
      value: interfaceId,
      enumerable: false,
      writable: false,
      configurable: false,
    });

    Object.defineProperty(instance, INTERFACE_SCHEMA, {
      value: schema,
      enumerable: false,
      writable: false,
      configurable: false,
    });

    const frozen = Object.freeze(instance) as BrandedInstance<T>;
    notifyWatchers(interfaceId, 'create', frozen);
    return frozen;
  };

  // Build validate() function — same checks as create() but returns boolean
  const validate = (data: unknown): data is T => {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return false;
    }
    try {
      validateSchema(data as Record<string, unknown>, schema, interfaceId);
      notifyWatchers(interfaceId, 'validate', data);
      return true;
    } catch {
      return false;
    }
  };

  // Build the definition object
  const definition = {
    id: interfaceId,
    schema,
    version,
    create,
    validate,
  } as Record<string, unknown>;

  // Attach non-enumerable Symbol metadata to the definition
  Object.defineProperty(definition, INTERFACE_ID, {
    value: interfaceId,
    enumerable: false,
    writable: false,
    configurable: false,
  });

  Object.defineProperty(definition, INTERFACE_SCHEMA, {
    value: schema,
    enumerable: false,
    writable: false,
    configurable: false,
  });

  Object.defineProperty(definition, INTERFACE_VERSION, {
    value: version,
    enumerable: false,
    writable: false,
    configurable: false,
  });

  const frozenDefinition = Object.freeze(definition) as unknown as BrandedInterfaceDefinition<T>;

  // Register in the interface registry
  registerInterfaceEntry({
    id: interfaceId,
    kind: 'interface',
    definition: frozenDefinition as unknown as BrandedInterfaceDefinition,
  });

  return frozenDefinition;
}

// =============================================================================
// createBrandedPrimitive
// =============================================================================

/**
 * Creates a branded primitive definition with runtime validation.
 *
 * The returned definition is frozen and registered in the global interface registry.
 * Calling this function with an already-registered ID returns the existing definition
 * (idempotent behavior).
 *
 * @param primitiveId - Unique identifier for this primitive type
 * @param baseType - The base JavaScript type ('string', 'number', or 'boolean')
 * @param validateFn - Optional validation predicate for refinement types
 * @returns A frozen BrandedPrimitiveDefinition
 */
export function createBrandedPrimitive<T extends string | number | boolean>(
  primitiveId: string,
  baseType: PrimitiveBaseType,
  validateFn?: (value: T) => boolean
): BrandedPrimitiveDefinition<T> {
  // Idempotent: return existing definition if already registered
  const existing = getInterfaceById(primitiveId);
  if (existing && existing.kind === 'primitive') {
    return existing.definition as unknown as BrandedPrimitiveDefinition<T>;
  }

  // Build create() function
  const create = (value: T): T & { readonly __brand: string } => {
    if (typeof value !== baseType) {
      throw new Error(
        `Primitive "${primitiveId}" expected type "${baseType}" but got "${typeof value}"`
      );
    }

    if (validateFn && !validateFn(value)) {
      const predicateName = validateFn.name || 'anonymous';
      throw new Error(
        `Primitive "${primitiveId}" failed validation predicate "${predicateName}"`
      );
    }

    return value as T & { readonly __brand: string };
  };

  // Build validate() function — returns boolean
  const validate = (value: unknown): value is T => {
    if (typeof value !== baseType) {
      return false;
    }
    if (validateFn && !validateFn(value as T)) {
      return false;
    }
    return true;
  };

  // Build the definition object
  const definition = {
    id: primitiveId,
    baseType,
    create,
    validate,
  } as Record<string, unknown>;

  // Attach non-enumerable Symbol metadata
  Object.defineProperty(definition, PRIMITIVE_ID, {
    value: primitiveId,
    enumerable: false,
    writable: false,
    configurable: false,
  });

  Object.defineProperty(definition, PRIMITIVE_BASE_TYPE, {
    value: baseType,
    enumerable: false,
    writable: false,
    configurable: false,
  });

  const frozenDefinition = Object.freeze(definition) as unknown as BrandedPrimitiveDefinition<T>;

  // Register in the interface registry
  registerInterfaceEntry({
    id: primitiveId,
    kind: 'primitive',
    definition: frozenDefinition as unknown as BrandedPrimitiveDefinition,
  });

  return frozenDefinition;
}
