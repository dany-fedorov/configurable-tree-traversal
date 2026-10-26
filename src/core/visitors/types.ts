import type { DEFER_READY } from '../../traversals/dag-traversal/lib/DagProgress';
import type { MutableRef } from '@core/CTTRef';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type {
  TraversalVisitorCommand,
  VisitorRegistrationMetadata,
} from '@core/TraversalVisitor';
import type { Vertex } from '@core/Vertex';
import type { VisitResult } from '@core/graph/types';

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown };

export type RegistrationMetadata = VisitorRegistrationMetadata;

export type VisitorChainMetadata<T extends VertexTypes> = {
  phaseVisitIndex: number;
  visitorIndex: number;
  previousPhaseVertexRef: MutableRef<Vertex<T>> | null;
  visitorChainState: unknown;
};

export type VisitorChainPoll<
  T extends VertexTypes,
  R extends VertexTypes = T,
> =
  | {
      kind: 'VISIT';
      ref: MutableRef<Vertex<T | R>>;
      recordIndex: number;
      metadata: VisitorChainMetadata<T | R>;
    }
  | { kind: 'COMMANDS'; commands: TraversalVisitorCommand<R>[] }
  | { kind: 'WAIT' | 'PAUSED' | 'DONE' };

export type VisitorBatchCommit = {
  deferred?: boolean;
  halt: boolean;
  deleted: boolean;
  visitorChainState?: unknown;
};

export type VisitorChainInput<
  T extends VertexTypes,
  R extends VertexTypes = T,
> = {
  ref: MutableRef<Vertex<T | R>>;
  records: readonly RegistrationMetadata[];
  metadata: VisitorChainMetadata<T | R>;
  family: 'tree' | 'dag';
  order?: string;
};

export type VisitorOutcome<R extends VertexTypes> = Outcome<
  VisitResult<R> | typeof DEFER_READY
>;
