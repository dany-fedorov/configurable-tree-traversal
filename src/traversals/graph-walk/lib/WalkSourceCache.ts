import type { WalkResources } from './WalkResources';
import type { GraphWalkVertexResolutionResult } from '../GraphWalkSource';
import { rejectThenable } from './rejectThenable';

function record(value: unknown): Record<PropertyKey, unknown> {
  if (value === null || typeof value !== 'object')
    throw new TypeError('Expected a walking source record');
  return value as Record<PropertyKey, unknown>;
}

/** Read a tagged value firstAdmittedFoundRoutePerVertex; data is deliberately shallow and may be undefined. */
export function copyResolution<VertexData>(
  value: unknown,
): GraphWalkVertexResolutionResult<VertexData> {
  const input = record(value);
  const kind = input['kind'];
  if (kind === 'omitted') return { kind };
  if (
    kind === 'found' &&
    Object.prototype.hasOwnProperty.call(input, 'vertexData')
  )
    return { kind, vertexData: input['vertexData'] as VertexData };
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
  runnerLocalVertexIdentityToken?: symbol,
): unknown {
  if (cursor.iterator === null) {
    const input = record(cursor.input);
    const factory =
      execution === 'async'
        ? input[Symbol.asyncIterator] ?? input[Symbol.iterator]
        : input[Symbol.iterator];
    if (typeof factory !== 'function')
      throw new TypeError(
        'Expected a walking source iterable',
      );
    const value = factory.call(input);
    // Acquiring an object transfers cleanup ownership before any source-owned
    // getter is read, including the thenable guard's `then` lookup.
    if (value !== null && typeof value === 'object') {
      cursor.iterator = value as Iterator<unknown>;
      resources.open(cursor.iterator, runnerLocalVertexIdentityToken);
    }
    rejectThenable(value);
    const iterator = record(value);
    if (typeof iterator['next'] !== 'function')
      throw new TypeError('Expected an iterator next method');
  }
  return cursor.iterator!.next();
}
export function readStep(value: unknown): IteratorResult<unknown> {
  const input = record(value);
  return input['done']
    ? { done: true, value: undefined }
    : { done: false, value: input['value'] };
}

export type WalkTarget<VertexId> = {
  vertexId: VertexId;
  resolutionIfNotPreviouslyAdmitted?: unknown;
};
export type WalkLink<EdgeData, VertexId> = {
  targetToResolveOnAdmission: WalkTarget<VertexId>;
  edgeData: EdgeData;
};

type Adjacency<EdgeData, VertexId> = {
  cursor: WalkCursor | null;
  links: WalkLink<EdgeData, VertexId>[];
};
export class WalkSourceCache<VertexData, EdgeData, VertexId> {
  readonly resolutions = new Map<
    VertexId,
    GraphWalkVertexResolutionResult<VertexData>
  >();
  readonly adjacency = new Map<VertexId, Adjacency<EdgeData, VertexId>>();

  constructor(
    private readonly vertexResolutionMode:
      | 'resolverWithOptionalInlineResolution'
      | 'inlineResolutionOrPreviouslyAdmittedVertex',
  ) {}

  copyTarget(value: unknown): WalkTarget<VertexId> {
    const input = record(value);
    if (!Object.prototype.hasOwnProperty.call(input, 'vertexId'))
      throw new TypeError(
        'Expected a walking target vertexId',
      );
    const vertexId = input['vertexId'] as VertexId;
    if (
      this.vertexResolutionMode === 'inlineResolutionOrPreviouslyAdmittedVertex'
    ) {
      const kind = input['kind'];
      if (kind !== 'inlineResolution' && kind !== 'previouslyAdmittedVertex')
        throw new TypeError(
          'Expected an inlineResolution or previouslyAdmittedVertex walking target',
        );
      if (kind === 'previouslyAdmittedVertex') return { vertexId };
    }
    // A later inlineResolution value cannot replace or revalidate the accepted snapshot.
    if (this.resolutions.has(vertexId)) return { vertexId };
    const resolutionIfNotPreviouslyAdmitted =
      input['resolutionIfNotPreviouslyAdmitted'];
    return { vertexId, resolutionIfNotPreviouslyAdmitted };
  }
  copyLink(value: unknown): WalkLink<EdgeData, VertexId> {
    const input = record(value);
    return {
      targetToResolveOnAdmission: this.copyTarget(
        input['targetToResolveOnAdmission'],
      ),
      edgeData: input['edgeData'] as EdgeData,
    };
  }
  entries(vertexId: VertexId): Adjacency<EdgeData, VertexId> {
    let entry = this.adjacency.get(vertexId);
    if (entry === undefined) {
      entry = { cursor: null, links: [] };
      this.adjacency.set(vertexId, entry);
    }
    return entry;
  }
}
