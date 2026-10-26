import {
  DagTraversal,
  AsyncDagTraversal,
  DepthFirstTreeTraversal,
  AsyncDepthFirstTreeTraversal,
  BreadthFirstTreeTraversal,
  AsyncBreadthFirstTreeTraversal,
  DagTraversalOrder as D,
  DepthFirstTraversalOrder as F,
  BreadthFirstTraversalOrder as B,
  type VisitorPhaseInput,
  type VisitorGroupMember,
  type DagVisitor,
  type TraversalVisitor,
  type DagDiscoverySource,
  type TreeSource,
  traverseDag,
  traverseDagAsync,
  traverseTreeDepthFirst,
  traverseTreeDepthFirstAsync,
  traverseTreeBreadthFirst,
  traverseTreeBreadthFirstAsync,
} from '../src';
type T = { VertexData: string; VertexHint: string };
declare const traversableGraph: DagDiscoverySource<T>;
declare const traversableTree: TreeSource<T>;
const common: DagVisitor<T> = () => undefined;
const ready: VisitorPhaseInput<DagVisitor<T, T, D.ON_READY>> = {
  groups: [
    {
      commandCommitMode: 'afterGroup',
      visitors: [{ visitor: common, priority: 1 }, common],
    },
  ],
};
const visitors = { [D.ON_READY]: ready };
{
  const t = new DagTraversal({ traversableGraph, visitors });
  t.configure({ visitors });
  t.setVisitorsFor(D.ON_READY, common);
  t.setVisitorsFor(D.ON_READY, { visitor: common });
  t.setVisitorsFor(D.ON_READY, [common]);
  t.setVisitorsFor(D.ON_READY, t.listVisitorsFor(D.ON_READY));
  t.addVisitorGroupFor(D.ON_READY, { visitors: [common] });
}
{
  const t = new AsyncDagTraversal({ traversableGraph, visitors });
  t.configure({ visitors });
  t.setVisitorsFor(D.ON_READY, common);
  t.setVisitorsFor(D.ON_READY, { visitor: common });
  t.setVisitorsFor(D.ON_READY, [common]);
  t.setVisitorsFor(D.ON_READY, t.listVisitorsFor(D.ON_READY));
  t.addVisitorGroupFor(D.ON_READY, { visitors: [common] });
}
traverseDag({ traversableGraph, visitors });
traverseDagAsync({ traversableGraph, visitors });
const treeCommon: TraversalVisitor<string, T, T> = () => undefined;
const dfs = { [F.PRE_ORDER]: { groups: [{ visitors: [treeCommon] }] } };
{
  const t = new DepthFirstTreeTraversal({ traversableTree, visitors: dfs });
  t.configure({ visitors: dfs });
  t.setVisitorsFor(F.PRE_ORDER, treeCommon);
  t.setVisitorsFor(F.PRE_ORDER, t.listVisitorsFor(F.PRE_ORDER));
  t.addVisitorGroupFor(F.PRE_ORDER, { visitors: [treeCommon] });
}
{
  const t = new AsyncDepthFirstTreeTraversal({ traversableTree, visitors: dfs });
  t.configure({ visitors: dfs });
  t.setVisitorsFor(F.PRE_ORDER, treeCommon);
  t.setVisitorsFor(F.PRE_ORDER, t.listVisitorsFor(F.PRE_ORDER));
  t.addVisitorGroupFor(F.PRE_ORDER, { visitors: [treeCommon] });
}
traverseTreeDepthFirst({ traversableTree, visitors: dfs });
traverseTreeDepthFirstAsync({ traversableTree, visitors: dfs });
const bfs = { [B.LEVEL_ORDER]: { visitor: treeCommon } };
{
  const t = new BreadthFirstTreeTraversal({ traversableTree, visitors: bfs });
  t.configure({ visitors: bfs });
  t.setVisitorsFor(B.LEVEL_ORDER, treeCommon);
  t.setVisitorsFor(B.LEVEL_ORDER, t.listVisitorsFor(B.LEVEL_ORDER));
  t.addVisitorGroupFor(B.LEVEL_ORDER, { visitors: [treeCommon] });
}
{
  const t = new AsyncBreadthFirstTreeTraversal({ traversableTree, visitors: bfs });
  t.configure({ visitors: bfs });
  t.setVisitorsFor(B.LEVEL_ORDER, treeCommon);
  t.setVisitorsFor(B.LEVEL_ORDER, t.listVisitorsFor(B.LEVEL_ORDER));
  t.addVisitorGroupFor(B.LEVEL_ORDER, { visitors: [treeCommon] });
}
traverseTreeBreadthFirst({ traversableTree, visitors: bfs });
traverseTreeBreadthFirstAsync({ traversableTree, visitors: bfs });
const bad: VisitorGroupMember<DagVisitor<T>> = {
  visitor: common,
  // @ts-expect-error Explicit group owns commit policy.
  commandCommitMode: 'afterGroup',
};
void bad;
declare const narrow: DagVisitor<T, T, D.ON_READY>;
declare const phase: D;
const t = new DagTraversal({ traversableGraph });
// @ts-expect-error Union phases cannot accept a ready-only callback.
t.setVisitorsFor(phase, narrow);
// @ts-expect-error Group members remain phase safe.
t.addVisitorGroupFor(D.ON_COMPLETE, { visitors: [narrow] });
// @ts-expect-error List producer at a union phase cannot narrow its callbacks.
t.setVisitorsFor(phase, t.listVisitorsFor(phase));

// Definition and group callbacks infer their literal phase at each concrete public boundary.
{
  const traversal = new DepthFirstTreeTraversal<T>({
    traversableTree,
    visitors: {
      [F.PRE_ORDER]: (_v, o) => {
        const p: F.PRE_ORDER = o.order;
        void p;
      },
    },
  });
  traversal.configure({
    visitors: {
      [F.PRE_ORDER]: {
        visitor: (_v, o) => {
          const p: F.PRE_ORDER = o.order;
          void p;
        },
      },
    },
  });
  traversal.setVisitorsFor(F.PRE_ORDER, [
    (_v, o) => {
      const p: F.PRE_ORDER = o.order;
      void p;
    },
  ]);
  traversal.addVisitorGroupFor(F.PRE_ORDER, {
    visitors: [
      {
        visitor: (_v, o) => {
          const p: F.PRE_ORDER = o.order;
          void p;
        },
      },
    ],
  });
  traverseTreeDepthFirst({
    traversableTree,
    visitors: {
      [F.PRE_ORDER]: {
        groups: [
          {
            visitors: [
              (_v, o) => {
                const p: F.PRE_ORDER = o.order;
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
  const traversal = new AsyncDepthFirstTreeTraversal<T>({
    traversableTree,
    visitors: {
      [F.PRE_ORDER]: (_v, o) => {
        const p: F.PRE_ORDER = o.order;
        void p;
      },
    },
  });
  traversal.configure({
    visitors: {
      [F.PRE_ORDER]: {
        visitor: (_v, o) => {
          const p: F.PRE_ORDER = o.order;
          void p;
        },
      },
    },
  });
  traversal.setVisitorsFor(F.PRE_ORDER, [
    (_v, o) => {
      const p: F.PRE_ORDER = o.order;
      void p;
    },
  ]);
  traversal.addVisitorGroupFor(F.PRE_ORDER, {
    visitors: [
      {
        visitor: (_v, o) => {
          const p: F.PRE_ORDER = o.order;
          void p;
        },
      },
    ],
  });
  traverseTreeDepthFirstAsync({
    traversableTree,
    visitors: {
      [F.PRE_ORDER]: {
        groups: [
          {
            visitors: [
              (_v, o) => {
                const p: F.PRE_ORDER = o.order;
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
  const traversal = new BreadthFirstTreeTraversal<T>({
    traversableTree,
    visitors: {
      [B.LEVEL_ORDER]: (_v, o) => {
        const p: B.LEVEL_ORDER = o.order;
        void p;
      },
    },
  });
  traversal.configure({
    visitors: {
      [B.LEVEL_ORDER]: {
        visitor: (_v, o) => {
          const p: B.LEVEL_ORDER = o.order;
          void p;
        },
      },
    },
  });
  traversal.setVisitorsFor(B.LEVEL_ORDER, [
    (_v, o) => {
      const p: B.LEVEL_ORDER = o.order;
      void p;
    },
  ]);
  traversal.addVisitorGroupFor(B.LEVEL_ORDER, {
    visitors: [
      {
        visitor: (_v, o) => {
          const p: B.LEVEL_ORDER = o.order;
          void p;
        },
      },
    ],
  });
  traverseTreeBreadthFirst({
    traversableTree,
    visitors: {
      [B.LEVEL_ORDER]: {
        groups: [
          {
            visitors: [
              (_v, o) => {
                const p: B.LEVEL_ORDER = o.order;
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
  const traversal = new AsyncBreadthFirstTreeTraversal<T>({
    traversableTree,
    visitors: {
      [B.LEVEL_ORDER]: (_v, o) => {
        const p: B.LEVEL_ORDER = o.order;
        void p;
      },
    },
  });
  traversal.configure({
    visitors: {
      [B.LEVEL_ORDER]: {
        visitor: (_v, o) => {
          const p: B.LEVEL_ORDER = o.order;
          void p;
        },
      },
    },
  });
  traversal.setVisitorsFor(B.LEVEL_ORDER, [
    (_v, o) => {
      const p: B.LEVEL_ORDER = o.order;
      void p;
    },
  ]);
  traversal.addVisitorGroupFor(B.LEVEL_ORDER, {
    visitors: [
      {
        visitor: (_v, o) => {
          const p: B.LEVEL_ORDER = o.order;
          void p;
        },
      },
    ],
  });
  traverseTreeBreadthFirstAsync({
    traversableTree,
    visitors: {
      [B.LEVEL_ORDER]: {
        groups: [
          {
            visitors: [
              (_v, o) => {
                const p: B.LEVEL_ORDER = o.order;
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
  const traversal = new DagTraversal<T>({
    traversableGraph,
    visitors: {
      [D.ON_READY]: (_v, o) => {
        const p: D.ON_READY = o.order;
        void p;
      },
    },
  });
  traversal.configure({
    visitors: {
      [D.ON_READY]: {
        visitor: (_v, o) => {
          const p: D.ON_READY = o.order;
          void p;
        },
      },
    },
  });
  traversal.setVisitorsFor(D.ON_READY, [
    (_v, o) => {
      const p: D.ON_READY = o.order;
      void p;
    },
  ]);
  traversal.addVisitorGroupFor(D.ON_READY, {
    visitors: [
      {
        visitor: (_v, o) => {
          const p: D.ON_READY = o.order;
          void p;
        },
      },
    ],
  });
  traverseDag({
    traversableGraph,
    visitors: {
      [D.ON_READY]: {
        groups: [
          {
            visitors: [
              (_v, o) => {
                const p: D.ON_READY = o.order;
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
  const traversal = new AsyncDagTraversal<T>({
    traversableGraph,
    visitors: {
      [D.ON_READY]: (_v, o) => {
        const p: D.ON_READY = o.order;
        void p;
      },
    },
  });
  traversal.configure({
    visitors: {
      [D.ON_READY]: {
        visitor: (_v, o) => {
          const p: D.ON_READY = o.order;
          void p;
        },
      },
    },
  });
  traversal.setVisitorsFor(D.ON_READY, [
    (_v, o) => {
      const p: D.ON_READY = o.order;
      void p;
    },
  ]);
  traversal.addVisitorGroupFor(D.ON_READY, {
    visitors: [
      {
        visitor: (_v, o) => {
          const p: D.ON_READY = o.order;
          void p;
        },
      },
    ],
  });
  traverseDagAsync({
    traversableGraph,
    visitors: {
      [D.ON_READY]: {
        groups: [
          {
            visitors: [
              (_v, o) => {
                const p: D.ON_READY = o.order;
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
  resolutionStyle: 'CONCURRENT',
};
void legacyBatchMember;
declare const asyncNarrow: import('../src').AsyncDagVisitor<T, T, D.ON_READY>;
const at = new AsyncDagTraversal({ traversableGraph });
// @ts-expect-error Async groups reject union-phase ready-only callbacks.
at.addVisitorGroupFor(phase, { visitors: [asyncNarrow] });
// @ts-expect-error Async list producer cannot turn a phase union into a safe union callback.
at.setVisitorsFor(phase, at.listVisitorsFor(phase));
// @ts-expect-error Full normalized records are sequences, not members of a new explicit group.
t.addVisitorGroupFor(D.ON_READY, { visitors: t.listVisitorsFor(D.ON_READY) });
traverseDag({
  traversableGraph,
  // @ts-expect-error Canonical helper groups preserve phase restrictions.
  visitors: { [D.ON_COMPLETE]: { groups: [{ visitors: [narrow] }] } },
});
