import { orderVisitorRecords } from './visitors/normalizeVisitorDefinitions';
import { normalizeVisitorOptions } from './visitors/normalizeVisitorOptions';
import type { MutableValueReference } from './CTTRef';
import type { Vertex } from './Vertex';
import type { VertexDataAndChildHintTypes } from './TreeTypeParameters';
import type {
  TraversalVisitorCommand,
  TraversalVisitorCommandName,
  TreeVisitorContext,
  TreePhaseVisitorRegistrationRecord,
} from './TraversalVisitor';
import { VisitorChain } from './visitors/VisitorChain';
import type { VisitorChainPoll } from './visitors/types';

type SynchronousVisitorChainAction<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> = Exclude<
  VisitorChainPoll<InputVertexTypes, RewrittenVertexTypes>,
  { kind: 'WAIT' | 'PAUSED' }
>;

export type VisitorExecutionState<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = {
  phaseVisitorChainIndex: number;
  visitorCallbackIndexInPhaseChain: number;
  previousCommittedVisitVertexHandleForSamePhase: MutableValueReference<
    Vertex<InputVertexTypes>
  > | null;
};

export type VisitorCommandResult = { currentVertexPhaseChainState?: unknown };

/** A yielded replacementData is a halt boundary, retaining the rest of the visitor chain. */
export function* executeVisitors<
  VisitorPhase extends string,
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
>(input: {
  vertexHandle: MutableValueReference<
    Vertex<InputVertexTypes | RewrittenVertexTypes>
  >;
  records: TreePhaseVisitorRegistrationRecord<
    VisitorPhase,
    InputVertexTypes,
    RewrittenVertexTypes
  >[];
  state: VisitorExecutionState<InputVertexTypes | RewrittenVertexTypes>;
  getOptions: (
    record: TreePhaseVisitorRegistrationRecord<
      VisitorPhase,
      InputVertexTypes,
      RewrittenVertexTypes
    >,
    chainState: unknown,
  ) => TreeVisitorContext<VisitorPhase, InputVertexTypes, RewrittenVertexTypes>;
  executeCommands: (
    commands: TraversalVisitorCommand<
      RewrittenVertexTypes,
      TraversalVisitorCommandName,
      InputVertexTypes['ChildHint']
    >[],
  ) => VisitorCommandResult;
  isSuspended: () => boolean;
  isDeleted: () => boolean;
}): Generator<void> {
  const { vertexHandle, state } = input;
  const records = input.records.map((record) => ({
    ...record,
    ...normalizeVisitorOptions(record),
  }));
  const chain = new VisitorChain<InputVertexTypes, RewrittenVertexTypes>({
    ref: vertexHandle,
    records: records.map(
      ({
        phaseRegistrationInsertionIndex,
        descendingExecutionPriorityWithinGroup:
          descendingExecutionPriorityWithinGroup,

        visitorCommandCommitTiming,
        visitorGroup,
      }) => ({
        phaseRegistrationInsertionIndex,
        descendingExecutionPriorityWithinGroup,

        visitorCommandCommitTiming,
        visitorGroup,
      }),
    ),
    metadata: {
      ...state,
      currentVertexPhaseChainState: null,
    },
    family: 'tree',
  });
  state.visitorCallbackIndexInPhaseChain = 0;

  while (true) {
    const action = chain.poll() as SynchronousVisitorChainAction<
      InputVertexTypes,
      RewrittenVertexTypes
    >;
    switch (action.kind) {
      case 'VISIT': {
        const record = records[action.recordIndex]!;
        state.visitorCallbackIndexInPhaseChain =
          action.metadata.visitorCallbackIndexInPhaseChain;
        const result = record.visitor(
          action.ref.getReferencedValue(),
          input.getOptions(
            record,
            action.metadata.currentVertexPhaseChainState,
          ),
        );
        chain.submit({
          ok: true,
          value: result as import('./graph/types').VisitorCallbackReturnValue<
            RewrittenVertexTypes,
            never,
            'tree' | 'dag',
            InputVertexTypes['ChildHint']
          >,
        });
        state.visitorCallbackIndexInPhaseChain++;
        break;
      }
      case 'COMMANDS': {
        const result = input.executeCommands(action.commands);
        const halted = input.isSuspended();
        chain.commitBatch({
          halt: halted,
          deleted: input.isDeleted(),
          ...(Object.prototype.hasOwnProperty.call(
            result,
            'currentVertexPhaseChainState',
          )
            ? {
                currentVertexPhaseChainState:
                  result.currentVertexPhaseChainState,
              }
            : {}),
        });
        if (halted) {
          yield;
          chain.resume();
        }
        break;
      }
      case 'DONE':
        state.previousCommittedVisitVertexHandleForSamePhase = vertexHandle;
        state.phaseVisitorChainIndex++;
        return;
    }
  }
}

export function sortVisitorRecords<
  VisitorPhase extends string,
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
>(
  records: TreePhaseVisitorRegistrationRecord<
    VisitorPhase,
    InputVertexTypes,
    RewrittenVertexTypes
  >[],
): TreePhaseVisitorRegistrationRecord<
  VisitorPhase,
  InputVertexTypes,
  RewrittenVertexTypes
>[];
export function sortVisitorRecords<
  R extends readonly {
    phaseRegistrationInsertionIndex: number;
    descendingExecutionPriorityWithinGroup: number;
  }[],
>(records: R): R[number][];
export function sortVisitorRecords<
  R extends readonly {
    phaseRegistrationInsertionIndex: number;
    descendingExecutionPriorityWithinGroup: number;
  }[],
>(records: R): R[number][] {
  return orderVisitorRecords(
    records.map((record) => ({
      ...record,
      ...normalizeVisitorOptions(record),
    })),
  );
}
