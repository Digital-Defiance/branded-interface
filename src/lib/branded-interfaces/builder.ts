/**
 * Fluent builder API for constructing branded interface definitions.
 *
 * Allows incremental schema construction via `.field()` and `.optional()` calls,
 * then produces a BrandedInterfaceDefinition via `.build()`.
 */

import {
  FieldDescriptor,
  InterfaceSchema,
  BrandedInterfaceBuilder,
} from './types.js';

import { createBrandedInterface } from './factory.js';

/**
 * Creates a fluent builder for constructing a branded interface definition.
 *
 * Each `.field()` and `.optional()` call returns a new builder instance
 * with the accumulated schema (immutable pattern).
 *
 * @param interfaceId - The unique ID for the branded interface
 * @returns A BrandedInterfaceBuilder instance
 */
export function createBuilder(interfaceId: string): BrandedInterfaceBuilder {
  return buildInstance(interfaceId, {});
}

function buildInstance<T extends Record<string, unknown>>(
  interfaceId: string,
  schema: InterfaceSchema
): BrandedInterfaceBuilder<T> {
  return {
    field: <K extends string, V>(
      name: K,
      descriptor: FieldDescriptor
    ): BrandedInterfaceBuilder<T & Record<K, V>> => {
      const newSchema: InterfaceSchema = { ...schema, [name]: descriptor };
      return buildInstance(interfaceId, newSchema);
    },

    optional: <K extends string, V>(
      name: K,
      descriptor: Omit<FieldDescriptor, 'optional'>
    ): BrandedInterfaceBuilder<T & Partial<Record<K, V>>> => {
      const newSchema: InterfaceSchema = {
        ...schema,
        [name]: { ...descriptor, optional: true } as FieldDescriptor,
      };
      return buildInstance(interfaceId, newSchema);
    },

    build: () => {
      if (Object.keys(schema).length === 0) {
        throw new Error(
          `Builder for "${interfaceId}" has no fields defined. Add at least one field before calling .build().`
        );
      }
      return createBrandedInterface<T>(interfaceId, schema);
    },
  };
}
