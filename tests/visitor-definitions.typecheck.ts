import {
  DagTraversalBuilder,
  AsyncDagTraversalBuilder,
  DepthFirstTreeTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  BreadthFirstTreeTraversalBuilder,
  AsyncBreadthFirstTreeTraversalBuilder,
  DagVisitorPhase as D,
  DepthFirstTreeVisitPhase as F,
  BreadthFirstTreeVisitPhase as B,
  type VisitorDefinitionsForPhase,
  type VisitorGroupMember,
  type DagVisitor,
  type TreeVertexPhaseVisitorCallback,
  type DagDiscoverySource,
  type TreeDiscoverySource,
  traverseDag,
  traverseDagAsync,
  runTreeDepthFirstUntilSuspendedOrTerminal,
  runTreeDepthFirstUntilSuspendedOrTerminalAsync,
  runTreeBreadthFirstUntilSuspendedOrTerminal,
  runTreeBreadthFirstUntilSuspendedOrTerminalAsync,
} from '../src';
type T = {
  VertexData: string;
  ChildHint: string;
};
declare const dagDiscoverySource: DagDiscoverySource<T>;
declare const treeDiscoverySource: TreeDiscoverySource<T>;
const common: DagVisitor<T> = () => undefined;
const ready: VisitorDefinitionsForPhase<DagVisitor<T, T, D.ON_WORK_READY>> = {
  groups: [
    {
      visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const,
      visitors: [
        { visitor: common, descendingExecutionPriorityWithinGroup: 1 },
        common,
      ],
    },
  ],
};
const visitors = { [D.ON_WORK_READY]: ready };
{
  const t = new DagTraversalBuilder({ dagDiscoverySource, visitors });
  t.patchOptionsForFutureRunners({ visitors });
  t.replaceVisitorDefinitionsForPhase(D.ON_WORK_READY, common);
  t.replaceVisitorDefinitionsForPhase(D.ON_WORK_READY, { visitor: common });
  t.replaceVisitorDefinitionsForPhase(D.ON_WORK_READY, [common]);
  t.replaceVisitorDefinitionsForPhase(
    D.ON_WORK_READY,
    t.getDetachedVisitorRegistrationRecordsForPhase(D.ON_WORK_READY),
  );
  t.appendVisitorGroupForPhase(D.ON_WORK_READY, { visitors: [common] });
}
{
  const t = new AsyncDagTraversalBuilder({ dagDiscoverySource, visitors });
  t.patchOptionsForFutureRunners({ visitors });
  t.replaceVisitorDefinitionsForPhase(D.ON_WORK_READY, common);
  t.replaceVisitorDefinitionsForPhase(D.ON_WORK_READY, { visitor: common });
  t.replaceVisitorDefinitionsForPhase(D.ON_WORK_READY, [common]);
  t.replaceVisitorDefinitionsForPhase(
    D.ON_WORK_READY,
    t.getDetachedVisitorRegistrationRecordsForPhase(D.ON_WORK_READY),
  );
  t.appendVisitorGroupForPhase(D.ON_WORK_READY, { visitors: [common] });
}
traverseDag({ dagDiscoverySource, visitors });
traverseDagAsync({ dagDiscoverySource, visitors });
const treeCommon: TreeVertexPhaseVisitorCallback<T, T, string> = () =>
  undefined;
const dfs = {
  [F.BEFORE_CHILD_EXPANSION]: { groups: [{ visitors: [treeCommon] }] },
};
{
  const t = new DepthFirstTreeTraversalBuilder({
    treeDiscoverySource,
    visitors: dfs,
  });
  t.patchOptionsForFutureRunners({ visitors: dfs });
  t.replaceVisitorDefinitionsForPhase(F.BEFORE_CHILD_EXPANSION, treeCommon);
  t.replaceVisitorDefinitionsForPhase(
    F.BEFORE_CHILD_EXPANSION,
    t.getDetachedVisitorRegistrationRecordsForPhase(F.BEFORE_CHILD_EXPANSION),
  );
  t.appendVisitorGroupForPhase(F.BEFORE_CHILD_EXPANSION, {
    visitors: [treeCommon],
  });
}
{
  const t = new AsyncDepthFirstTreeTraversalBuilder({
    treeDiscoverySource,
    visitors: dfs,
  });
  t.patchOptionsForFutureRunners({ visitors: dfs });
  t.replaceVisitorDefinitionsForPhase(F.BEFORE_CHILD_EXPANSION, treeCommon);
  t.replaceVisitorDefinitionsForPhase(
    F.BEFORE_CHILD_EXPANSION,
    t.getDetachedVisitorRegistrationRecordsForPhase(F.BEFORE_CHILD_EXPANSION),
  );
  t.appendVisitorGroupForPhase(F.BEFORE_CHILD_EXPANSION, {
    visitors: [treeCommon],
  });
}
runTreeDepthFirstUntilSuspendedOrTerminal({
  treeDiscoverySource,
  visitors: dfs,
});
runTreeDepthFirstUntilSuspendedOrTerminalAsync({
  treeDiscoverySource,
  visitors: dfs,
});
const bfs = { [B.AT_LEVEL_ORDER_VERTEX]: { visitor: treeCommon } };
{
  const t = new BreadthFirstTreeTraversalBuilder({
    treeDiscoverySource,
    visitors: bfs,
  });
  t.patchOptionsForFutureRunners({ visitors: bfs });
  t.replaceVisitorDefinitionsForPhase(B.AT_LEVEL_ORDER_VERTEX, treeCommon);
  t.replaceVisitorDefinitionsForPhase(
    B.AT_LEVEL_ORDER_VERTEX,
    t.getDetachedVisitorRegistrationRecordsForPhase(B.AT_LEVEL_ORDER_VERTEX),
  );
  t.appendVisitorGroupForPhase(B.AT_LEVEL_ORDER_VERTEX, {
    visitors: [treeCommon],
  });
}
{
  const t = new AsyncBreadthFirstTreeTraversalBuilder({
    treeDiscoverySource,
    visitors: bfs,
  });
  t.patchOptionsForFutureRunners({ visitors: bfs });
  t.replaceVisitorDefinitionsForPhase(B.AT_LEVEL_ORDER_VERTEX, treeCommon);
  t.replaceVisitorDefinitionsForPhase(
    B.AT_LEVEL_ORDER_VERTEX,
    t.getDetachedVisitorRegistrationRecordsForPhase(B.AT_LEVEL_ORDER_VERTEX),
  );
  t.appendVisitorGroupForPhase(B.AT_LEVEL_ORDER_VERTEX, {
    visitors: [treeCommon],
  });
}
runTreeBreadthFirstUntilSuspendedOrTerminal({
  treeDiscoverySource,
  visitors: bfs,
});
runTreeBreadthFirstUntilSuspendedOrTerminalAsync({
  treeDiscoverySource,
  visitors: bfs,
});
const bad: VisitorGroupMember<DagVisitor<T>> = {
  visitor: common,
  // @ts-expect-error Explicit group owns commit policy.
  visitorCommandCommitTiming: 'afterGroup' as const,
};
void bad;
declare const narrow: DagVisitor<T, T, D.ON_WORK_READY>;
declare const phase: D;
const t = new DagTraversalBuilder({ dagDiscoverySource });
// @ts-expect-error Union phases cannot accept a ready-only callback.
t.replaceVisitorDefinitionsForPhase(phase, narrow);
t.appendVisitorGroupForPhase(D.ON_SUBGRAPH_COMPLETION_READY, {
  // @ts-expect-error Group members remain phase safe.
  visitors: [narrow],
});
t.replaceVisitorDefinitionsForPhase(
  phase,
  // @ts-expect-error List producer at a union phase cannot narrow its callbacks.
  t.getDetachedVisitorRegistrationRecordsForPhase(phase),
);
// Definition and group callbacks infer their literal phase at each concrete public boundary.
{
  const traversal = new DepthFirstTreeTraversalBuilder<T>({
    treeDiscoverySource,
    visitors: {
      [F.BEFORE_CHILD_EXPANSION]: (_v, o) => {
        const p: F.BEFORE_CHILD_EXPANSION = o.visitorPhase;
        void p;
      },
    },
  });
  traversal.patchOptionsForFutureRunners({
    visitors: {
      [F.BEFORE_CHILD_EXPANSION]: {
        visitor: (_v, o) => {
          const p: F.BEFORE_CHILD_EXPANSION = o.visitorPhase;
          void p;
        },
      },
    },
  });
  traversal.replaceVisitorDefinitionsForPhase(F.BEFORE_CHILD_EXPANSION, [
    (_v, o) => {
      const p: F.BEFORE_CHILD_EXPANSION = o.visitorPhase;
      void p;
    },
  ]);
  traversal.appendVisitorGroupForPhase(F.BEFORE_CHILD_EXPANSION, {
    visitors: [
      {
        visitor: (_v, o) => {
          const p: F.BEFORE_CHILD_EXPANSION = o.visitorPhase;
          void p;
        },
      },
    ],
  });
  runTreeDepthFirstUntilSuspendedOrTerminal({
    treeDiscoverySource,
    visitors: {
      [F.BEFORE_CHILD_EXPANSION]: {
        groups: [
          {
            visitors: [
              (_v, o) => {
                const p: F.BEFORE_CHILD_EXPANSION = o.visitorPhase;
                void p;
              },
            ],
          },
        ],
      },
    },
  });
}
{
  const traversal = new AsyncDepthFirstTreeTraversalBuilder<T>({
    treeDiscoverySource,
    visitors: {
      [F.BEFORE_CHILD_EXPANSION]: (_v, o) => {
        const p: F.BEFORE_CHILD_EXPANSION = o.visitorPhase;
        void p;
      },
    },
  });
  traversal.patchOptionsForFutureRunners({
    visitors: {
      [F.BEFORE_CHILD_EXPANSION]: {
        visitor: (_v, o) => {
          const p: F.BEFORE_CHILD_EXPANSION = o.visitorPhase;
          void p;
        },
      },
    },
  });
  traversal.replaceVisitorDefinitionsForPhase(F.BEFORE_CHILD_EXPANSION, [
    (_v, o) => {
      const p: F.BEFORE_CHILD_EXPANSION = o.visitorPhase;
      void p;
    },
  ]);
  traversal.appendVisitorGroupForPhase(F.BEFORE_CHILD_EXPANSION, {
    visitors: [
      {
        visitor: (_v, o) => {
          const p: F.BEFORE_CHILD_EXPANSION = o.visitorPhase;
          void p;
        },
      },
    ],
  });
  runTreeDepthFirstUntilSuspendedOrTerminalAsync({
    treeDiscoverySource,
    visitors: {
      [F.BEFORE_CHILD_EXPANSION]: {
        groups: [
          {
            visitors: [
              (_v, o) => {
                const p: F.BEFORE_CHILD_EXPANSION = o.visitorPhase;
                void p;
              },
            ],
          },
        ],
      },
    },
  });
}
{
  const traversal = new BreadthFirstTreeTraversalBuilder<T>({
    treeDiscoverySource,
    visitors: {
      [B.AT_LEVEL_ORDER_VERTEX]: (_v, o) => {
        const p: B.AT_LEVEL_ORDER_VERTEX = o.visitorPhase;
        void p;
      },
    },
  });
  traversal.patchOptionsForFutureRunners({
    visitors: {
      [B.AT_LEVEL_ORDER_VERTEX]: {
        visitor: (_v, o) => {
          const p: B.AT_LEVEL_ORDER_VERTEX = o.visitorPhase;
          void p;
        },
      },
    },
  });
  traversal.replaceVisitorDefinitionsForPhase(B.AT_LEVEL_ORDER_VERTEX, [
    (_v, o) => {
      const p: B.AT_LEVEL_ORDER_VERTEX = o.visitorPhase;
      void p;
    },
  ]);
  traversal.appendVisitorGroupForPhase(B.AT_LEVEL_ORDER_VERTEX, {
    visitors: [
      {
        visitor: (_v, o) => {
          const p: B.AT_LEVEL_ORDER_VERTEX = o.visitorPhase;
          void p;
        },
      },
    ],
  });
  runTreeBreadthFirstUntilSuspendedOrTerminal({
    treeDiscoverySource,
    visitors: {
      [B.AT_LEVEL_ORDER_VERTEX]: {
        groups: [
          {
            visitors: [
              (_v, o) => {
                const p: B.AT_LEVEL_ORDER_VERTEX = o.visitorPhase;
                void p;
              },
            ],
          },
        ],
      },
    },
  });
}
{
  const traversal = new AsyncBreadthFirstTreeTraversalBuilder<T>({
    treeDiscoverySource,
    visitors: {
      [B.AT_LEVEL_ORDER_VERTEX]: (_v, o) => {
        const p: B.AT_LEVEL_ORDER_VERTEX = o.visitorPhase;
        void p;
      },
    },
  });
  traversal.patchOptionsForFutureRunners({
    visitors: {
      [B.AT_LEVEL_ORDER_VERTEX]: {
        visitor: (_v, o) => {
          const p: B.AT_LEVEL_ORDER_VERTEX = o.visitorPhase;
          void p;
        },
      },
    },
  });
  traversal.replaceVisitorDefinitionsForPhase(B.AT_LEVEL_ORDER_VERTEX, [
    (_v, o) => {
      const p: B.AT_LEVEL_ORDER_VERTEX = o.visitorPhase;
      void p;
    },
  ]);
  traversal.appendVisitorGroupForPhase(B.AT_LEVEL_ORDER_VERTEX, {
    visitors: [
      {
        visitor: (_v, o) => {
          const p: B.AT_LEVEL_ORDER_VERTEX = o.visitorPhase;
          void p;
        },
      },
    ],
  });
  runTreeBreadthFirstUntilSuspendedOrTerminalAsync({
    treeDiscoverySource,
    visitors: {
      [B.AT_LEVEL_ORDER_VERTEX]: {
        groups: [
          {
            visitors: [
              (_v, o) => {
                const p: B.AT_LEVEL_ORDER_VERTEX = o.visitorPhase;
                void p;
              },
            ],
          },
        ],
      },
    },
  });
}
{
  const traversal = new DagTraversalBuilder<T>({
    dagDiscoverySource,
    visitors: {
      [D.ON_WORK_READY]: (_v, o) => {
        const p: D.ON_WORK_READY = o.visitorPhase;
        void p;
      },
    },
  });
  traversal.patchOptionsForFutureRunners({
    visitors: {
      [D.ON_WORK_READY]: {
        visitor: (_v, o) => {
          const p: D.ON_WORK_READY = o.visitorPhase;
          void p;
        },
      },
    },
  });
  traversal.replaceVisitorDefinitionsForPhase(D.ON_WORK_READY, [
    (_v, o) => {
      const p: D.ON_WORK_READY = o.visitorPhase;
      void p;
    },
  ]);
  traversal.appendVisitorGroupForPhase(D.ON_WORK_READY, {
    visitors: [
      {
        visitor: (_v, o) => {
          const p: D.ON_WORK_READY = o.visitorPhase;
          void p;
        },
      },
    ],
  });
  traverseDag({
    dagDiscoverySource,
    visitors: {
      [D.ON_WORK_READY]: {
        groups: [
          {
            visitors: [
              (_v, o) => {
                const p: D.ON_WORK_READY = o.visitorPhase;
                void p;
              },
            ],
          },
        ],
      },
    },
  });
}
{
  const traversal = new AsyncDagTraversalBuilder<T>({
    dagDiscoverySource,
    visitors: {
      [D.ON_WORK_READY]: (_v, o) => {
        const p: D.ON_WORK_READY = o.visitorPhase;
        void p;
      },
    },
  });
  traversal.patchOptionsForFutureRunners({
    visitors: {
      [D.ON_WORK_READY]: {
        visitor: (_v, o) => {
          const p: D.ON_WORK_READY = o.visitorPhase;
          void p;
        },
      },
    },
  });
  traversal.replaceVisitorDefinitionsForPhase(D.ON_WORK_READY, [
    (_v, o) => {
      const p: D.ON_WORK_READY = o.visitorPhase;
      void p;
    },
  ]);
  traversal.appendVisitorGroupForPhase(D.ON_WORK_READY, {
    visitors: [
      {
        visitor: (_v, o) => {
          const p: D.ON_WORK_READY = o.visitorPhase;
          void p;
        },
      },
    ],
  });
  traverseDagAsync({
    dagDiscoverySource,
    visitors: {
      [D.ON_WORK_READY]: {
        groups: [
          {
            visitors: [
              (_v, o) => {
                const p: D.ON_WORK_READY = o.visitorPhase;
                void p;
              },
            ],
          },
        ],
      },
    },
  });
}
const legacyBatchMember: VisitorGroupMember<DagVisitor<T>> = {
  visitor: common,
  // @ts-expect-error Explicit groups also forbid deprecated member batching.
  visitorCommandCommitTiming: 'afterGroup' as const,
};
void legacyBatchMember;
declare const asyncNarrow: import('../src').AsyncDagVisitor<
  T,
  T,
  D.ON_WORK_READY
>;
const at = new AsyncDagTraversalBuilder({ dagDiscoverySource });
// @ts-expect-error Async groups reject union-phase ready-only callbacks.
at.appendVisitorGroupForPhase(phase, { visitors: [asyncNarrow] });
at.replaceVisitorDefinitionsForPhase(
  phase,
  // @ts-expect-error Async list producer cannot turn a phase union into a safe union callback.
  at.getDetachedVisitorRegistrationRecordsForPhase(phase),
);
t.appendVisitorGroupForPhase(D.ON_WORK_READY, {
  // @ts-expect-error Full normalized records are sequences, not members of a new explicit group.
  visitors: t.getDetachedVisitorRegistrationRecordsForPhase(D.ON_WORK_READY),
});
traverseDag({
  dagDiscoverySource,
  visitors: {
    // @ts-expect-error Canonical helper groups preserve phase restrictions.
    [D.ON_SUBGRAPH_COMPLETION_READY]: { groups: [{ visitors: [narrow] }] },
  },
});
