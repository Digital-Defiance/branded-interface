/**
 * Built-in refinement types for common validation patterns.
 *
 * Each refinement is a BrandedPrimitiveDefinition created via createBrandedPrimitive()
 * with a named validation predicate so error messages include the predicate name.
 */

import { createBrandedPrimitive } from './factory.js';
import type { BrandedPrimitiveDefinition } from './types.js';

// =============================================================================
// Validation Predicates (named functions for descriptive error messages)
// =============================================================================

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

function isPositiveInt(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function isNonNegativeInt(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function isUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

// =============================================================================
// Refinement Type Definitions
// =============================================================================

export const Email: BrandedPrimitiveDefinition<string> =
  createBrandedPrimitive<string>('Email', 'string', isEmail);

export const NonEmptyString: BrandedPrimitiveDefinition<string> =
  createBrandedPrimitive<string>('NonEmptyString', 'string', isNonEmptyString);

export const PositiveInt: BrandedPrimitiveDefinition<number> =
  createBrandedPrimitive<number>('PositiveInt', 'number', isPositiveInt);

export const NonNegativeInt: BrandedPrimitiveDefinition<number> =
  createBrandedPrimitive<number>('NonNegativeInt', 'number', isNonNegativeInt);

export const Url: BrandedPrimitiveDefinition<string> =
  createBrandedPrimitive<string>('Url', 'string', isUrl);

export const Uuid: BrandedPrimitiveDefinition<string> =
  createBrandedPrimitive<string>('Uuid', 'string', isUuid);
