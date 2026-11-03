import type { MutableValueReference } from '@core/CTTRef';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type {
  TraversalVisitorCommand,
  TraversalVisitorCommandName,
  VisitorRegistrationMetadata,
} from '@core/TraversalVisitor';
import type { Vertex } from '@core/Vertex';
import type { VisitorCallbackReturnValue } from '@core/graph/types';

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown };

export type RegistrationMetadata = VisitorRegistrationMetadata;

export type VisitorChainMetadata<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = {
  phaseVisitorChainIndex: number;
  visitorCallbackIndexInPhaseChain: number;
  previousCommittedVisitVertexHandleForSamePhase: MutableValueReference<
    Vertex<InputVertexTypes>
  > | null;
  currentVertexPhaseChainState: unknown;
};

export type VisitorChainPoll<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> =
  | {
      kind: 'VISIT';
      ref: MutableValueReference<
        Vertex<InputVertexTypes | RewrittenVertexTypes>
      >;
      recordIndex: number;
      metadata: VisitorChainMetadata<InputVertexTypes | RewrittenVertexTypes>;
    }
  | {
      kind: 'COMMANDS';
      commands: TraversalVisitorCommand<
        RewrittenVertexTypes,
        TraversalVisitorCommandName,
        InputVertexTypes['ChildHint']
      >[];
    }
  | { kind: 'WAIT' | 'PAUSED' | 'DONE' };

export type VisitorBatchCommit = {
  deferred?: boolean;
  halt: boolean;
  deleted: boolean;
  currentVertexPhaseChainState?: unknown;
};

export type VisitorChainInput<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = {
  ref: MutableValueReference<Vertex<InputVertexTypes | RewrittenVertexTypes>>;
  records: readonly RegistrationMetadata[];
  metadata: VisitorChainMetadata<InputVertexTypes | RewrittenVertexTypes>;
  family: 'tree' | 'dag';
  order?: string;
};

export type VisitorOutcome<
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
  SourceHint = RewrittenVertexTypes['ChildHint'],
> = Outcome<
  VisitorCallbackReturnValue<
    RewrittenVertexTypes,
    never,
    'tree' | 'dag',
    SourceHint
  >
>;
