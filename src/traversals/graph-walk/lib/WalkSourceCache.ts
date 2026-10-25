import type { WalkResources } from './WalkResources';
import type { GraphWalkVertexResult } from '../GraphWalkSource';
import { rejectThenable } from './rejectThenable';

function record(value: unknown): Record<PropertyKey, unknown> {
  if (value === null || typeof value !== 'object')
    throw new TypeError('Expected a walking source record');
  return value as Record<PropertyKey, unknown>;
}

/** Read a tagged value once; data is deliberately shallow and may be undefined. */
export function copyResolution<Data>(
  value: unknown,
): GraphWalkVertexResult<Data> {
  const input = record(value);
  const kind = input['kind'];
  if (kind === 'omitted') return { kind };
  if (kind === 'found' && Object.prototype.hasOwnProperty.call(input, 'data'))
    return { kind, data: input['data'] as Data };
  throw new TypeError('Expected found or omitted walking resolution');
}

export type WalkCursor = {
  input: unknown;
  iterator: Iterator<unknown> | AsyncIterator<unknown> | null;
  done: boolean;
};
export function makeCursor(input: unknown): WalkCursor {
  return { input, iterator: null, done: false };
}

/** Invoked inside a session CALL, never while polling or inspecting the kernel. */
export function pullCursor(
  cursor: WalkCursor,
  execution: 'sync' | 'async',
  resources: WalkResources,
  vertexToken?: symbol,
): unknown {
  if (cursor.iterator === null) {
    const input = record(cursor.input);
    const factory =
      execution === 'async'
        ? input[Symbol.asyncIterator] ?? input[Symbol.iterator]
        : input[Symbol.iterator];
    if (typeof factory !== 'function')
      throw new TypeError('Expected a walking source iterable');
    const value = factory.call(input);
    rejectThenable(value);
    const iterator = record(value);
    cursor.iterator = iterator as unknown as Iterator<unknown>;
    resources.open(cursor.iterator, vertexToken);
    if (typeof iterator['next'] !== 'function')
      throw new TypeError('Expected an iterator next method');
  }
  return cursor.iterator.next();
}
export function readStep(value: unknown): IteratorResult<unknown> {
  const input = record(value);
  return input['done']
    ? { done: true, value: undefined }
    : { done: false, value: input['value'] };
}

export type WalkTarget<ID> = { vertexId: ID; resolution?: unknown };
export type WalkLink<Edge, ID> = { target: WalkTarget<ID>; data: Edge };

type Adjacency<Edge, ID> = {
  cursor: WalkCursor | null;
  links: WalkLink<Edge, ID>[];
};
export class WalkSourceCache<Data, Edge, ID> {
  readonly resolutions = new Map<ID, GraphWalkVertexResult<Data>>();
  readonly adjacency = new Map<ID, Adjacency<Edge, ID>>();

  copyTarget(value: unknown): WalkTarget<ID> {
    const input = record(value);
    if (!Object.prototype.hasOwnProperty.call(input, 'vertexId'))
      throw new TypeError('Expected a walking target vertexId');
    const vertexId = input['vertexId'] as ID;
    // A later inline value cannot replace or revalidate the accepted snapshot.
    if (this.resolutions.has(vertexId)) return { vertexId };
    const resolution = input['resolution'];
    return { vertexId, resolution };
  }
  copyLink(value: unknown): WalkLink<Edge, ID> {
    const input = record(value);
    return {
      target: this.copyTarget(input['target']),
      data: input['data'] as Edge,
    };
  }
  entries(vertexId: ID): Adjacency<Edge, ID> {
    let entry = this.adjacency.get(vertexId);
    if (entry === undefined) {
      entry = { cursor: null, links: [] };
      this.adjacency.set(vertexId, entry);
    }
    return entry;
  }
}
