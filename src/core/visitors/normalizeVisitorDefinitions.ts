import { assertOwnKeys, captureOptionFields } from '@core/assertPublicOptions';
import { DEFAULT_VISITOR_PRIORITY } from '@core/TraversalVisitor';
import type {
  VisitorCommandCommitTiming,
  VisitorRegistrationDefinition,
  VisitorGroupDefinition,
  VisitorGroupMetadata,
  VisitorDefinitionsForPhase,
} from '@core/TraversalVisitor';
import type { VisitorRecord } from '@core/graph/types';
import { normalizeVisitorOptions } from './normalizeVisitorOptions';

function group(
  explicit: boolean,
  visitorCommandCommitTiming: VisitorCommandCommitTiming = 'afterEachVisitorCallback',
): VisitorGroupMetadata {
  return Object.freeze({
    groupIdentity: Symbol('visitor group'),
    isExplicitlyDeclaredGroup: explicit,
    visitorCommandCommitTiming,
  });
}

function definition<VisitorCallback>(
  input: unknown,
  phaseRegistrationInsertionIndex: number,
  visitorGroup: VisitorGroupMetadata,
  explicit = false,
  retainGroup = false,
): VisitorRecord<VisitorCallback> {
  const value = typeof input === 'function' ? { visitor: input } : input;
  if (value === null || typeof value !== 'object' || !('visitor' in value)) {
    throw new TypeError('Visitor definition requires a callback');
  }
  assertOwnKeys(value, [
    'visitor',
    'descendingExecutionPriorityWithinGroup',
    'visitorCommandCommitTiming',
    'phaseRegistrationInsertionIndex',
    'visitorGroup',
  ]);
  const options = captureOptionFields(
    value as Partial<VisitorRecord<VisitorCallback>>,
    [
      'visitor',
      'descendingExecutionPriorityWithinGroup',
      'visitorCommandCommitTiming',
      'phaseRegistrationInsertionIndex',
      'visitorGroup',
    ],
  );
  const visitor = options.visitor;
  if (typeof visitor !== 'function') {
    throw new TypeError('Visitor definition requires a callback');
  }
  const boundary = retainGroup
    ? options.visitorGroup ?? visitorGroup
    : visitorGroup;
  if (
    explicit &&
    ('visitorCommandCommitTiming' in value || 'resolutionStyle' in value)
  ) {
    throw new TypeError('Explicit visitor groups own command commit policy');
  }
  const effective = normalizeVisitorOptions(
    explicit
      ? {
          descendingExecutionPriorityWithinGroup:
            options.descendingExecutionPriorityWithinGroup ??
            DEFAULT_VISITOR_PRIORITY,
          visitorCommandCommitTiming: boundary.visitorCommandCommitTiming,
        }
      : options,
  );
  if (
    boundary.isExplicitlyDeclaredGroup &&
    effective.visitorCommandCommitTiming !== boundary.visitorCommandCommitTiming
  ) {
    throw new TypeError(
      'Normalized explicit group has conflicting command commit policy',
    );
  }
  return {
    visitor: visitor as VisitorCallback,
    phaseRegistrationInsertionIndex,
    ...effective,
    visitorGroup: boundary,
  };
}

/** Detach mutable registration wrappers while retaining callbacks and group identity. */
export function copyVisitorRecords<Records extends VisitorRecord<unknown>[]>(
  records: Records,
): Records {
  // Mapping copies each wrapper without changing the phase-indexed record shape.
  return records.map((record) => ({ ...record })) as Records;
}

/** Sort within boundaries only; batching policy never participates in ordering. */
export function orderVisitorRecords<
  R extends {
    phaseRegistrationInsertionIndex: number;
    descendingExecutionPriorityWithinGroup: number;
    visitorGroup?: VisitorGroupMetadata | undefined;
  },
>(records: readonly R[]): R[] {
  const groups = new Map<VisitorGroupMetadata | undefined, R[]>();
  for (const record of records) {
    const entries = groups.get(record.visitorGroup);
    if (entries) entries.push(record);
    else groups.set(record.visitorGroup, [record]);
  }
  return Array.from(groups.values()).flatMap((entries) =>
    entries.sort(
      (a, b) =>
        b.descendingExecutionPriorityWithinGroup -
          a.descendingExecutionPriorityWithinGroup ||
        a.phaseRegistrationInsertionIndex - b.phaseRegistrationInsertionIndex,
    ),
  );
}

export function normalizeVisitorDefinitions<VisitorCallback>(
  input: VisitorDefinitionsForPhase<VisitorCallback>,
): VisitorRecord<VisitorCallback>[] {
  if (input !== null && typeof input === 'object' && 'groups' in input) {
    assertOwnKeys(input, ['groups']);
    const { groups } = captureOptionFields(input, ['groups']);
    if (!Array.isArray(groups))
      throw new TypeError('Visitor groups must be an array');
    let records: VisitorRecord<VisitorCallback>[] = [];
    for (const entry of groups) records = appendVisitorGroup(records, entry);
    return records;
  }
  const entries: readonly VisitorRegistrationDefinition<VisitorCallback>[] =
    Array.isArray(input)
      ? input
      : [input as VisitorRegistrationDefinition<VisitorCallback>];
  const implicit = group(false);
  return orderVisitorRecords(
    entries.map((entry, index) =>
      definition<VisitorCallback>(entry, index, implicit, false, true),
    ),
  );
}

export function appendVisitorDefinition<VisitorCallback>(
  records: readonly VisitorRecord<VisitorCallback>[],
  input: VisitorRegistrationDefinition<VisitorCallback>,
): VisitorRecord<VisitorCallback>[] {
  const previous = records[records.length - 1]?.visitorGroup;
  const boundary =
    previous && !previous.isExplicitlyDeclaredGroup ? previous : group(false);
  const index =
    records.reduce(
      (max, record) => Math.max(max, record.phaseRegistrationInsertionIndex),
      -1,
    ) + 1;
  return orderVisitorRecords([
    ...records,
    definition<VisitorCallback>(input, index, boundary),
  ]);
}

export function appendVisitorGroup<VisitorCallback>(
  records: readonly VisitorRecord<VisitorCallback>[],
  input: VisitorGroupDefinition<VisitorCallback>,
): VisitorRecord<VisitorCallback>[] {
  if (input === null || typeof input !== 'object') {
    throw new TypeError('Visitor group requires a visitors array');
  }
  assertOwnKeys(input, ['visitors', 'visitorCommandCommitTiming']);
  const captured = captureOptionFields(input, [
    'visitors',
    'visitorCommandCommitTiming',
  ]);
  if (!Array.isArray(captured.visitors))
    throw new TypeError('Visitor group requires a visitors array');
  const mode = normalizeVisitorOptions({
    visitorCommandCommitTiming: captured.visitorCommandCommitTiming,
  }).visitorCommandCommitTiming;
  const boundary = group(true, mode);
  const start =
    records.reduce(
      (max, record) => Math.max(max, record.phaseRegistrationInsertionIndex),
      -1,
    ) + 1;
  const members = captured.visitors.map((entry, index) =>
    definition<VisitorCallback>(entry, start + index, boundary, true),
  );
  return [...records, ...orderVisitorRecords(members)];
}
