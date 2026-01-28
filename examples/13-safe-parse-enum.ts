/**
 * Example 13: Safe Parse Enum (Result Object)
 *
 * This example demonstrates result-based parsing:
 * - safeParseEnum: Returns { success, value } or { success, error }
 * - Detailed error information for debugging
 * - Pattern similar to Zod's safeParse
 *
 * Run: npx ts-node examples/13-safe-parse-enum.ts
 */

import { createBrandedEnum, safeParseEnum, SafeParseResult } from '../src/index.js';

// =============================================================================
// Basic Usage
// =============================================================================

console.log('=== Basic Usage ===');

const Status = createBrandedEnum('ex13-status', {
  Active: 'active',
  Inactive: 'inactive',
  Pending: 'pending',
} as const);

// Successful parse
const successResult = safeParseEnum('active', Status);
console.log('Success result:', successResult);
// { success: true, value: 'active' }

if (successResult.success) {
  console.log('Parsed value:', successResult.value);
  // TypeScript knows value is 'active' | 'inactive' | 'pending'
}

// Failed parse - invalid value
const failResult = safeParseEnum('unknown', Status);
console.log('\nFailed result:', failResult);
// { success: false, error: { message: '...', code: 'VALUE_NOT_IN_ENUM', ... } }

if (!failResult.success) {
  console.log('Error code:', failResult.error.code);
  console.log('Error message:', failResult.error.message);
  console.log('Valid values:', failResult.error.validValues);
}

// =============================================================================
// Error Codes
// =============================================================================

console.log('\n=== Error Codes ===');

// INVALID_VALUE_TYPE - non-string input
const typeError = safeParseEnum(123, Status);
if (!typeError.success) {
  console.log('Type error code:', typeError.error.code); // 'INVALID_VALUE_TYPE'
  console.log('Type error message:', typeError.error.message);
}

// VALUE_NOT_IN_ENUM - string but not in enum
const valueError = safeParseEnum('invalid', Status);
if (!valueError.success) {
  console.log('\nValue error code:', valueError.error.code); // 'VALUE_NOT_IN_ENUM'
  console.log('Value error message:', valueError.error.message);
}

// INVALID_ENUM_OBJECT - not a branded enum
const enumError = safeParseEnum('test', { NotBranded: 'test' } as never);
if (!enumError.success) {
  console.log('\nEnum error code:', enumError.error.code); // 'INVALID_ENUM_OBJECT'
  console.log('Enum error message:', enumError.error.message);
}

// =============================================================================
// Use Case: Form Validation
// =============================================================================

console.log('\n=== Use Case: Form Validation ===');

const Priority = createBrandedEnum('ex13-priority', {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
} as const);

interface FormData {
  title: string;
  status: unknown;
  priority: unknown;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  data: { title: string; status: string; priority: string } | null;
}

function validateForm(formData: FormData): ValidationResult {
  const errors: string[] = [];

  // Validate status
  const statusResult = safeParseEnum(formData.status, Status);
  if (!statusResult.success) {
    errors.push(`Status: ${statusResult.error.message}`);
  }

  // Validate priority
  const priorityResult = safeParseEnum(formData.priority, Priority);
  if (!priorityResult.success) {
    errors.push(`Priority: ${priorityResult.error.message}`);
  }

  if (errors.length > 0) {
    return { isValid: false, errors, data: null };
  }

  return {
    isValid: true,
    errors: [],
    data: {
      title: formData.title,
      status: statusResult.success ? statusResult.value : '',
      priority: priorityResult.success ? priorityResult.value : '',
    },
  };
}

// Valid form
const validForm = validateForm({
  title: 'Task 1',
  status: 'active',
  priority: 'high',
});
console.log('Valid form:', validForm);

// Invalid form
const invalidForm = validateForm({
  title: 'Task 2',
  status: 'invalid_status',
  priority: 123,
});
console.log('\nInvalid form:', invalidForm);

// =============================================================================
// Use Case: API Response Parsing
// =============================================================================

console.log('\n=== Use Case: API Response Parsing ===');

interface ApiResponse {
  id: string;
  status: unknown;
}

function parseApiResponse(response: ApiResponse): {
  id: string;
  status: (typeof Status)[keyof typeof Status];
  parseError?: string;
} {
  const result = safeParseEnum(response.status, Status);

  if (result.success) {
    return { id: response.id, status: result.value };
  }

  // Log the error for debugging
  console.log(`Warning: Invalid status in response ${response.id}: ${result.error.message}`);

  // Return with default and error info
  return {
    id: response.id,
    status: Status.Pending, // Default fallback
    parseError: result.error.message,
  };
}

console.log(parseApiResponse({ id: '1', status: 'active' }));
console.log(parseApiResponse({ id: '2', status: 'invalid' }));

// =============================================================================
// Use Case: Batch Processing with Error Collection
// =============================================================================

console.log('\n=== Use Case: Batch Processing ===');

const items = ['active', 'inactive', 'invalid', 'pending', 123, null, 'active'];

interface BatchResult {
  valid: string[];
  invalid: Array<{ input: unknown; error: string }>;
}

function processBatch(inputs: unknown[]): BatchResult {
  const result: BatchResult = { valid: [], invalid: [] };

  inputs.forEach((input) => {
    const parseResult = safeParseEnum(input, Status);
    if (parseResult.success) {
      result.valid.push(parseResult.value);
    } else {
      result.invalid.push({
        input,
        error: parseResult.error.message,
      });
    }
  });

  return result;
}

const batchResult = processBatch(items);
console.log('Valid items:', batchResult.valid);
console.log('Invalid items:', batchResult.invalid.length);
batchResult.invalid.forEach((item) => {
  console.log(`  - Input: ${JSON.stringify(item.input)}, Error: ${item.error}`);
});

// =============================================================================
// Pattern: Type-Safe Result Handling
// =============================================================================

console.log('\n=== Pattern: Type-Safe Result Handling ===');

function handleResult<T>(result: SafeParseResult<T>): T | null {
  if (result.success) {
    return result.value;
  }
  console.log(`Parse failed: ${result.error.message}`);
  return null;
}

const value1 = handleResult(safeParseEnum('active', Status));
console.log('Handled value 1:', value1); // 'active'

const value2 = handleResult(safeParseEnum('invalid', Status));
console.log('Handled value 2:', value2); // null

// =============================================================================
// Comparison: safeParseEnum vs parseEnum vs assertFromEnum
// =============================================================================

console.log('\n=== Comparison: Different Parse Methods ===');

import { parseEnum, assertFromEnum } from '../src/index.js';

const testValue = 'invalid';

// parseEnum: Returns default on failure (no error info)
const parsed = parseEnum(testValue, Status, Status.Pending);
console.log('parseEnum result:', parsed); // 'pending'

// safeParseEnum: Returns result object with error details
const safeParsed = safeParseEnum(testValue, Status);
console.log('safeParseEnum success:', safeParsed.success); // false
if (!safeParsed.success) {
  console.log('safeParseEnum error:', safeParsed.error.code);
}

// assertFromEnum: Throws on failure
try {
  assertFromEnum(testValue, Status);
} catch (error) {
  console.log('assertFromEnum threw:', (error as Error).message);
}

// Summary:
// - parseEnum: Use when you have a sensible default
// - safeParseEnum: Use when you need error details
// - assertFromEnum: Use when invalid input is a programming error

console.log('\n✅ Example completed successfully!');
