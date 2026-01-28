/**
 * Decorators for branded enums.
 *
 * Provides runtime validation decorators for class properties
 * that should only accept values from branded enums.
 */

import {
  AnyBrandedEnum,
  BrandedEnum,
  ENUM_ID,
  ENUM_VALUES,
  CONSUMER_REGISTRY_KEY,
  EnumConsumerRegistry,
  EnumConsumerEntry,
} from './types.js';

/**
 * Checks if an object is a branded enum (has Symbol metadata).
 *
 * @param obj - The object to check
 * @returns true if obj is a branded enum
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isBrandedEnum(obj: unknown): obj is BrandedEnum<any> {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    ENUM_ID in obj &&
    ENUM_VALUES in obj &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (obj as BrandedEnum<any>)[ENUM_ID] === 'string' &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (obj as BrandedEnum<any>)[ENUM_VALUES] instanceof Set
  );
}

/**
 * Options for the EnumValue decorator.
 */
export interface EnumValueOptions {
  /**
   * Whether the property is optional (can be undefined).
   * @default false
   */
  optional?: boolean;

  /**
   * Whether the property is nullable (can be null).
   * @default false
   */
  nullable?: boolean;
}

/**
 * Property decorator that validates values against a branded enum at runtime.
 *
 * When a value is assigned to the decorated property, it validates that the value
 * is a member of the specified branded enum. If validation fails, a descriptive
 * error is thrown.
 *
 * Supports optional and nullable properties through the options parameter.
 *
 * @template E - The branded enum type
 * @param enumObj - The branded enum to validate against
 * @param options - Optional configuration for nullable/optional support
 * @returns A property decorator function
 * @throws {Error} Throws `Error` if enumObj is not a valid branded enum
 * @throws {Error} Throws `Error` at runtime if assigned value is not in the enum
 *
 * @example
 * // Basic usage
 * const Status = createBrandedEnum('status', { Active: 'active', Inactive: 'inactive' } as const);
 *
 * class User {
 *   \@EnumValue(Status)
 *   accessor status: string = Status.Active;
 * }
 *
 * const user = new User();
 * user.status = Status.Active; // OK
 * user.status = 'invalid'; // Throws Error
 *
 * @example
 * // Optional property
 * class Config {
 *   \@EnumValue(Status, { optional: true })
 *   accessor status: string | undefined;
 * }
 *
 * const config = new Config();
 * config.status = undefined; // OK
 * config.status = Status.Active; // OK
 *
 * @example
 * // Nullable property
 * class Settings {
 *   \@EnumValue(Status, { nullable: true })
 *   accessor status: string | null = null;
 * }
 *
 * const settings = new Settings();
 * settings.status = null; // OK
 * settings.status = Status.Active; // OK
 */
export function EnumValue<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  E extends BrandedEnum<any>,
>(
  enumObj: E,
  options: EnumValueOptions = {}
): <V extends string | null | undefined>(
  target: ClassAccessorDecoratorTarget<unknown, V>,
  context: ClassAccessorDecoratorContext<unknown, V>
) => ClassAccessorDecoratorResult<unknown, V> {
  // Validate that enumObj is a branded enum at decorator creation time
  if (!isBrandedEnum(enumObj)) {
    throw new Error(
      'EnumValue decorator requires a branded enum as the first argument'
    );
  }

  const enumId = enumObj[ENUM_ID];
  const valueSet = enumObj[ENUM_VALUES];
  const { optional = false, nullable = false } = options;

  return function <V extends string | null | undefined>(
    target: ClassAccessorDecoratorTarget<unknown, V>,
    context: ClassAccessorDecoratorContext<unknown, V>
  ): ClassAccessorDecoratorResult<unknown, V> {
    const propertyName = String(context.name);

    return {
      get(this: unknown): V {
        return target.get.call(this);
      },

      set(this: unknown, value: V): void {
        // Handle undefined values
        if (value === undefined) {
          if (optional) {
            target.set.call(this, value);
            return;
          }
          throw new Error(
            `Property "${propertyName}" cannot be undefined. Expected a value from enum "${enumId}"`
          );
        }

        // Handle null values
        if (value === null) {
          if (nullable) {
            target.set.call(this, value as V);
            return;
          }
          throw new Error(
            `Property "${propertyName}" cannot be null. Expected a value from enum "${enumId}"`
          );
        }

        // Validate that value is a string
        if (typeof value !== 'string') {
          throw new Error(
            `Property "${propertyName}" must be a string value from enum "${enumId}", got ${typeof value}`
          );
        }

        // Validate that value is in the enum
        if (!valueSet.has(value)) {
          const validValues = Array.from(valueSet).join(', ');
          throw new Error(
            `Property "${propertyName}" received invalid value "${value}". Expected one of: ${validValues} (from enum "${enumId}")`
          );
        }

        target.set.call(this, value);
      },

      init(this: unknown, value: V): V {
        // Handle undefined initial values
        if (value === undefined) {
          if (optional) {
            return value;
          }
          throw new Error(
            `Property "${propertyName}" cannot be initialized as undefined. Expected a value from enum "${enumId}"`
          );
        }

        // Handle null initial values
        if (value === null) {
          if (nullable) {
            return value;
          }
          throw new Error(
            `Property "${propertyName}" cannot be initialized as null. Expected a value from enum "${enumId}"`
          );
        }

        // Validate that value is a string
        if (typeof value !== 'string') {
          throw new Error(
            `Property "${propertyName}" must be initialized with a string value from enum "${enumId}", got ${typeof value}`
          );
        }

        // Validate that value is in the enum
        if (!valueSet.has(value)) {
          const validValues = Array.from(valueSet).join(', ');
          throw new Error(
            `Property "${propertyName}" initialized with invalid value "${value}". Expected one of: ${validValues} (from enum "${enumId}")`
          );
        }

        return value;
      },
    };
  };
}

/**
 * Gets the consumer registry, initializing it lazily on globalThis.
 *
 * @returns The global enum consumer registry
 */
function getConsumerRegistry(): EnumConsumerRegistry {
  const global = globalThis as typeof globalThis & {
    [CONSUMER_REGISTRY_KEY]?: EnumConsumerRegistry;
  };

  if (!(CONSUMER_REGISTRY_KEY in global)) {
    global[CONSUMER_REGISTRY_KEY] = {
      consumers: new Map(),
      enumToConsumers: new Map(),
    };
  }

  return global[CONSUMER_REGISTRY_KEY]!;
}

/**
 * Registers a class as a consumer of the specified branded enums.
 *
 * @param classRef - The class constructor
 * @param className - The name of the class
 * @param enumIds - Array of enum IDs that the class consumes
 */
function registerEnumConsumer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  classRef: new (...args: any[]) => any,
  className: string,
  enumIds: string[]
): void {
  const registry = getConsumerRegistry();

  // Get or create the consumer entry
  let entry = registry.consumers.get(className);
  if (!entry) {
    entry = {
      classRef,
      className,
      enumIds: new Set(),
    };
    registry.consumers.set(className, entry);
  }

  // Add enum IDs to the consumer entry and update reverse index
  for (const enumId of enumIds) {
    entry.enumIds.add(enumId);

    // Update reverse index
    let consumers = registry.enumToConsumers.get(enumId);
    if (!consumers) {
      consumers = new Set();
      registry.enumToConsumers.set(enumId, consumers);
    }
    consumers.add(className);
  }
}

/**
 * Gets all class names that consume a specific branded enum.
 *
 * @param enumId - The enum ID to look up
 * @returns Array of class names that consume the enum
 *
 * @example
 * const Status = createBrandedEnum('status', { Active: 'active' } as const);
 *
 * \@EnumClass(Status)
 * class User { }
 *
 * getEnumConsumers('status'); // ['User']
 */
export function getEnumConsumers(enumId: string): string[] {
  const registry = getConsumerRegistry();
  const consumers = registry.enumToConsumers.get(enumId);
  return consumers ? Array.from(consumers) : [];
}

/**
 * Gets all enum IDs consumed by a specific class.
 *
 * @param className - The class name to look up
 * @returns Array of enum IDs consumed by the class
 *
 * @example
 * const Status = createBrandedEnum('status', { Active: 'active' } as const);
 * const Priority = createBrandedEnum('priority', { High: 'high' } as const);
 *
 * \@EnumClass(Status, Priority)
 * class Task { }
 *
 * getConsumedEnums('Task'); // ['status', 'priority']
 */
export function getConsumedEnums(className: string): string[] {
  const registry = getConsumerRegistry();
  const entry = registry.consumers.get(className);
  return entry ? Array.from(entry.enumIds) : [];
}

/**
 * Gets all registered enum consumer entries.
 *
 * @returns Array of all consumer entries
 *
 * @example
 * getAllEnumConsumers(); // [{ className: 'User', enumIds: Set(['status']) }, ...]
 */
export function getAllEnumConsumers(): EnumConsumerEntry[] {
  const registry = getConsumerRegistry();
  return Array.from(registry.consumers.values());
}

/**
 * Clears the consumer registry. Useful for testing.
 * @internal
 */
export function clearConsumerRegistry(): void {
  const global = globalThis as typeof globalThis & {
    [CONSUMER_REGISTRY_KEY]?: EnumConsumerRegistry;
  };
  delete global[CONSUMER_REGISTRY_KEY];
}

/**
 * Class decorator that registers a class as a consumer of branded enums.
 *
 * This decorator tracks which classes use which branded enums, enabling
 * debugging and introspection of enum usage across the codebase.
 *
 * @param enums - One or more branded enums that the class consumes
 * @returns A class decorator function
 * @throws {Error} Throws `Error` if any argument is not a valid branded enum
 *
 * @example
 * const Status = createBrandedEnum('status', { Active: 'active', Inactive: 'inactive' } as const);
 * const Priority = createBrandedEnum('priority', { High: 'high', Low: 'low' } as const);
 *
 * \@EnumClass(Status, Priority)
 * class Task {
 *   status = Status.Active;
 *   priority = Priority.High;
 * }
 *
 * // Query which classes consume an enum
 * getEnumConsumers('status'); // ['Task']
 *
 * // Query which enums a class consumes
 * getConsumedEnums('Task'); // ['status', 'priority']
 */
export function EnumClass(
  ...enums: AnyBrandedEnum[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): <T extends new (...args: any[]) => any>(
  target: T,
  context: ClassDecoratorContext<T>
) => T {
  // Validate all enums at decorator creation time
  const enumIds: string[] = [];
  for (let i = 0; i < enums.length; i++) {
    const enumObj = enums[i];
    if (!isBrandedEnum(enumObj)) {
      throw new Error(
        `EnumClass decorator argument at index ${i} is not a valid branded enum`
      );
    }
    enumIds.push(enumObj[ENUM_ID]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext<T>
  ): T {
    const className = String(context.name);

    // Register the class as a consumer of the enums
    registerEnumConsumer(target, className, enumIds);

    // Return the class unchanged
    return target;
  };
}
