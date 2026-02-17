/**
 * Codec pipeline for composable transformation of raw input into branded instances.
 *
 * The initial step validates and brands the input via the definition's create().
 * Each .pipe() appends a transform, returning a new immutable pipeline.
 * .execute() runs all steps in order, catching errors and returning a CodecResult.
 */

import type {
  BrandedInterfaceDefinition,
  BrandedInstance,
  CodecPipeline,
  CodecResult,
} from './types.js';

/**
 * Creates a codec pipeline whose initial step validates and brands the input
 * using the provided definition.
 *
 * @param definition - The branded interface definition to validate/brand against
 * @returns A CodecPipeline with .pipe() and .execute() methods
 */
export function createCodec<T extends Record<string, unknown>>(
  definition: BrandedInterfaceDefinition<T>
): CodecPipeline<unknown, BrandedInstance<T>> {
  const initialStep = (input: unknown): BrandedInstance<T> =>
    definition.create(input as T);

  return buildPipeline<unknown, BrandedInstance<T>>([initialStep]);
}

function buildPipeline<TIn, TOut>(
  steps: ReadonlyArray<(input: unknown) => unknown>
): CodecPipeline<TIn, TOut> {
  return {
    pipe: <TNext>(transform: (value: TOut) => TNext): CodecPipeline<TIn, TNext> => {
      return buildPipeline<TIn, TNext>([...steps, transform as (input: unknown) => unknown]);
    },

    execute: (input: TIn): CodecResult<TOut> => {
      let current: unknown = input;
      for (let i = 0; i < steps.length; i++) {
        try {
          current = steps[i](current);
        } catch (err) {
          return {
            success: false,
            error: {
              message: err instanceof Error ? err.message : String(err),
              step: i,
              input: current,
            },
          };
        }
      }
      return { success: true, value: current as TOut };
    },
  };
}
