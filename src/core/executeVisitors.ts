import type { CTTRef } from './CTTRef';
import type { Vertex } from './Vertex';
import type { TreeTypeParameters } from './TreeTypeParameters';
import type {
  TraversalVisitorCommand,
  TraversalVisitorInputOptions,
  TraversalVisitorRecord,
} from './TraversalVisitor';
import { VisitorChain } from './visitors/VisitorChain';
import type { VisitorChainPoll } from './visitors/types';

type SynchronousVisitorChainAction<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = Exclude<VisitorChainPoll<TTP, RW_TTP>, { kind: 'WAIT' | 'PAUSED' }>;

export type VisitorExecutionState<TTP extends TreeTypeParameters> = {
  vertexVisitIndex: number;
  curVertexVisitorVisitIndex: number;
  previousVisitedVertexRef: CTTRef<Vertex<TTP>> | null;
};

export type VisitorCommandResult = { vertexVisitorsChainState?: unknown };

/** A yielded value is a halt boundary, retaining the rest of the visitor chain. */
export function* executeVisitors<
  ORDER extends string,
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(input: {
  vertexRef: CTTRef<Vertex<TTP | RW_TTP>>;
  records: TraversalVisitorRecord<ORDER, TTP, RW_TTP>[];
  state: VisitorExecutionState<TTP | RW_TTP>;
  getOptions: (
    record: TraversalVisitorRecord<ORDER, TTP, RW_TTP>,
    chainState: unknown,
  ) => TraversalVisitorInputOptions<ORDER, TTP, RW_TTP>;
  executeCommands: (
    commands: TraversalVisitorCommand<RW_TTP>[],
  ) => VisitorCommandResult;
  isHalted: () => boolean;
  isDeleted: () => boolean;
}): Generator<void> {
  const { vertexRef, state } = input;
  const records = input.records.slice();
  const chain = new VisitorChain<TTP, RW_TTP>({
    ref: vertexRef,
    records: records.map(({ addedIndex, priority, resolutionStyle }) => ({
      addedIndex,
      priority,
      resolutionStyle,
    })),
    metadata: {
      ...state,
      vertexVisitorsChainState: null,
    },
    family: 'tree',
  });
  state.curVertexVisitorVisitIndex = 0;

  while (true) {
    const action = chain.poll() as SynchronousVisitorChainAction<TTP, RW_TTP>;
    switch (action.kind) {
      case 'VISIT': {
        const record = records[action.recordIndex]!;
        state.curVertexVisitorVisitIndex =
          action.metadata.curVertexVisitorVisitIndex;
        const result = record.visitor(
          action.ref.unref(),
          input.getOptions(record, action.metadata.vertexVisitorsChainState),
        );
        chain.submit({ ok: true, value: result });
        state.curVertexVisitorVisitIndex++;
        break;
      }
      case 'COMMANDS': {
        const result = input.executeCommands(action.commands);
        const halted = input.isHalted();
        chain.commitBatch({
          halt: halted,
          deleted: input.isDeleted(),
          ...(Object.prototype.hasOwnProperty.call(
            result,
            'vertexVisitorsChainState',
          )
            ? {
                vertexVisitorsChainState: result.vertexVisitorsChainState,
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
        state.previousVisitedVertexRef = vertexRef;
        state.vertexVisitIndex++;
        return;
    }
  }
}

export function sortVisitorRecords<
  ORDER extends string,
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(
  records: TraversalVisitorRecord<ORDER, TTP, RW_TTP>[],
): TraversalVisitorRecord<ORDER, TTP, RW_TTP>[] {
  return records
    .map((record) => ({ ...record }))
    .sort((a, b) => b.priority - a.priority || a.addedIndex - b.addedIndex);
}
