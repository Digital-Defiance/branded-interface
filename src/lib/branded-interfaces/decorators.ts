/**
 * Decorators for branded interfaces and primitives.
 *
 * Provides runtime validation decorators for class properties
 * that should only accept values from branded interfaces or primitives.
 * Follows the same TC39 stage 3 decorator pattern as the existing
 * @EnumValue and @EnumClass decorators.
 */

import {
  BrandedInterfaceDefinition,
  BrandedPrimitiveDefinition,
  INTERFACE_ID,
  INTERFACE_SCHEMA,
  PRIMITIVE_ID,
  PRIMITIVE_BASE_TYPE,
} from './types.js';

// =============================================================================
// Consumer Registry
// =============================================================================

const BRANDED_CONSUMER_REGISTRY_KEY = '__brandedInterfaceConsumerRegistry__' as const;

interface BrandedConsumerEntry {
  classRef: new (...args: unknown[]) => unknown;
  className: string;
  definitionIds: Set<string>;
}

interface BrandedConsumerRegistry {
  consumers: Map<string, BrandedConsumerEntry>;
  definitionToConsumers: Map<string, Set<string>>;
}

function getConsumerRegistry(): BrandedConsumerRegistry {
  const global = globalThis as typeof globalThis & {
    [BRANDED_CONSUMER_REGISTRY_KEY]?: BrandedConsumerRegistry;
  };

  if (!(BRANDED_CONSUMER_REGISTRY_KEY in global)) {
    global[BRANDED_CONSUMER_REGISTRY_KEY] = {
      consumers: new Map(),
      definitionToConsumers: new Map(),
    };
  }

  return global[BRANDED_CONSUMER_REGISTRY_KEY]!;
}

function registerBrandedConsumer(
  classRef: new (...args: unknown[]) => unknown,
  className: string,
  definitionIds: string[]
): void {
  const registry = getConsumerRegistry();

  let entry = registry.consumers.get(className);
  if (!entry) {
    entry = {
      classRef,
      className,
      definitionIds: new Set(),
    };
    registry.consumers.set(className, entry);
  }

  for (const defId of definitionIds) {
    entry.definitionIds.add(defId);

    let consumers = registry.definitionToConsumers.get(defId);
    if (!consumers) {
      consumers = new Set();
      registry.definitionToConsumers.set(defId, consumers);
    }
    consumers.add(className);
  }
}

/**
 * Gets all class names that consume a specific branded interface or primitive.
 */
export function getBrandedConsumers(definitionId: string): string[] {
  const registry = getConsumerRegistry();
  const consumers = registry.definitionToConsumers.get(definitionId);
  return consumers ? Array.from(consumers) : [];
}

/**
 * Gets all definition IDs consumed by a specific class.
 */
export function getConsumedDefinitions(className: string): string[] {
  const registry = getConsumerRegistry();
  const entry = registry.consumers.get(className);
  return entry ? Array.from(entry.definitionIds) : [];
}

/**
 * Clears the branded consumer registry. Useful for testing.
 * @internal
 */
export function clearBrandedConsumerRegistry(): void {
  const global = globalThis as typeof globalThis & {
    [BRANDED_CONSUMER_REGISTRY_KEY]?: BrandedConsumerRegistry;
  };
  delete global[BRANDED_CONSUMER_REGISTRY_KEY];
}

// =============================================================================
// Type Guards for Definitions
// =============================================================================

function isInterfaceDefinition(obj: unknown): obj is BrandedInterfaceDefinition {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    INTERFACE_ID in obj &&
    INTERFACE_SCHEMA in obj &&
    typeof (obj as BrandedInterfaceDefinition).id === 'string' &&
    typeof (obj as BrandedInterfaceDefinition).validate === 'function'
  );
}

function isPrimitiveDefinition(obj: unknown): obj is BrandedPrimitiveDefinition {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    PRIMITIVE_ID in obj &&
    PRIMITIVE_BASE_TYPE in obj &&
    typeof (obj as BrandedPrimitiveDefinition).id === 'string' &&
    typeof (obj as BrandedPrimitiveDefinition).validate === 'function'
  );
}

function getDefinitionId(def: BrandedInterfaceDefinition | BrandedPrimitiveDefinition): string {
  if (isInterfaceDefinition(def)) return def.id;
  if (isPrimitiveDefinition(def)) return def.id;
  throw new Error('BrandedField decorator requires a BrandedInterfaceDefinition or BrandedPrimitiveDefinition');
}

// =============================================================================
// @BrandedField() Decorator
// =============================================================================

export interface BrandedFieldOptions {
  optional?: boolean;
  nullable?: boolean;
}

/**
 * TC39 stage 3 class accessor decorator that validates values against
 * a branded interface or primitive definition at runtime.
 *
 * @param definition - The branded interface or primitive definition to validate against
 * @param options - Optional configuration for nullable/optional support
 * @returns A class accessor decorator
 */
export function BrandedField(
  definition: BrandedInterfaceDefinition | BrandedPrimitiveDefinition,
  options: BrandedFieldOptions = {}
): <V>(
  target: ClassAccessorDecoratorTarget<unknown, V>,
  context: ClassAccessorDecoratorContext<unknown, V>
) => ClassAccessorDecoratorResult<unknown, V> {
  if (!isInterfaceDefinition(definition) && !isPrimitiveDefinition(definition)) {
    throw new Error(
      'BrandedField decorator requires a BrandedInterfaceDefinition or BrandedPrimitiveDefinition as the first argument'
    );
  }

  const defId = getDefinitionId(definition);
  const { optional = false, nullable = false } = options;

  return function <V>(
    target: ClassAccessorDecoratorTarget<unknown, V>,
    context: ClassAccessorDecoratorContext<unknown, V>
  ): ClassAccessorDecoratorResult<unknown, V> {
    const propertyName = String(context.name);

    function validateValue(value: V, action: string): void {
      if (value === undefined) {
        if (optional) return;
        throw new Error(
          `Property "${propertyName}" cannot be ${action} as undefined. Expected a valid value for "${defId}"`
        );
      }

      if (value === null) {
        if (nullable) return;
        throw new Error(
          `Property "${propertyName}" cannot be ${action} as null. Expected a valid value for "${defId}"`
        );
      }

      if (!definition.validate(value)) {
        throw new Error(
          `Property "${propertyName}" ${action} with invalid value for "${defId}"`
        );
      }
    }

    return {
      get(this: unknown): V {
        return target.get.call(this);
      },

      set(this: unknown, value: V): void {
        validateValue(value, 'set');
        target.set.call(this, value);
      },

      init(this: unknown, value: V): V {
        validateValue(value, 'initialized');
        return value;
      },
    };
  };
}

// =============================================================================
// @BrandedClass() Decorator
// =============================================================================

/**
 * Class decorator that registers a class as a consumer of branded interfaces
 * and/or primitives. Enables introspection of which classes use which definitions.
 *
 * @param definitions - One or more branded interface or primitive definitions
 * @returns A class decorator
 */
export function BrandedClass(
  ...definitions: (BrandedInterfaceDefinition | BrandedPrimitiveDefinition)[]
): <T extends new (...args: unknown[]) => unknown>(
  target: T,
  context: ClassDecoratorContext<T>
) => T {
  const defIds: string[] = [];
  for (let i = 0; i < definitions.length; i++) {
    const def = definitions[i];
    if (!isInterfaceDefinition(def) && !isPrimitiveDefinition(def)) {
      throw new Error(
        `BrandedClass decorator argument at index ${i} is not a valid BrandedInterfaceDefinition or BrandedPrimitiveDefinition`
      );
    }
    defIds.push(getDefinitionId(def));
  }

  return function <T extends new (...args: unknown[]) => unknown>(
    target: T,
    context: ClassDecoratorContext<T>
  ): T {
    const className = String(context.name);
    registerBrandedConsumer(target, className, defIds);
    return target;
  };
}
