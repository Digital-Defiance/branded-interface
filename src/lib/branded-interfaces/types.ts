/**
 * Core type definitions for branded-interfaces module
 *
 * Symbols, interfaces, and type helpers for branded interfaces,
 * branded primitives, and opaque types.
 */

// =============================================================================
// Unique Symbols for Metadata
// =============================================================================

/**
 * Symbol key for storing the interface ID metadata.
 * Using a Symbol prevents collision with user-defined keys.
 */
export const INTERFACE_ID: unique symbol = Symbol.for('@digitaldefiance/branded-interface:INTERFACE_ID');

/**
 * Symbol key for storing the interface schema metadata.
 */
export const INTERFACE_SCHEMA: unique symbol = Symbol.for('@digitaldefiance/branded-interface:INTERFACE_SCHEMA');

/**
 * Symbol key for storing the interface version metadata.
 */
export const INTERFACE_VERSION: unique symbol = Symbol.for('@digitaldefiance/branded-interface:INTERFACE_VERSION');

/**
 * Symbol key for storing the primitive ID metadata.
 */
export const PRIMITIVE_ID: unique symbol = Symbol.for('@digitaldefiance/branded-interface:PRIMITIVE_ID');

/**
 * Symbol key for storing the primitive base type metadata.
 */
export const PRIMITIVE_BASE_TYPE: unique symbol = Symbol.for('@digitaldefiance/branded-interface:PRIMITIVE_BASE_TYPE');

/**
 * Symbol key for storing the opaque type ID metadata.
 */
export const OPAQUE_ID: unique symbol = Symbol.for('@digitaldefiance/branded-interface:OPAQUE_ID');

// =============================================================================
// Field Schema Types
// =============================================================================

/**
 * Base types supported for interface fields.
 */
export type FieldBaseType = 'string' | 'number' | 'boolean' | 'object' | 'array';

/**
 * Descriptor for a single field in a branded interface schema.
 */
export interface FieldDescriptor {
  readonly type: FieldBaseType | 'branded-enum' | 'branded-interface' | 'branded-primitive';
  readonly optional?: boolean;
  readonly nullable?: boolean;
  readonly validate?: (value: unknown) => boolean;
  /** Reference to a branded enum, interface, or primitive definition for cross-validation */
  readonly ref?: string;
  /** For array fields, the element type descriptor */
  readonly items?: FieldDescriptor;
}

/**
 * A schema describing the fields of a branded interface.
 */
export type InterfaceSchema = Record<string, FieldDescriptor>;

// =============================================================================
// Branded Interface Types
// =============================================================================

/**
 * Metadata attached to branded interface instances via Symbol properties.
 * Non-enumerable and invisible to Object.keys(), JSON.stringify(), etc.
 */
export interface BrandedInterfaceMetadata {
  readonly [INTERFACE_ID]: string;
  readonly [INTERFACE_SCHEMA]: InterfaceSchema;
}

/**
 * A branded interface instance — combines the user's data with metadata.
 * The object is frozen (Readonly) to prevent modification after creation.
 */
export type BrandedInstance<T extends Record<string, unknown>> = Readonly<T> & BrandedInterfaceMetadata;

/**
 * The definition object returned by createBrandedInterface().
 * Contains the schema, validator, constructor, and metadata for a branded interface type.
 */
export interface BrandedInterfaceDefinition<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly id: string;
  readonly schema: InterfaceSchema;
  readonly version: number;
  readonly create: (data: T) => BrandedInstance<T>;
  readonly validate: (data: unknown) => data is T;
  readonly [INTERFACE_ID]: string;
  readonly [INTERFACE_SCHEMA]: InterfaceSchema;
  readonly [INTERFACE_VERSION]: number;
}

// =============================================================================
// Branded Primitive Types
// =============================================================================

/**
 * Base types supported for branded primitives.
 */
export type PrimitiveBaseType = 'string' | 'number' | 'boolean';

/**
 * Metadata attached to branded primitive definitions via Symbol properties.
 */
export interface BrandedPrimitiveMetadata {
  readonly [PRIMITIVE_ID]: string;
  readonly [PRIMITIVE_BASE_TYPE]: PrimitiveBaseType;
}

/**
 * The definition object returned by createBrandedPrimitive().
 */
export interface BrandedPrimitiveDefinition<T extends string | number | boolean = string | number | boolean> {
  readonly id: string;
  readonly baseType: PrimitiveBaseType;
  readonly create: (value: T) => T & { readonly __brand: string };
  readonly validate: (value: unknown) => value is T;
  readonly [PRIMITIVE_ID]: string;
  readonly [PRIMITIVE_BASE_TYPE]: PrimitiveBaseType;
}

// =============================================================================
// Opaque Type Types
// =============================================================================

/**
 * The definition object returned by createOpaqueType().
 */
export interface OpaqueTypeDefinition<T> {
  readonly id: string;
  readonly wrap: (value: T) => OpaqueValue<T>;
  readonly unwrap: (opaque: OpaqueValue<T>) => T;
}

/**
 * An opaque wrapped value that hides the underlying type.
 */
export interface OpaqueValue<T> {
  readonly [OPAQUE_ID]: string;
  readonly __opaqueValue: T;
}

// =============================================================================
// Registry Types
// =============================================================================

/**
 * The key used to store the interface registry on globalThis.
 * Namespaced to avoid collisions with the enum registry.
 */
export const INTERFACE_REGISTRY_KEY = '__brandedInterfaceRegistry__' as const;

/**
 * A single entry in the interface registry.
 */
export interface InterfaceRegistryEntry {
  readonly id: string;
  readonly kind: 'interface' | 'primitive' | 'opaque';
  readonly definition: BrandedInterfaceDefinition | BrandedPrimitiveDefinition | OpaqueTypeDefinition<unknown>;
}

/**
 * Global registry structure stored on globalThis.
 * Enables cross-bundle tracking of all branded interfaces and primitives.
 */
export interface InterfaceRegistry {
  readonly entries: Map<string, InterfaceRegistryEntry>;
}

// =============================================================================
// Watch / Event Types
// =============================================================================

/**
 * Types of events emitted by branded interface operations.
 */
export type InterfaceEventType = 'create' | 'validate';

/**
 * Event object passed to watcher callbacks.
 */
export interface InterfaceAccessEvent {
  readonly interfaceId: string;
  readonly eventType: InterfaceEventType;
  readonly value: unknown;
  readonly timestamp: number;
}

/**
 * Callback signature for interface watchers.
 */
export type InterfaceWatchCallback = (event: InterfaceAccessEvent) => void;

// =============================================================================
// Serialization Result Types
// =============================================================================

export interface InterfaceDeserializeSuccess<T> {
  readonly success: true;
  readonly value: T;
}

export interface InterfaceDeserializeFailure {
  readonly success: false;
  readonly error: {
    readonly message: string;
    readonly code: string;
    readonly input: unknown;
  };
}

export type InterfaceDeserializeResult<T> = InterfaceDeserializeSuccess<T> | InterfaceDeserializeFailure;

// =============================================================================
// Safe Parse Result Types
// =============================================================================

export interface InterfaceSafeParseSuccess<T> {
  readonly success: true;
  readonly value: T;
}

export interface InterfaceSafeParseFailure {
  readonly success: false;
  readonly error: {
    readonly message: string;
    readonly code: InterfaceSafeParseErrorCode;
    readonly input: unknown;
    readonly interfaceId?: string;
    readonly fieldErrors?: ReadonlyArray<{ field: string; message: string }>;
  };
}

export type InterfaceSafeParseErrorCode =
  | 'INVALID_DEFINITION'
  | 'INVALID_VALUE_TYPE'
  | 'FIELD_VALIDATION_FAILED'
  | 'NOT_BRANDED_INSTANCE';

export type InterfaceSafeParseResult<T> = InterfaceSafeParseSuccess<T> | InterfaceSafeParseFailure;

// =============================================================================
// Diff / Intersect Types
// =============================================================================

export interface InterfaceDiffResult {
  readonly onlyInFirst: ReadonlyArray<{ field: string; descriptor: FieldDescriptor }>;
  readonly onlyInSecond: ReadonlyArray<{ field: string; descriptor: FieldDescriptor }>;
  readonly inBoth: ReadonlyArray<{ field: string; first: FieldDescriptor; second: FieldDescriptor }>;
}

export interface InterfaceIntersectResult {
  readonly definition: BrandedInterfaceDefinition;
  readonly conflicts: ReadonlyArray<{ field: string; first: FieldDescriptor; second: FieldDescriptor }>;
}

// =============================================================================
// Codec Pipeline Types
// =============================================================================

export interface CodecPipeline<TIn, TOut> {
  readonly pipe: <TNext>(transform: (value: TOut) => TNext) => CodecPipeline<TIn, TNext>;
  readonly execute: (input: TIn) => CodecResult<TOut>;
}

export interface CodecSuccess<T> {
  readonly success: true;
  readonly value: T;
}

export interface CodecFailure {
  readonly success: false;
  readonly error: {
    readonly message: string;
    readonly step: number;
    readonly input: unknown;
  };
}

export type CodecResult<T> = CodecSuccess<T> | CodecFailure;

// =============================================================================
// Versioning / Migration Types
// =============================================================================

export type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

export interface MigrationEntry {
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly migrate: MigrationFn;
}

// =============================================================================
// Builder Types
// =============================================================================

export interface BrandedInterfaceBuilder<T extends Record<string, unknown> = Record<string, never>> {
  readonly field: <K extends string, V>(
    name: K,
    descriptor: FieldDescriptor
  ) => BrandedInterfaceBuilder<T & Record<K, V>>;
  readonly optional: <K extends string, V>(
    name: K,
    descriptor: Omit<FieldDescriptor, 'optional'>
  ) => BrandedInterfaceBuilder<T & Partial<Record<K, V>>>;
  readonly build: () => BrandedInterfaceDefinition<T>;
}

// =============================================================================
// JSON Schema Output Types
// =============================================================================

export interface InterfaceJsonSchema {
  readonly $schema: string;
  readonly type: 'object';
  readonly title: string;
  readonly properties: Record<string, unknown>;
  readonly required: string[];
  readonly additionalProperties: boolean;
}

// =============================================================================
// Zod Schema Output Types
// =============================================================================

export interface InterfaceZodSchemaDefinition {
  readonly interfaceId: string;
  readonly fields: Record<string, { zodType: string; optional: boolean; nullable: boolean }>;
}
