/**
 * Diff and intersect functions for branded interface schemas.
 *
 * `interfaceDiff()` partitions fields into onlyInFirst, onlyInSecond, and inBoth.
 * `interfaceIntersect()` creates a new definition from compatible shared fields
 * and reports conflicts for incompatible ones.
 */

import {
  BrandedInterfaceDefinition,
  FieldDescriptor,
  InterfaceDiffResult,
  InterfaceIntersectResult,
  InterfaceSchema,
} from './types.js';

import { createBrandedInterface } from './factory.js';

// =============================================================================
// Type Compatibility
// =============================================================================

/**
 * Checks whether two field descriptors have compatible types.
 * Compatible means same `type` value, and if `ref` is present, same `ref` value.
 */
function areFieldsCompatible(a: FieldDescriptor, b: FieldDescriptor): boolean {
  if (a.type !== b.type) {
    return false;
  }
  if (a.ref !== undefined || b.ref !== undefined) {
    return a.ref === b.ref;
  }
  return true;
}

// =============================================================================
// interfaceDiff
// =============================================================================

/**
 * Computes the diff between two branded interface definitions.
 *
 * Partitions all field names from both definitions into:
 * - onlyInFirst: fields present only in the first definition
 * - onlyInSecond: fields present only in the second definition
 * - inBoth: fields present in both definitions (with both descriptors)
 *
 * @param first - First branded interface definition
 * @param second - Second branded interface definition
 * @returns An InterfaceDiffResult with the three partitions
 */
export function interfaceDiff(
  first: BrandedInterfaceDefinition,
  second: BrandedInterfaceDefinition
): InterfaceDiffResult {
  const onlyInFirst: Array<{ field: string; descriptor: FieldDescriptor }> = [];
  const onlyInSecond: Array<{ field: string; descriptor: FieldDescriptor }> = [];
  const inBoth: Array<{ field: string; first: FieldDescriptor; second: FieldDescriptor }> = [];

  const firstFields = new Set(Object.keys(first.schema));
  const secondFields = new Set(Object.keys(second.schema));

  for (const field of firstFields) {
    if (secondFields.has(field)) {
      inBoth.push({ field, first: first.schema[field], second: second.schema[field] });
    } else {
      onlyInFirst.push({ field, descriptor: first.schema[field] });
    }
  }

  for (const field of secondFields) {
    if (!firstFields.has(field)) {
      onlyInSecond.push({ field, descriptor: second.schema[field] });
    }
  }

  return { onlyInFirst, onlyInSecond, inBoth };
}

// =============================================================================
// interfaceIntersect
// =============================================================================

/**
 * Computes the intersection of two branded interface definitions.
 *
 * Creates a new definition containing only fields present in both definitions
 * with compatible types. Fields with incompatible types are reported as conflicts.
 *
 * @param first - First branded interface definition
 * @param second - Second branded interface definition
 * @param newId - Unique ID for the intersected definition
 * @returns An InterfaceIntersectResult with the new definition and conflicts
 */
export function interfaceIntersect(
  first: BrandedInterfaceDefinition,
  second: BrandedInterfaceDefinition,
  newId: string
): InterfaceIntersectResult {
  const compatibleSchema: Record<string, FieldDescriptor> = {};
  const conflicts: Array<{ field: string; first: FieldDescriptor; second: FieldDescriptor }> = [];

  const firstFields = Object.keys(first.schema);
  const secondFieldSet = new Set(Object.keys(second.schema));

  for (const field of firstFields) {
    if (!secondFieldSet.has(field)) {
      continue;
    }

    const firstDesc = first.schema[field];
    const secondDesc = second.schema[field];

    if (areFieldsCompatible(firstDesc, secondDesc)) {
      compatibleSchema[field] = firstDesc;
    } else {
      conflicts.push({ field, first: firstDesc, second: secondDesc });
    }
  }

  const definition = createBrandedInterface(newId, compatibleSchema as InterfaceSchema);

  return { definition, conflicts };
}
