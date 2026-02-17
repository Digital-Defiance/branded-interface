/**
 * Core type definitions for branded enums.
 *
 * These types support the branded-enum field type in branded interfaces,
 * enabling runtime-identifiable enum-like objects in TypeScript.
 */

/**
 * Symbol key for storing the enum ID metadata.
 */
export const ENUM_ID: unique symbol = Symbol.for('@digitaldefiance/branded-interface:ENUM_ID');

/**
 * Symbol key for storing the enum values Set.
 */
export const ENUM_VALUES: unique symbol = Symbol.for('@digitaldefiance/branded-interface:ENUM_VALUES');

/**
 * Metadata attached to branded enums via Symbol properties.
 */
export interface BrandedEnumMetadata {
  readonly [ENUM_ID]: string;
  readonly [ENUM_VALUES]: Set<string>;
}

/**
 * A branded enum object - combines the user's values object with metadata.
 * The object is frozen (Readonly) to prevent modification after creation.
 */
export type BrandedEnum<T extends Record<string, string>> = Readonly<T> &
  BrandedEnumMetadata;

/**
 * Registry entry for tracking a single branded enum in the global registry.
 */
export interface RegistryEntry {
  readonly enumId: string;
  readonly enumObj: BrandedEnum<Record<string, string>>;
  readonly values: Set<string>;
}

/**
 * Global registry structure stored on globalThis.
 */
export interface BrandedEnumRegistry {
  readonly enums: Map<string, RegistryEntry>;
  readonly valueIndex: Map<string, Set<string>>;
}

/**
 * The key used to store the registry on globalThis.
 */
export const REGISTRY_KEY = '__brandedEnumRegistry__' as const;
