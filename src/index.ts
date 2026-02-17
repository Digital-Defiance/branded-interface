/**
 * branded-interface - Runtime-identifiable interface-like types for TypeScript
 *
 * This library provides branded interfaces and primitives with embedded metadata
 * for runtime identification, validation, and schema generation.
 *
 * @packageDocumentation
 */

// =============================================================================
// Branded Enum (minimal support for branded-enum field type)
// =============================================================================

export { createBrandedEnum } from './lib/factory.js';
export { getEnumById, resetRegistry } from './lib/registry.js';
export type { BrandedEnum } from './lib/types.js';

// =============================================================================
// Branded Interfaces
// =============================================================================

export * from './lib/branded-interfaces/index.js';
