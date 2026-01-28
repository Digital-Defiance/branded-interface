/**
 * Example 22: Real-World Use Case - API Response Validation
 *
 * This example demonstrates using branded enums for API validation:
 * - Validating API response status codes
 * - Type-safe request/response handling
 * - Error handling with detailed messages
 *
 * Run: npx ts-node examples/22-api-validation.ts
 */

import {
  createBrandedEnum,
  isFromEnum,
  assertFromEnum,
  safeParseEnum,
  parseEnum,
  exhaustive,
  toJsonSchema,
  BrandedEnumValue,
} from '../src/index.js';

// =============================================================================
// Define API Enums
// =============================================================================

console.log('=== Define API Enums ===');

const HttpStatus = createBrandedEnum('api-http-status', {
  OK: '200',
  Created: '201',
  Accepted: '202',
  NoContent: '204',
  BadRequest: '400',
  Unauthorized: '401',
  Forbidden: '403',
  NotFound: '404',
  Conflict: '409',
  UnprocessableEntity: '422',
  TooManyRequests: '429',
  InternalServerError: '500',
  BadGateway: '502',
  ServiceUnavailable: '503',
} as const);

const ApiResponseStatus = createBrandedEnum('api-response-status', {
  Success: 'success',
  Error: 'error',
  Pending: 'pending',
  Partial: 'partial',
} as const);

const UserRole = createBrandedEnum('api-user-role', {
  Admin: 'admin',
  Moderator: 'moderator',
  User: 'user',
  Guest: 'guest',
} as const);

const OrderStatus = createBrandedEnum('api-order-status', {
  Created: 'created',
  PaymentPending: 'payment_pending',
  Paid: 'paid',
  Processing: 'processing',
  Shipped: 'shipped',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
  Refunded: 'refunded',
} as const);

// =============================================================================
// API Response Types
// =============================================================================

interface ApiResponse<T> {
  status: string;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Order {
  id: string;
  userId: string;
  status: string;
  total: number;
}

// =============================================================================
// Validate API Response
// =============================================================================

console.log('\n=== Validate API Response ===');

function validateApiResponse<T>(response: ApiResponse<T>): {
  isValid: boolean;
  status: (typeof ApiResponseStatus)[keyof typeof ApiResponseStatus];
  errors: string[];
} {
  const errors: string[] = [];

  // Validate response status
  const statusResult = safeParseEnum(response.status, ApiResponseStatus);
  if (!statusResult.success) {
    errors.push(`Invalid response status: ${statusResult.error.message}`);
  }

  return {
    isValid: errors.length === 0,
    status: statusResult.success ? statusResult.value : ApiResponseStatus.Error,
    errors,
  };
}

// Test with valid response
const validResponse: ApiResponse<User> = {
  status: 'success',
  data: { id: '1', name: 'John', email: 'john@example.com', role: 'admin' },
};

console.log('Valid response:', validateApiResponse(validResponse));

// Test with invalid response
const invalidResponse: ApiResponse<User> = {
  status: 'invalid_status',
  error: { code: 'ERR001', message: 'Something went wrong' },
};

console.log('Invalid response:', validateApiResponse(invalidResponse));

// =============================================================================
// Validate User Data
// =============================================================================

console.log('\n=== Validate User Data ===');

function validateUser(user: User): { isValid: boolean; errors: string[]; validatedUser?: User } {
  const errors: string[] = [];

  // Validate role
  const roleResult = safeParseEnum(user.role, UserRole);
  if (!roleResult.success) {
    errors.push(`Invalid role: ${roleResult.error.message}`);
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    validatedUser: {
      ...user,
      role: roleResult.success ? roleResult.value : user.role,
    },
  };
}

console.log('Valid user:', validateUser({ id: '1', name: 'John', email: 'john@example.com', role: 'admin' }));
console.log('Invalid user:', validateUser({ id: '2', name: 'Jane', email: 'jane@example.com', role: 'superuser' }));

// =============================================================================
// Handle Order Status Transitions
// =============================================================================

console.log('\n=== Handle Order Status Transitions ===');

type OrderStatusValue = BrandedEnumValue<typeof OrderStatus>;

function getValidTransitions(currentStatus: OrderStatusValue): OrderStatusValue[] {
  switch (currentStatus) {
    case OrderStatus.Created:
      return [OrderStatus.PaymentPending, OrderStatus.Cancelled];
    case OrderStatus.PaymentPending:
      return [OrderStatus.Paid, OrderStatus.Cancelled];
    case OrderStatus.Paid:
      return [OrderStatus.Processing, OrderStatus.Refunded];
    case OrderStatus.Processing:
      return [OrderStatus.Shipped, OrderStatus.Cancelled];
    case OrderStatus.Shipped:
      return [OrderStatus.Delivered];
    case OrderStatus.Delivered:
      return [OrderStatus.Refunded];
    case OrderStatus.Cancelled:
      return [];
    case OrderStatus.Refunded:
      return [];
    default:
      return exhaustive(currentStatus);
  }
}

function canTransition(from: OrderStatusValue, to: OrderStatusValue): boolean {
  const validTransitions = getValidTransitions(from);
  return validTransitions.includes(to);
}

console.log('Created -> Paid:', canTransition(OrderStatus.Created, OrderStatus.Paid)); // false
console.log('Created -> PaymentPending:', canTransition(OrderStatus.Created, OrderStatus.PaymentPending)); // true
console.log('Paid -> Processing:', canTransition(OrderStatus.Paid, OrderStatus.Processing)); // true
console.log('Delivered -> Shipped:', canTransition(OrderStatus.Delivered, OrderStatus.Shipped)); // false

// =============================================================================
// Process API Response with Type Safety
// =============================================================================

console.log('\n=== Process API Response with Type Safety ===');

function processOrderResponse(response: ApiResponse<Order>): void {
  // Validate response status
  if (!isFromEnum(response.status, ApiResponseStatus)) {
    console.log('Invalid response status');
    return;
  }

  if (response.status === ApiResponseStatus.Error) {
    console.log('API Error:', response.error?.message);
    return;
  }

  if (!response.data) {
    console.log('No data in response');
    return;
  }

  // Validate order status
  const orderStatus = parseEnum(response.data.status, OrderStatus, OrderStatus.Created);
  console.log(`Order ${response.data.id}: Status = ${orderStatus}`);

  // Handle based on status
  switch (orderStatus) {
    case OrderStatus.Created:
    case OrderStatus.PaymentPending:
      console.log('  -> Awaiting payment');
      break;
    case OrderStatus.Paid:
    case OrderStatus.Processing:
      console.log('  -> Being processed');
      break;
    case OrderStatus.Shipped:
      console.log('  -> In transit');
      break;
    case OrderStatus.Delivered:
      console.log('  -> Completed');
      break;
    case OrderStatus.Cancelled:
    case OrderStatus.Refunded:
      console.log('  -> Closed');
      break;
    default:
      exhaustive(orderStatus);
  }
}

processOrderResponse({
  status: 'success',
  data: { id: 'ORD-001', userId: 'USR-001', status: 'shipped', total: 99.99 },
});

processOrderResponse({
  status: 'success',
  data: { id: 'ORD-002', userId: 'USR-002', status: 'invalid_status', total: 49.99 },
});

// =============================================================================
// Generate API Documentation
// =============================================================================

console.log('\n=== Generate API Documentation ===');

const apiSchemas = {
  HttpStatus: toJsonSchema(HttpStatus, {
    title: 'HTTP Status Code',
    description: 'Standard HTTP status codes used by the API',
    includeSchema: false,
  }),
  ResponseStatus: toJsonSchema(ApiResponseStatus, {
    title: 'API Response Status',
    description: 'Status field in API responses',
    includeSchema: false,
  }),
  UserRole: toJsonSchema(UserRole, {
    title: 'User Role',
    description: 'Available user roles in the system',
    includeSchema: false,
  }),
  OrderStatus: toJsonSchema(OrderStatus, {
    title: 'Order Status',
    description: 'Possible states of an order',
    includeSchema: false,
  }),
};

console.log('Generated API schemas:');
Object.entries(apiSchemas).forEach(([name, schema]) => {
  console.log(`  ${name}: ${schema.enum.length} values`);
});

// =============================================================================
// Error Response Handler
// =============================================================================

console.log('\n=== Error Response Handler ===');

function handleHttpError(statusCode: string): string {
  if (!isFromEnum(statusCode, HttpStatus)) {
    return 'Unknown error occurred';
  }

  switch (statusCode) {
    case HttpStatus.BadRequest:
      return 'Invalid request. Please check your input.';
    case HttpStatus.Unauthorized:
      return 'Please log in to continue.';
    case HttpStatus.Forbidden:
      return 'You do not have permission to perform this action.';
    case HttpStatus.NotFound:
      return 'The requested resource was not found.';
    case HttpStatus.TooManyRequests:
      return 'Too many requests. Please try again later.';
    case HttpStatus.InternalServerError:
      return 'An internal error occurred. Please try again.';
    case HttpStatus.ServiceUnavailable:
      return 'Service is temporarily unavailable.';
    default:
      return `Request failed with status ${statusCode}`;
  }
}

console.log('400:', handleHttpError('400'));
console.log('401:', handleHttpError('401'));
console.log('404:', handleHttpError('404'));
console.log('500:', handleHttpError('500'));
console.log('999:', handleHttpError('999'));

console.log('\n✅ Example completed successfully!');
