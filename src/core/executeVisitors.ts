import type { CTTRef } from './CTTRef';
import type { Vertex } from './Vertex';
import type { TreeTypeParameters } from './TreeTypeParameters';
import {
  TraversalVisitorFunctionResolutionStyle,
  type TraversalVisitorCommand,
  type TraversalVisitorInputOptions,
  type TraversalVisitorRecord,
} from './TraversalVisitor';

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
  const concurrent = input.records.filter(
    (r) =>
      r.resolutionStyle === TraversalVisitorFunctionResolutionStyle.CONCURRENT,
  );
  const sequential = input.records.filter(
    (r) =>
      r.resolutionStyle === TraversalVisitorFunctionResolutionStyle.SEQUENTIAL,
  );
  if (concurrent.length + sequential.length !== input.records.length) {
    throw new TypeError('Unknown visitor resolution style');
  }
  state.curVertexVisitorVisitIndex = 0;
  const commands: TraversalVisitorCommand<RW_TTP>[] = [];
  for (const record of concurrent) {
    const result = record.visitor(
      vertexRef.unref(),
      input.getOptions(record, null),
    );
    for (const command of result?.commands ?? []) commands.push(command);
    state.curVertexVisitorVisitIndex++;
  }
  const concurrentResult = input.executeCommands(commands);
  let chainState: unknown = Object.prototype.hasOwnProperty.call(
    concurrentResult,
    'vertexVisitorsChainState',
  )
    ? concurrentResult.vertexVisitorsChainState
    : null;
  if (input.isHalted()) yield;
  for (const record of sequential) {
    if (input.isDeleted()) break;
    const result = record.visitor(
      vertexRef.unref(),
      input.getOptions(record, chainState),
    );
    state.curVertexVisitorVisitIndex++;
    const commandResult = input.executeCommands(result?.commands ?? []);
    if (
      Object.prototype.hasOwnProperty.call(
        commandResult,
        'vertexVisitorsChainState',
      )
    ) {
      chainState = commandResult.vertexVisitorsChainState;
    }
    if (input.isHalted()) yield;
  }
  state.previousVisitedVertexRef = vertexRef;
  state.vertexVisitIndex++;
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
