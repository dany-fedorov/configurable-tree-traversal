import type {
  AsyncBreadthFirstTreeRunner,
  AsyncDagTraversalRunner,
  AsyncDepthFirstTreeRunner,
  AsyncGraphWalkRunner,
  AsyncTraversalExecution,
  BreadthFirstTreeRunner,
  DagEvent,
  DagTraversalRunner,
  DepthFirstTreeRunner,
  GraphWalkRunner,
  GraphWalkEvent,
  GraphWalkPhase,
  SyncTraversalExecution,
  TraversalExecutionOptions,
  TreeTraversalEvent,
  VertexTypes,
} from 'configurable-tree-traversal';
import {
  BreadthFirstPhase as BFS,
  DagVisitorPhase as DAG,
  DepthFirstPhase as DFS,
} from 'configurable-tree-traversal';

type Data = VertexTypes<{ value: string }, string>;
type ID = { readonly id: unique symbol };

type Events<E> = Iterable<E> | AsyncIterable<E>;
declare function expectEvents<E>(events: Events<E>): void;
declare const syncTree: DepthFirstTreeRunner<Data>;
declare const asyncTree: AsyncDepthFirstTreeRunner<Data>;
declare const syncTreeCapability: SyncTraversalExecution<
  DFS,
  TreeTraversalEvent<DFS, Data, Data>
>;
declare const asyncTreeCapability: AsyncTraversalExecution<
  DFS,
  TreeTraversalEvent<DFS, Data, Data>
>;
declare const syncBreadth: BreadthFirstTreeRunner<Data>;
declare const asyncBreadth: AsyncBreadthFirstTreeRunner<Data>;
declare const syncDag: DagTraversalRunner<Data, Data, ID>;
declare const asyncDag: AsyncDagTraversalRunner<Data, Data, ID>;
declare const syncDagCapability: SyncTraversalExecution<
  DAG,
  DagEvent<Data, ID>
>;
declare const asyncDagCapability: AsyncTraversalExecution<
  DAG,
  DagEvent<Data, ID>
>;
declare const syncWalk: GraphWalkRunner<Data, string, ID>;
declare const asyncWalk: AsyncGraphWalkRunner<Data, string, ID>;
declare const syncWalkCapability: SyncTraversalExecution<
  GraphWalkPhase,
  GraphWalkEvent<Data, string, ID>
>;
declare const asyncWalkCapability: AsyncTraversalExecution<
  GraphWalkPhase,
  GraphWalkEvent<Data, string, ID>
>;
expectEvents<TreeTraversalEvent<DFS.POST_ORDER, Data, Data>>(
  syncTree.iterateEvents({ emitEvents: [DFS.POST_ORDER] }),
);
expectEvents<never>(syncTree.iterateEvents({ emitEvents: [] }));
// @ts-expect-error Omitted selectors retain policy and stay broad.
expectEvents<{ phase: DFS.POST_ORDER }>(syncTree.iterateEvents());
expectEvents<{ phase: DFS.POST_ORDER }>(
  // @ts-expect-error Undefined selectors retain policy and stay broad.
  syncTree.iterateEvents({ emitEvents: undefined }),
);
expectEvents<TreeTraversalEvent<DFS.POST_ORDER, Data, Data>>(
  asyncTree.iterateEvents({ emitEvents: [DFS.POST_ORDER] }),
);
expectEvents<never>(asyncTree.iterateEvents({ emitEvents: [] }));
// @ts-expect-error Omitted selectors retain policy and stay broad.
expectEvents<{ phase: DFS.POST_ORDER }>(asyncTree.iterateEvents());
expectEvents<{ phase: DFS.POST_ORDER }>(
  // @ts-expect-error Undefined selectors retain policy and stay broad.
  asyncTree.iterateEvents({ emitEvents: undefined }),
);
expectEvents<TreeTraversalEvent<DFS.POST_ORDER, Data, Data>>(
  syncTreeCapability.iterateEvents({ emitEvents: [DFS.POST_ORDER] }),
);
expectEvents<never>(syncTreeCapability.iterateEvents({ emitEvents: [] }));
// @ts-expect-error Omitted selectors retain policy and stay broad.
expectEvents<{ phase: DFS.POST_ORDER }>(syncTreeCapability.iterateEvents());
expectEvents<{ phase: DFS.POST_ORDER }>(
  // @ts-expect-error Undefined selectors retain policy and stay broad.
  syncTreeCapability.iterateEvents({ emitEvents: undefined }),
);
expectEvents<TreeTraversalEvent<DFS.POST_ORDER, Data, Data>>(
  asyncTreeCapability.iterateEvents({ emitEvents: [DFS.POST_ORDER] }),
);
expectEvents<never>(asyncTreeCapability.iterateEvents({ emitEvents: [] }));
// @ts-expect-error Omitted selectors retain policy and stay broad.
expectEvents<{ phase: DFS.POST_ORDER }>(asyncTreeCapability.iterateEvents());
expectEvents<{ phase: DFS.POST_ORDER }>(
  // @ts-expect-error Undefined selectors retain policy and stay broad.
  asyncTreeCapability.iterateEvents({ emitEvents: undefined }),
);
const optional: TraversalExecutionOptions<DFS> = {
  emitEvents: [DFS.POST_ORDER],
};
// @ts-expect-error An optional selection does not guarantee narrowing.
expectEvents<{ phase: DFS.POST_ORDER }>(syncTree.iterateEvents(optional));
expectEvents<never>(syncBreadth.iterateEvents({ emitEvents: [] }));
expectEvents<{ phase: BFS.LEVEL_ORDER }>(
  syncBreadth.iterateEvents({ emitEvents: [BFS.LEVEL_ORDER] }),
);
expectEvents<never>(asyncBreadth.iterateEvents({ emitEvents: [] }));
expectEvents<{ phase: BFS.LEVEL_ORDER }>(
  asyncBreadth.iterateEvents({ emitEvents: [BFS.LEVEL_ORDER] }),
);
expectEvents<DagEvent<Data, ID> & { kind: 'subgraphCompleted' }>(
  syncDag.iterateEvents({ emitEvents: ['subgraphCompleted'] }),
);
// @ts-expect-error Omitted selection stays broad.
expectEvents<{ kind: 'subgraphCompleted' }>(syncDag.iterateEvents());
expectEvents<never>(syncDag.iterateEvents({ emitEvents: [] }));
expectEvents<DagEvent<Data, ID> & { kind: 'subgraphCompleted' }>(
  asyncDag.iterateEvents({ emitEvents: ['subgraphCompleted'] }),
);
// @ts-expect-error Omitted selection stays broad.
expectEvents<{ kind: 'subgraphCompleted' }>(asyncDag.iterateEvents());
expectEvents<never>(asyncDag.iterateEvents({ emitEvents: [] }));
expectEvents<DagEvent<Data, ID> & { kind: 'subgraphCompleted' }>(
  syncDagCapability.iterateEvents({ emitEvents: ['subgraphCompleted'] }),
);
// @ts-expect-error Omitted selection stays broad.
expectEvents<{ kind: 'subgraphCompleted' }>(syncDagCapability.iterateEvents());
expectEvents<never>(syncDagCapability.iterateEvents({ emitEvents: [] }));
expectEvents<DagEvent<Data, ID> & { kind: 'subgraphCompleted' }>(
  asyncDagCapability.iterateEvents({ emitEvents: ['subgraphCompleted'] }),
);
// @ts-expect-error Omitted selection stays broad.
expectEvents<{ kind: 'subgraphCompleted' }>(asyncDagCapability.iterateEvents());
expectEvents<never>(asyncDagCapability.iterateEvents({ emitEvents: [] }));
expectEvents<Extract<GraphWalkEvent<Data, string, ID>, { kind: 'edge' }>>(
  syncWalk.iterateEvents({ emitEvents: ['edge'] }),
);
expectEvents<never>(syncWalk.iterateEvents({ emitEvents: [] }));
expectEvents<Extract<GraphWalkEvent<Data, string, ID>, { kind: 'edge' }>>(
  asyncWalk.iterateEvents({ emitEvents: ['edge'] }),
);
expectEvents<never>(asyncWalk.iterateEvents({ emitEvents: [] }));
expectEvents<Extract<GraphWalkEvent<Data, string, ID>, { kind: 'edge' }>>(
  syncWalkCapability.iterateEvents({ emitEvents: ['edge'] }),
);
expectEvents<never>(syncWalkCapability.iterateEvents({ emitEvents: [] }));
expectEvents<Extract<GraphWalkEvent<Data, string, ID>, { kind: 'edge' }>>(
  asyncWalkCapability.iterateEvents({ emitEvents: ['edge'] }),
);
expectEvents<never>(asyncWalkCapability.iterateEvents({ emitEvents: [] }));

for (const event of syncTree.iterateEvents({ emitEvents: [DFS.POST_ORDER] })) {
  // @ts-expect-error Narrowing must not restore editing authority.
  event.vertexRef.setValue(event.vertex);
}
for (const event of syncWalk.iterateEvents({ emitEvents: ['edge'] })) {
  // @ts-expect-error Narrowing preserves readonly discriminants.
  event.kind = 'edge';
  const data: string = event.edge.data;
  void data;
}
// Heterogeneous families retain no-argument and empty-selection iteration.
declare const mixed: typeof syncTree | typeof asyncDag | typeof syncWalk;
mixed.iterateEvents();
mixed.iterateEvents({ emitEvents: [] });

import type { DagTraversalRunner as DagSubpathRunner } from 'configurable-tree-traversal/traversals/dag-traversal';
import type { SelectedTraversalEvent as CoreSelected } from 'configurable-tree-traversal/core';
declare const subpath: DagSubpathRunner<Data, Data, ID>;
expectEvents<CoreSelected<DagEvent<Data, ID>, 'workCompleted'>>(
  subpath.iterateEvents({ emitEvents: ['workCompleted'] }),
);
