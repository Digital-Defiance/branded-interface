/**
 * Serialization and deserialization for branded interface instances.
 *
 * Provides JSON serialization that strips Symbol metadata and
 * deserialization that validates and re-brands the parsed data.
 */

import {
  BrandedInterfaceDefinition,
  BrandedInstance,
  InterfaceDeserializeResult,
} from './types.js';

// =============================================================================
// InterfaceSerializer
// =============================================================================

/**
 * A serializer/deserializer pair for branded interface instances.
 */
export interface InterfaceSerializer<T extends Record<string, unknown>> {
  serialize(instance: BrandedInstance<T>): string;
  deserialize(input: unknown): InterfaceDeserializeResult<BrandedInstance<T>>;
  deserializeOrThrow(input: unknown): BrandedInstance<T>;
}

// =============================================================================
// interfaceSerializer
// =============================================================================

/**
 * Creates a serializer for a branded interface definition.
 *
 * - `serialize()` extracts enumerable properties (no Symbols) and calls JSON.stringify().
 * - `deserialize()` parses JSON strings, validates against the schema, and brands the result.
 * - `deserializeOrThrow()` calls deserialize() and throws on failure.
 *
 * @param definition - The branded interface definition to create a serializer for
 * @returns An InterfaceSerializer bound to the definition
 */
export function interfaceSerializer<T extends Record<string, unknown>>(
  definition: BrandedInterfaceDefinition<T>
): InterfaceSerializer<T> {
  return {
    serialize(instance: BrandedInstance<T>): string {
      // Extract only enumerable properties (Symbols are non-enumerable)
      const plain: Record<string, unknown> = {};
      for (const key of Object.keys(instance)) {
        plain[key] = instance[key as keyof typeof instance];
      }
      return JSON.stringify(plain);
    },

    deserialize(input: unknown): InterfaceDeserializeResult<BrandedInstance<T>> {
      // Parse JSON if input is a string
      let parsed: unknown;
      if (typeof input === 'string') {
        try {
          parsed = JSON.parse(input);
        } catch {
          return {
            success: false,
            error: {
              message: `Invalid JSON: failed to parse input`,
              code: 'INVALID_JSON',
              input,
            },
          };
        }
      } else {
        parsed = input;
      }

      // Validate against the schema
      if (!definition.validate(parsed)) {
        return {
          success: false,
          error: {
            message: `Deserialization failed: data does not match interface "${definition.id}" schema`,
            code: 'VALIDATION_FAILED',
            input,
          },
        };
      }

      // Brand via create()
      try {
        const branded = definition.create(parsed as T);
        return {
          success: true,
          value: branded,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          error: {
            message: `Deserialization failed: ${message}`,
            code: 'VALIDATION_FAILED',
            input,
          },
        };
      }
    },

    deserializeOrThrow(input: unknown): BrandedInstance<T> {
      const result = this.deserialize(input);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.value;
    },
  };
}
