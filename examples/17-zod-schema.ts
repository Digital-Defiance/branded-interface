/**
 * Example 17: Zod Schema Generation
 *
 * This example demonstrates generating Zod-compatible schema definitions:
 * - toZodSchema: Generate schema definition for Zod
 * - Zero dependencies - returns definition object, not Zod instance
 * - Integration patterns with Zod
 *
 * Run: npx ts-node examples/17-zod-schema.ts
 */

import { createBrandedEnum, toZodSchema } from '../src/index.js';

// =============================================================================
// Basic Zod Schema Definition
// =============================================================================

console.log('=== Basic Zod Schema Definition ===');

const Status = createBrandedEnum('ex17-status', {
  Active: 'active',
  Inactive: 'inactive',
  Pending: 'pending',
} as const);

const schemaDef = toZodSchema(Status);
console.log('Schema definition:');
console.log(JSON.stringify(schemaDef, null, 2));
// {
//   "typeName": "ZodEnum",
//   "values": ["active", "inactive", "pending"],
//   "enumId": "ex17-status"
// }

// =============================================================================
// With Description
// =============================================================================

console.log('\n=== With Description ===');

const Priority = createBrandedEnum('ex17-priority', {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
} as const);

const priorityDef = toZodSchema(Priority, {
  description: 'Task priority level',
});

console.log('Priority schema definition:');
console.log(JSON.stringify(priorityDef, null, 2));

// =============================================================================
// Integration Pattern: Creating Zod Schema
// =============================================================================

console.log('\n=== Integration Pattern: Creating Zod Schema ===');

// NOTE: This example shows the pattern - actual Zod usage requires installing zod
// import { z } from 'zod';
// const statusSchema = z.enum(schemaDef.values);

// Simulated Zod-like validation for demonstration
function createMockZodEnum(values: readonly string[]) {
  return {
    values,
    parse(input: unknown): string {
      if (typeof input !== 'string') {
        throw new Error(`Expected string, received ${typeof input}`);
      }
      if (!values.includes(input)) {
        throw new Error(`Invalid enum value. Expected one of: ${values.join(', ')}`);
      }
      return input;
    },
    safeParse(input: unknown): { success: true; data: string } | { success: false; error: Error } {
      try {
        return { success: true, data: this.parse(input) };
      } catch (error) {
        return { success: false, error: error as Error };
      }
    },
  };
}

// Create a "Zod-like" schema from our definition
const mockStatusSchema = createMockZodEnum(schemaDef.values);

console.log("Parse 'active':", mockStatusSchema.parse('active'));
console.log("SafeParse 'invalid':", mockStatusSchema.safeParse('invalid'));

// =============================================================================
// Use Case: Form Validation Schema
// =============================================================================

console.log('\n=== Use Case: Form Validation Schema ===');

const Category = createBrandedEnum('ex17-category', {
  Work: 'work',
  Personal: 'personal',
  Shopping: 'shopping',
  Health: 'health',
} as const);

// Generate definitions for all enums
const formEnumDefs = {
  status: toZodSchema(Status),
  priority: toZodSchema(Priority),
  category: toZodSchema(Category),
};

console.log('Form enum definitions:');
Object.entries(formEnumDefs).forEach(([name, def]) => {
  console.log(`  ${name}: ${def.values.length} values - [${def.values.join(', ')}]`);
});

// Pattern for creating a form schema with Zod:
/*
import { z } from 'zod';

const taskFormSchema = z.object({
  title: z.string().min(1),
  status: z.enum(formEnumDefs.status.values),
  priority: z.enum(formEnumDefs.priority.values),
  category: z.enum(formEnumDefs.category.values),
});

type TaskForm = z.infer<typeof taskFormSchema>;
*/

// =============================================================================
// Use Case: API Request Validation
// =============================================================================

console.log('\n=== Use Case: API Request Validation ===');

const HttpMethod = createBrandedEnum('ex17-http-method', {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const);

const methodDef = toZodSchema(HttpMethod);

// Pattern for API validation:
/*
import { z } from 'zod';

const apiRequestSchema = z.object({
  method: z.enum(methodDef.values),
  url: z.string().url(),
  body: z.unknown().optional(),
});
*/

console.log('HTTP method schema values:', methodDef.values);

// =============================================================================
// Helper Function: Create Zod Schema from Branded Enum
// =============================================================================

console.log('\n=== Helper Function Pattern ===');

// This helper would be used in a project that has Zod installed
function createZodEnumFromBrandedPattern<T extends Parameters<typeof toZodSchema>[0]>(
  enumObj: T,
  description?: string
): { values: readonly string[]; description?: string } {
  const def = toZodSchema(enumObj, { description });
  // In real usage: return z.enum(def.values).describe(def.description ?? '');
  return {
    values: def.values,
    description: def.description,
  };
}

const statusZodPattern = createZodEnumFromBrandedPattern(Status, 'User account status');
console.log('Status Zod pattern:', statusZodPattern);

// =============================================================================
// Use Case: Generate Multiple Schemas
// =============================================================================

console.log('\n=== Use Case: Generate Multiple Schemas ===');

const enums = {
  Status,
  Priority,
  Category,
  HttpMethod,
};

const zodDefinitions = Object.fromEntries(
  Object.entries(enums).map(([name, enumObj]) => [
    name,
    toZodSchema(enumObj, { description: `Valid ${name} values` }),
  ])
);

console.log('Generated Zod definitions:');
Object.entries(zodDefinitions).forEach(([name, def]) => {
  console.log(`  ${name}:`);
  console.log(`    typeName: ${def.typeName}`);
  console.log(`    values: [${def.values.join(', ')}]`);
  console.log(`    description: ${def.description}`);
});

// =============================================================================
// Type Safety: Values Tuple Type
// =============================================================================

console.log('\n=== Type Safety: Values Tuple ===');

// The values array is typed as [string, ...string[]] to match Zod's requirement
// that z.enum() needs at least one value

const def = toZodSchema(Status);
console.log('Values type is tuple with at least one element');
console.log('First value:', def.values[0]); // Always exists
console.log('All values:', def.values);

// =============================================================================
// Error Handling
// =============================================================================

console.log('\n=== Error Handling ===');

// Non-branded enum
try {
  toZodSchema({ NotBranded: 'test' } as never);
} catch (error) {
  console.log('Non-branded error:', (error as Error).message);
}

// Note: Empty enums would also throw, but branded enums require at least one value

// =============================================================================
// Complete Integration Example
// =============================================================================

console.log('\n=== Complete Integration Example ===');

// This shows the complete pattern for integrating with Zod
const integrationExample = `
// 1. Create branded enums
const Status = createBrandedEnum('status', {
  Active: 'active',
  Inactive: 'inactive',
} as const);

// 2. Generate Zod-compatible definition
const statusDef = toZodSchema(Status);

// 3. Create Zod schema (requires zod package)
import { z } from 'zod';
const statusSchema = z.enum(statusDef.values);

// 4. Use in larger schemas
const userSchema = z.object({
  name: z.string(),
  status: statusSchema,
});

// 5. Validate data
const result = userSchema.safeParse({
  name: 'John',
  status: 'active',
});
`;

console.log('Integration pattern:');
console.log(integrationExample);

console.log('\n✅ Example completed successfully!');
