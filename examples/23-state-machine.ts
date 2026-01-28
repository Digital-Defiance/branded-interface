/**
 * Example 23: Real-World Use Case - State Machine
 *
 * This example demonstrates using branded enums for state machines:
 * - Defining states and transitions
 * - Type-safe state handling
 * - Exhaustive transition checking
 *
 * Run: npx ts-node examples/23-state-machine.ts
 */

import {
  createBrandedEnum,
  isFromEnum,
  exhaustive,
  exhaustiveGuard,
  EnumValue,
  EnumClass,
  getEnumValues,
  BrandedEnumValue,
} from '../src/index.js';

// =============================================================================
// Define State Machine States
// =============================================================================

console.log('=== Define State Machine States ===');

const DocumentState = createBrandedEnum('doc-state', {
  Draft: 'draft',
  PendingReview: 'pending_review',
  InReview: 'in_review',
  Approved: 'approved',
  Rejected: 'rejected',
  Published: 'published',
  Archived: 'archived',
} as const);

type DocumentStateValue = BrandedEnumValue<typeof DocumentState>;

console.log('Document states:', getEnumValues(DocumentState));

// =============================================================================
// Define Events/Actions
// =============================================================================

const DocumentEvent = createBrandedEnum('doc-event', {
  Submit: 'submit',
  StartReview: 'start_review',
  Approve: 'approve',
  Reject: 'reject',
  Publish: 'publish',
  Archive: 'archive',
  Revert: 'revert',
  Edit: 'edit',
} as const);

type DocumentEventValue = BrandedEnumValue<typeof DocumentEvent>;

console.log('Document events:', getEnumValues(DocumentEvent));

// =============================================================================
// State Transition Logic
// =============================================================================

console.log('\n=== State Transition Logic ===');

const assertStateExhaustive = exhaustiveGuard(DocumentState);

interface TransitionResult {
  success: boolean;
  newState?: DocumentStateValue;
  error?: string;
}

function transition(currentState: DocumentStateValue, event: DocumentEventValue): TransitionResult {
  switch (currentState) {
    case DocumentState.Draft:
      switch (event) {
        case DocumentEvent.Submit:
          return { success: true, newState: DocumentState.PendingReview };
        case DocumentEvent.Edit:
          return { success: true, newState: DocumentState.Draft };
        default:
          return { success: false, error: `Cannot ${event} from Draft state` };
      }

    case DocumentState.PendingReview:
      switch (event) {
        case DocumentEvent.StartReview:
          return { success: true, newState: DocumentState.InReview };
        case DocumentEvent.Revert:
          return { success: true, newState: DocumentState.Draft };
        default:
          return { success: false, error: `Cannot ${event} from PendingReview state` };
      }

    case DocumentState.InReview:
      switch (event) {
        case DocumentEvent.Approve:
          return { success: true, newState: DocumentState.Approved };
        case DocumentEvent.Reject:
          return { success: true, newState: DocumentState.Rejected };
        default:
          return { success: false, error: `Cannot ${event} from InReview state` };
      }

    case DocumentState.Approved:
      switch (event) {
        case DocumentEvent.Publish:
          return { success: true, newState: DocumentState.Published };
        case DocumentEvent.Revert:
          return { success: true, newState: DocumentState.Draft };
        default:
          return { success: false, error: `Cannot ${event} from Approved state` };
      }

    case DocumentState.Rejected:
      switch (event) {
        case DocumentEvent.Edit:
          return { success: true, newState: DocumentState.Draft };
        default:
          return { success: false, error: `Cannot ${event} from Rejected state` };
      }

    case DocumentState.Published:
      switch (event) {
        case DocumentEvent.Archive:
          return { success: true, newState: DocumentState.Archived };
        case DocumentEvent.Revert:
          return { success: true, newState: DocumentState.Draft };
        default:
          return { success: false, error: `Cannot ${event} from Published state` };
      }

    case DocumentState.Archived:
      switch (event) {
        case DocumentEvent.Revert:
          return { success: true, newState: DocumentState.Draft };
        default:
          return { success: false, error: `Cannot ${event} from Archived state` };
      }

    default:
      return assertStateExhaustive(currentState);
  }
}

// Test transitions
console.log('Draft + Submit:', transition(DocumentState.Draft, DocumentEvent.Submit));
console.log('Draft + Approve:', transition(DocumentState.Draft, DocumentEvent.Approve));
console.log('InReview + Approve:', transition(DocumentState.InReview, DocumentEvent.Approve));
console.log('Approved + Publish:', transition(DocumentState.Approved, DocumentEvent.Publish));

// =============================================================================
// Document Class with State Machine
// =============================================================================

console.log('\n=== Document Class with State Machine ===');

@EnumClass(DocumentState, DocumentEvent)
class Document {
  id: string;
  title: string;
  content: string;

  @EnumValue(DocumentState)
  accessor state: string = DocumentState.Draft;

  history: Array<{ from: string; to: string; event: string; timestamp: Date }> = [];

  constructor(id: string, title: string, content: string) {
    this.id = id;
    this.title = title;
    this.content = content;
  }

  dispatch(event: DocumentEventValue): boolean {
    const currentState = this.state as DocumentStateValue;
    const result = transition(currentState, event);

    if (result.success && result.newState) {
      this.history.push({
        from: currentState,
        to: result.newState,
        event,
        timestamp: new Date(),
      });
      this.state = result.newState;
      console.log(`  [${this.id}] ${currentState} -> ${result.newState} (${event})`);
      return true;
    }

    console.log(`  [${this.id}] Failed: ${result.error}`);
    return false;
  }

  getAvailableEvents(): DocumentEventValue[] {
    const currentState = this.state as DocumentStateValue;
    const allEvents = getEnumValues(DocumentEvent) ?? [];

    return allEvents.filter((event) => {
      const result = transition(currentState, event as DocumentEventValue);
      return result.success;
    }) as DocumentEventValue[];
  }
}

// Create and manipulate a document
const doc = new Document('DOC-001', 'My Article', 'Content here...');

console.log('Initial state:', doc.state);
console.log('Available events:', doc.getAvailableEvents());

doc.dispatch(DocumentEvent.Submit);
console.log('Available events:', doc.getAvailableEvents());

doc.dispatch(DocumentEvent.StartReview);
doc.dispatch(DocumentEvent.Approve);
doc.dispatch(DocumentEvent.Publish);

console.log('\nFinal state:', doc.state);
console.log('History:', doc.history.map((h) => `${h.from} -> ${h.to}`));

// =============================================================================
// State Machine Visualization
// =============================================================================

console.log('\n=== State Machine Visualization ===');

function generateStateDiagram(): void {
  const states = getEnumValues(DocumentState) ?? [];
  const events = getEnumValues(DocumentEvent) ?? [];

  console.log('State Transitions:');
  console.log('==================');

  states.forEach((state) => {
    const validEvents = events.filter((event) => {
      const result = transition(state as DocumentStateValue, event as DocumentEventValue);
      return result.success;
    });

    if (validEvents.length > 0) {
      console.log(`\n${state}:`);
      validEvents.forEach((event) => {
        const result = transition(state as DocumentStateValue, event as DocumentEventValue);
        if (result.success && result.newState) {
          console.log(`  --[${event}]--> ${result.newState}`);
        }
      });
    } else {
      console.log(`\n${state}: (terminal state)`);
    }
  });
}

generateStateDiagram();

// =============================================================================
// Validate State Sequence
// =============================================================================

console.log('\n=== Validate State Sequence ===');

function validateStateSequence(sequence: DocumentStateValue[]): boolean {
  for (let i = 0; i < sequence.length - 1; i++) {
    const from = sequence[i];
    const to = sequence[i + 1];

    // Find an event that transitions from -> to
    const events = getEnumValues(DocumentEvent) ?? [];
    const validEvent = events.find((event) => {
      const result = transition(from, event as DocumentEventValue);
      return result.success && result.newState === to;
    });

    if (!validEvent) {
      console.log(`Invalid transition: ${from} -> ${to}`);
      return false;
    }
  }

  console.log('Valid sequence:', sequence.join(' -> '));
  return true;
}

// Valid sequence
validateStateSequence([
  DocumentState.Draft,
  DocumentState.PendingReview,
  DocumentState.InReview,
  DocumentState.Approved,
  DocumentState.Published,
]);

// Invalid sequence
validateStateSequence([DocumentState.Draft, DocumentState.Published]);

// =============================================================================
// State Guards
// =============================================================================

console.log('\n=== State Guards ===');

function canEdit(state: DocumentStateValue): boolean {
  return state === DocumentState.Draft || state === DocumentState.Rejected;
}

function canPublish(state: DocumentStateValue): boolean {
  return state === DocumentState.Approved;
}

function isTerminal(state: DocumentStateValue): boolean {
  const availableEvents = (getEnumValues(DocumentEvent) ?? []).filter((event) => {
    const result = transition(state, event as DocumentEventValue);
    return result.success;
  });
  return availableEvents.length === 0 || (availableEvents.length === 1 && availableEvents[0] === 'revert');
}

console.log('Can edit Draft:', canEdit(DocumentState.Draft)); // true
console.log('Can edit Published:', canEdit(DocumentState.Published)); // false
console.log('Can publish Approved:', canPublish(DocumentState.Approved)); // true
console.log('Is Archived terminal:', isTerminal(DocumentState.Archived)); // true (only revert)

console.log('\n✅ Example completed successfully!');
