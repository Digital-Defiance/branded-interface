/**
 * branded-enum - Runtime-identifiable enum-like types for TypeScript
 *
 * This library provides enum-like objects with embedded metadata for runtime
 * identification, enabling you to determine which enum a string value belongs to.
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

export type {
  BrandedEnumMetadata,
  BrandedEnum,
  BrandedEnumValue,
  RegistryEntry,
  BrandedEnumRegistry,
  EnumConsumerEntry,
  EnumConsumerRegistry,
  AnyBrandedEnum,
  EnumKeys,
  EnumValues,
  ValidEnumValue,
  StrictEnumParam,
} from './lib/types.js';

// =============================================================================
// Factory
// =============================================================================

export { createBrandedEnum } from './lib/factory.js';

// =============================================================================
// Registry
// =============================================================================

export {
  getRegistry,
  getAllEnumIds,
  getEnumById,
  findEnumSources,
  resetRegistry,
} from './lib/registry.js';

// =============================================================================
// Type Guards
// =============================================================================

export { isFromEnum, assertFromEnum, parseEnum, safeParseEnum } from './lib/guards.js';
export type { SafeParseSuccess, SafeParseFailure, SafeParseError, SafeParseErrorCode, SafeParseResult } from './lib/guards.js';

// =============================================================================
// Metadata Accessors
// =============================================================================

export { getEnumId, getEnumValues, enumSize } from './lib/accessors.js';

// =============================================================================
// Utility Functions
// =============================================================================

export {
  hasValue,
  getKeyForValue,
  isValidKey,
  enumEntries,
} from './lib/utils.js';

// =============================================================================
// Composition
// =============================================================================

export { mergeEnums } from './lib/merge.js';

// =============================================================================
// Advanced Operations
// =============================================================================

export { enumSubset, enumExclude, enumMap, enumFromKeys, enumDiff, enumIntersect, enumToRecord, watchEnum, watchAllEnums, clearAllEnumWatchers, getEnumWatcherCount, getGlobalWatcherCount, exhaustive, exhaustiveGuard, toJsonSchema, toZodSchema, enumSerializer } from './lib/advanced.js';
export type { EnumDiffResult, EnumIntersectEntry, EnumAccessType, EnumAccessEvent, EnumWatchCallback, WatchEnumResult, ToJsonSchemaOptions, EnumJsonSchema, ToZodSchemaOptions, ZodEnumSchemaDefinition, EnumSerializerOptions, DeserializeSuccess, DeserializeFailure, DeserializeResult, EnumSerializer } from './lib/advanced.js';

// =============================================================================
// Decorators
// =============================================================================

export {
  EnumValue,
  EnumClass,
  getEnumConsumers,
  getConsumedEnums,
  getAllEnumConsumers,
} from './lib/decorators.js';
export type { EnumValueOptions } from './lib/decorators.js';
