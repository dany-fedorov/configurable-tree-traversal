import { orderVisitorRecords } from './visitors/normalizeVisitorDefinitions';
import { normalizeVisitorOptions } from './visitors/normalizeVisitorOptions';
import type { MutableRef } from './CTTRef';
import type { Vertex } from './Vertex';
import type { VertexTypes } from './TreeTypeParameters';
import type {
  TraversalVisitorCommand,
  TraversalVisitorCommandName,
  TreeVisitorContext,
  TreeVisitorRecord,
} from './TraversalVisitor';
import { VisitorChain } from './visitors/VisitorChain';
import type { VisitorChainPoll } from './visitors/types';

type SynchronousVisitorChainAction<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = Exclude<VisitorChainPoll<TTP, RW_TTP>, { kind: 'WAIT' | 'PAUSED' }>;

export type VisitorExecutionState<TTP extends VertexTypes> = {
  phaseVisitIndex: number;
  visitorIndex: number;
  previousPhaseVertexRef: MutableRef<Vertex<TTP>> | null;
};

export type VisitorCommandResult = { visitorChainState?: unknown };

/** A yielded value is a halt boundary, retaining the rest of the visitor chain. */
export function* executeVisitors<
  ORDER extends string,
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
>(input: {
  vertexRef: MutableRef<Vertex<TTP | RW_TTP>>;
  records: TreeVisitorRecord<ORDER, TTP, RW_TTP>[];
  state: VisitorExecutionState<TTP | RW_TTP>;
  getOptions: (
    record: TreeVisitorRecord<ORDER, TTP, RW_TTP>,
    chainState: unknown,
  ) => TreeVisitorContext<ORDER, TTP, RW_TTP>;
  executeCommands: (
    commands: TraversalVisitorCommand<
      RW_TTP,
      TraversalVisitorCommandName,
      TTP['VertexHint']
    >[],
  ) => VisitorCommandResult;
  isHalted: () => boolean;
  isDeleted: () => boolean;
}): Generator<void> {
  const { vertexRef, state } = input;
  const records = input.records.map((record) => ({
    ...record,
    ...normalizeVisitorOptions(record),
  }));
  const chain = new VisitorChain<TTP, RW_TTP>({
    ref: vertexRef,
    records: records.map(
      ({
        addedIndex,
        priority,

        commandCommitMode,
        visitorGroup,
      }) => ({
        addedIndex,
        priority,

        commandCommitMode,
        visitorGroup,
      }),
    ),
    metadata: {
      ...state,
      visitorChainState: null,
    },
    family: 'tree',
  });
  state.visitorIndex = 0;

  while (true) {
    const action = chain.poll() as SynchronousVisitorChainAction<TTP, RW_TTP>;
    switch (action.kind) {
      case 'VISIT': {
        const record = records[action.recordIndex]!;
        state.visitorIndex = action.metadata.visitorIndex;
        const result = record.visitor(
          action.ref.getValue(),
          input.getOptions(record, action.metadata.visitorChainState),
        );
        chain.submit({
          ok: true,
          value: result as import('./graph/types').VisitResult<
            RW_TTP,
            never,
            'tree' | 'dag',
            TTP['VertexHint']
          >,
        });
        state.visitorIndex++;
        break;
      }
      case 'COMMANDS': {
        const result = input.executeCommands(action.commands);
        const halted = input.isHalted();
        chain.commitBatch({
          halt: halted,
          deleted: input.isDeleted(),
          ...(Object.prototype.hasOwnProperty.call(result, 'visitorChainState')
            ? {
                visitorChainState: result.visitorChainState,
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
        state.previousPhaseVertexRef = vertexRef;
        state.phaseVisitIndex++;
        return;
    }
  }
}

export function sortVisitorRecords<
  ORDER extends string,
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
>(
  records: TreeVisitorRecord<ORDER, TTP, RW_TTP>[],
): TreeVisitorRecord<ORDER, TTP, RW_TTP>[];
export function sortVisitorRecords<
  R extends readonly { addedIndex: number; priority: number }[],
>(records: R): R[number][];
export function sortVisitorRecords<
  R extends readonly { addedIndex: number; priority: number }[],
>(records: R): R[number][] {
  return orderVisitorRecords(
    records.map((record) => ({
      ...record,
      ...normalizeVisitorOptions(record),
    })),
  );
}
