/**
 * Structural subtyping checks for branded interfaces.
 *
 * `isSubtype()` checks whether a candidate definition is a structural subtype
 * of a supertype definition — i.e., the candidate contains all fields of the
 * supertype with compatible types.
 */

import { BrandedInterfaceDefinition } from './types.js';

// =============================================================================
// isSubtype
// =============================================================================

/**
 * Checks whether `candidate` is a structural subtype of `supertype`.
 *
 * A candidate is a subtype if it contains every field in the supertype's schema
 * with a compatible type. Compatible means same `type` value, and if `ref` is
 * present in the supertype field, the candidate field must have the same `ref`.
 *
 * @param candidate - The definition to check as a potential subtype
 * @param supertype - The definition to check against
 * @returns true if candidate is a structural subtype of supertype
 */
export function isSubtype(
  candidate: BrandedInterfaceDefinition,
  supertype: BrandedInterfaceDefinition
): boolean {
  for (const [field, supertypeDesc] of Object.entries(supertype.schema)) {
    const candidateDesc = candidate.schema[field];

    // Missing field — not a subtype
    if (candidateDesc === undefined) {
      return false;
    }

    // Type mismatch — not a subtype
    if (candidateDesc.type !== supertypeDesc.type) {
      return false;
    }

    // Ref mismatch — not a subtype
    if (supertypeDesc.ref !== undefined && candidateDesc.ref !== supertypeDesc.ref) {
      return false;
    }
  }

  return true;
}
