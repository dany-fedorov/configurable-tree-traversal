import { assertOwnKeys } from '@core/assertPublicOptions';
import { DEFAULT_VISITOR_PRIORITY } from '@core/TraversalVisitor';
import type {
  CommandCommitMode,
  VisitorDefinition,
  VisitorGroupDefinition,
  VisitorGroupMetadata,
  VisitorPhaseInput,
} from '@core/TraversalVisitor';
import type { VisitorRecord } from '@core/graph/types';
import { normalizeVisitorOptions } from './normalizeVisitorOptions';

function group(
  explicit: boolean,
  commandCommitMode: CommandCommitMode = 'afterEachVisitor',
): VisitorGroupMetadata {
  return Object.freeze({
    identity: Symbol('visitor group'),
    explicit,
    commandCommitMode,
  });
}

function definition<F>(
  input: unknown,
  addedIndex: number,
  visitorGroup: VisitorGroupMetadata,
  explicit = false,
): VisitorRecord<F> {
  const value = typeof input === 'function' ? { visitor: input } : input;
  if (value === null || typeof value !== 'object' || !('visitor' in value)) {
    throw new TypeError('Visitor definition requires a callback');
  }
  assertOwnKeys(value, [
    'visitor',
    'priority',
    'commandCommitMode',
    'addedIndex',
    'visitorGroup',
  ]);
  const visitor = value.visitor;
  if (typeof visitor !== 'function') {
    throw new TypeError('Visitor definition requires a callback');
  }
  const options = value as Partial<VisitorRecord<F>>;
  if (
    explicit &&
    ('commandCommitMode' in value || 'resolutionStyle' in value)
  ) {
    throw new TypeError('Explicit visitor groups own command commit policy');
  }
  const effective = normalizeVisitorOptions(
    explicit
      ? {
          priority: options.priority ?? DEFAULT_VISITOR_PRIORITY,
          commandCommitMode: visitorGroup.commandCommitMode,
        }
      : options,
  );
  if (
    visitorGroup.explicit &&
    effective.commandCommitMode !== visitorGroup.commandCommitMode
  ) {
    throw new TypeError(
      'Normalized explicit group has conflicting command commit policy',
    );
  }
  return {
    visitor: visitor as F,
    addedIndex,
    ...effective,
    visitorGroup,
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
    addedIndex: number;
    priority: number;
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
      (a, b) => b.priority - a.priority || a.addedIndex - b.addedIndex,
    ),
  );
}

export function normalizeVisitorDefinitions<F>(
  input: VisitorPhaseInput<F>,
): VisitorRecord<F>[] {
  if (input !== null && typeof input === 'object' && 'groups' in input) {
    assertOwnKeys(input, ['groups']);
    if (!Array.isArray(input.groups))
      throw new TypeError('Visitor groups must be an array');
    let records: VisitorRecord<F>[] = [];
    for (const entry of input.groups)
      records = appendVisitorGroup(records, entry);
    return records;
  }
  const entries: readonly VisitorDefinition<F>[] = Array.isArray(input)
    ? input
    : [input as VisitorDefinition<F>];
  const implicit = group(false);
  return orderVisitorRecords(
    entries.map((entry, index) => {
      const existing =
        typeof entry === 'object' && entry !== null
          ? (entry as Partial<VisitorRecord<F>>).visitorGroup
          : undefined;
      return definition<F>(entry, index, existing ?? implicit);
    }),
  );
}

export function appendVisitorDefinition<F>(
  records: readonly VisitorRecord<F>[],
  input: VisitorDefinition<F>,
): VisitorRecord<F>[] {
  const previous = records[records.length - 1]?.visitorGroup;
  const boundary = previous && !previous.explicit ? previous : group(false);
  const index =
    records.reduce((max, record) => Math.max(max, record.addedIndex), -1) + 1;
  return orderVisitorRecords([
    ...records,
    definition<F>(input, index, boundary),
  ]);
}

export function appendVisitorGroup<F>(
  records: readonly VisitorRecord<F>[],
  input: VisitorGroupDefinition<F>,
): VisitorRecord<F>[] {
  if (
    input === null ||
    typeof input !== 'object' ||
    !Array.isArray(input.visitors)
  ) {
    throw new TypeError('Visitor group requires a visitors array');
  }
  assertOwnKeys(input, ['visitors', 'commandCommitMode']);
  const mode = normalizeVisitorOptions({
    commandCommitMode: input.commandCommitMode,
  }).commandCommitMode;
  const boundary = group(true, mode);
  const start =
    records.reduce((max, record) => Math.max(max, record.addedIndex), -1) + 1;
  const members = input.visitors.map((entry, index) =>
    definition<F>(entry, start + index, boundary, true),
  );
  return [...records, ...orderVisitorRecords(members)];
}
