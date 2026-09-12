import type { CTTRef } from '@core/CTTRef';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type {
  TraversalVisitorCommand,
  TraversalVisitorFunctionResolutionStyle,
} from '@core/TraversalVisitor';
import type { Vertex } from '@core/Vertex';
import type { VisitResult } from '@core/graph/types';

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown };

export type VisitorRegistrationMetadata<F = unknown> = {
  addedIndex: number;
  priority: number;
  resolutionStyle: TraversalVisitorFunctionResolutionStyle;
  visitor: F;
};

export type VisitorChainMetadata<T extends TreeTypeParameters> = {
  vertexVisitIndex: number;
  curVertexVisitorVisitIndex: number;
  previousVisitedVertexRef: CTTRef<Vertex<T>> | null;
  vertexVisitorsChainState: unknown;
};

export type VisitorChainPoll<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> =
  | {
      kind: 'VISIT';
      ref: CTTRef<Vertex<T | R>>;
      recordIndex: number;
      metadata: VisitorChainMetadata<T | R>;
    }
  | { kind: 'COMMANDS'; commands: TraversalVisitorCommand<R>[] }
  | { kind: 'WAIT' | 'PAUSED' | 'DONE' };

export type VisitorBatchCommit = {
  halt: boolean;
  deleted: boolean;
  vertexVisitorsChainState?: unknown;
};

export type VisitorChainInput<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = {
  ref: CTTRef<Vertex<T | R>>;
  records: readonly VisitorRegistrationMetadata[];
  metadata: VisitorChainMetadata<T | R>;
  family: 'tree' | 'dag';
};

export type VisitorOutcome<R extends TreeTypeParameters> = Outcome<
  VisitResult<R>
>;
