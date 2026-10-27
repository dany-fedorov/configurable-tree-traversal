import { TraversalVisitorCommandName as VisitorCommand } from '../src';
import {
  DagTraversal,
  AsyncDagTraversal,
  DagVisitorPhase as D,
  DepthFirstTreeTraversal,
  AsyncDepthFirstTreeTraversal,
  DepthFirstPhase as F,
  BreadthFirstTreeTraversal,
  AsyncBreadthFirstTreeTraversal,
  BreadthFirstPhase as B,
  TraversalVisitorCommandName as C,
  traverseTreeDepthFirst,
  traverseTreeDepthFirstAsync,
  traverseDag,
  traverseDagAsync,
} from '../src';
import type { VertexTypes, DagVisitor, TraversalVisitorResult } from '../src';
type T = VertexTypes<string, string>;
declare const graph: {
  traversableGraph: import('../src').DagDiscoverySource<T>;
};
declare const tree: { traversableTree: import('../src').TreeSource<T> };
declare const dagOrder: D;
declare const dfsOrder: F;
for (const traversal of [
  new DagTraversal<T>(graph),
  new AsyncDagTraversal<T>(graph),
]) {
  traversal.addVisitorFor(D.ON_WORK_READY, (_vertex, options) => {
    const phase: D.ON_WORK_READY = options.phase;
    void phase;
    return { commands: [{ commandName: C.DEFER_WORK_COMPLETION }] };
  });
  traversal.addVisitorFor(D.ON_SUBGRAPH_READY, () => ({
    // @ts-expect-error Completion cannot defer, including by legacy sentinel.
    commands: [{ commandName: VisitorCommand.DEFER_WORK_COMPLETION as const }],
  }));
  traversal.addVisitorFor(D.ON_SUBGRAPH_READY, () => ({
    // @ts-expect-error Completion cannot defer by command.
    commands: [{ commandName: C.DEFER_WORK_COMPLETION }],
  }));
  traversal.addVisitorFor(dagOrder, () => ({
    // @ts-expect-error A union phase can be completion.
    commands: [{ commandName: C.DEFER_WORK_COMPLETION }],
  }));
  traversal.addVisitorFor(D.ON_WORK_READY, () => ({
    // @ts-expect-error Deferral cannot be combined with another command.
    commands: [
      { commandName: C.DEFER_WORK_COMPLETION },
      { commandName: C.NOOP },
    ],
  }));

  traversal.configure({
    visitors: {
      [D.ON_SUBGRAPH_READY]: [
        {
          priority: 100,
          visitor: () => ({
            commands: [
              // @ts-expect-error Config map controls phase.
              { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
            ],
          }),
        },
      ],
    },
  });
  traversal.setVisitorsFor(D.ON_SUBGRAPH_READY, [
    {
      priority: 100,
      visitor: () => ({
        commands: [
          {
            // @ts-expect-error setVisitorsFor controls phase.
            commandName: C.REWRITE_CHILD_HINTS,
            // @ts-expect-error setVisitorsFor controls phase.
            commandArguments: { newHints: [] },
          },
        ],
      }),
    },
  ]);
}
new DagTraversal<T>(graph).configure({
  visitors: {
    [D.ON_WORK_READY]: [
      {
        priority: 100,
        visitor: (_v, o) => {
          const phase: D.ON_WORK_READY = o.phase;
          void phase;
          return {
            commands: [
              { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
            ],
          };
        },
      },
    ],
  },
});
new AsyncDagTraversal<T>(graph).configure({
  visitors: {
    [D.ON_WORK_READY]: [
      {
        priority: 100,
        visitor: (_v, o) => {
          const phase: D.ON_WORK_READY = o.phase;
          void phase;
          return {
            commands: [
              { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
            ],
          };
        },
      },
    ],
  },
});
for (const traversal of [
  new DepthFirstTreeTraversal<T>(tree),
  new AsyncDepthFirstTreeTraversal<T>(tree),
]) {
  traversal.addVisitorFor(F.PRE_ORDER, (_v, o) => {
    const phase: F.PRE_ORDER = o.phase;
    void phase;
    return {
      commands: [
        {
          commandName: C.REWRITE_CHILD_HINTS,
          commandArguments: { newHints: [] },
        },
      ],
    };
  });
  traversal.addVisitorFor(F.POST_ORDER, () => ({
    commands: [
      {
        // @ts-expect-error Rewrite is forbidden at POST_ORDER.
        commandName: C.REWRITE_CHILD_HINTS,
        // @ts-expect-error Rewrite is forbidden at POST_ORDER.
        commandArguments: { newHints: [] },
      },
    ],
  }));
  traversal.addVisitorFor(dfsOrder, () => ({
    commands: [
      {
        // @ts-expect-error Union phase can be POST_ORDER.
        commandName: C.REWRITE_CHILD_HINTS,
        // @ts-expect-error Union phase can be POST_ORDER.
        commandArguments: { newHints: [] },
      },
    ],
  }));
  traversal.configure({
    visitors: {
      [F.IN_ORDER]: [
        {
          priority: 1,
          visitor: () => ({
            commands: [
              {
                // @ts-expect-error Config map controls phase.
                commandName: C.REWRITE_CHILD_HINTS,
                // @ts-expect-error Config map controls phase.
                commandArguments: { newHints: [] },
              },
            ],
          }),
        },
      ],
    },
  });
  traversal.setVisitorsFor(F.POST_ORDER, [
    {
      priority: 1,
      visitor: () => ({
        commands: [
          {
            // @ts-expect-error setVisitorsFor controls phase.
            commandName: C.REWRITE_CHILD_HINTS,
            // @ts-expect-error setVisitorsFor controls phase.
            commandArguments: { newHints: [] },
          },
        ],
      }),
    },
  ]);
}
for (const traversal of [
  new BreadthFirstTreeTraversal<T>(tree),
  new AsyncBreadthFirstTreeTraversal<T>(tree),
]) {
  traversal.addVisitorFor(B.LEVEL_ORDER, (_v, o) => {
    const phase: B.LEVEL_ORDER = o.phase;
    void phase;
    return {
      commands: [
        {
          commandName: C.REWRITE_CHILD_HINTS,
          commandArguments: { newHints: [] },
        },
      ],
    };
  });
  traversal.addVisitorFor(B.LEVEL_ORDER, () => ({
    // @ts-expect-error Tree callbacks cannot defer.
    commands: [{ commandName: C.DEFER_WORK_COMPLETION }],
  }));
  traversal.configure({
    visitors: {
      [B.LEVEL_ORDER]: [
        {
          priority: 1,
          visitor: () => ({
            // @ts-expect-error Config map controls phase.
            commands: [{ commandName: C.DEFER_WORK_COMPLETION }],
          }),
        },
      ],
    },
  });
  traversal.setVisitorsFor(B.LEVEL_ORDER, [
    {
      priority: 1,
      // @ts-expect-error setVisitorsFor controls phase.
      visitor: () => ({ commands: [{ commandName: C.DEFER_WORK_COMPLETION }] }),
    },
  ]);
}
{
  traverseTreeDepthFirst<T>({
    traversableTree: tree.traversableTree!,
    // @ts-expect-error POST_ORDER cannot rewrite child hints.
    visitors: {
      POST_ORDER: () => ({
        commands: [
          {
            commandName: C.REWRITE_CHILD_HINTS,
            commandArguments: { newHints: [] },
          },
        ],
      }),
    },
  });
}
{
  traverseTreeDepthFirstAsync<T>({
    traversableTree: tree.traversableTree!,
    // @ts-expect-error POST_ORDER cannot rewrite child hints.
    visitors: {
      POST_ORDER: () => ({
        commands: [
          {
            commandName: C.REWRITE_CHILD_HINTS,
            commandArguments: { newHints: [] },
          },
        ],
      }),
    },
  });
}
{
  traverseDag<T>({
    ...graph,
    // @ts-expect-error Simple helper map controls phase.
    visitors: {
      ON_SUBGRAPH_READY: () => ({
        commands: [
          { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
        ],
      }),
    },
  });
}
{
  traverseDagAsync<T>({
    ...graph,
    // @ts-expect-error Simple helper map controls phase.
    visitors: {
      ON_SUBGRAPH_READY: () => ({
        commands: [
          { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
        ],
      }),
    },
  });
}
const commonVisitor: DagVisitor<T> = () => ({
  commands: [{ commandName: C.NOOP }],
});
void commonVisitor;
const broadVisitor: DagVisitor<T> = () => ({
  // @ts-expect-error A broad visitor must be explicitly annotated ON_WORK_READY to defer.
  commands: [{ commandName: VisitorCommand.DEFER_WORK_COMPLETION as const }],
});
void broadVisitor;
const broadResult: TraversalVisitorResult<T> = {
  commands: [
    // @ts-expect-error A result with unknown phase cannot rewrite hints.
    { commandName: C.REWRITE_CHILD_HINTS, commandArguments: { newHints: [] } },
  ],
};
void broadResult;

// Pre-typed callbacks must not hide an invalid phase behind a broader registration.
declare const ready: DagVisitor<T, T, D.ON_WORK_READY>;
declare const pre: import('../src').TraversalVisitor<F.PRE_ORDER, T, T>;
for (const traversal of [
  new DagTraversal<T>(graph),
  new AsyncDagTraversal<T>(graph),
]) {
  // @ts-expect-error The callback requires ON_WORK_READY but the registration can complete.
  traversal.addVisitorFor(dagOrder, ready);
  // @ts-expect-error A narrow callback cannot be registered for another phase.
  traversal.addVisitorFor(D.ON_SUBGRAPH_READY, ready);
  traversal.configure({
    visitors: {
      // @ts-expect-error A pre-typed narrow callback cannot evade map phase restrictions.
      [D.ON_SUBGRAPH_READY]: [{ priority: 1, visitor: ready }],
    },
  });
  traversal.setVisitorsFor(dagOrder, [
    // @ts-expect-error A pre-typed narrow callback cannot evade setVisitorsFor restrictions.
    { priority: 1, visitor: ready },
  ]);
}
for (const traversal of [
  new DepthFirstTreeTraversal<T>(tree),
  new AsyncDepthFirstTreeTraversal<T>(tree),
]) {
  // @ts-expect-error The callback can rewrite hints while the registration can run post-phase.
  traversal.addVisitorFor(dfsOrder, pre);
  traversal.configure({
    visitors: {
      // @ts-expect-error A pre-typed narrow callback cannot evade map phase restrictions.
      [F.POST_ORDER]: [{ priority: 1, visitor: pre }],
    },
  });
  traversal.setVisitorsFor(dfsOrder, [
    // @ts-expect-error A pre-typed narrow callback cannot evade setVisitorsFor restrictions.
    { priority: 1, visitor: pre },
  ]);
}
{
  traverseTreeDepthFirst<T>({
    traversableTree: tree.traversableTree,
    // @ts-expect-error A pre-typed narrow callback cannot evade helper map phase restrictions.
    visitors: { POST_ORDER: pre },
  });
}
{
  traverseTreeDepthFirstAsync<T>({
    traversableTree: tree.traversableTree,
    // @ts-expect-error A pre-typed narrow callback cannot evade helper map phase restrictions.
    visitors: { POST_ORDER: pre },
  });
}
{
  // @ts-expect-error A pre-typed narrow callback cannot evade helper map phase restrictions.
  traverseDag<T>({ ...graph, visitors: { ON_SUBGRAPH_READY: ready } });
}
{
  // @ts-expect-error A pre-typed narrow callback cannot evade helper map phase restrictions.
  traverseDagAsync<T>({ ...graph, visitors: { ON_SUBGRAPH_READY: ready } });
}

new DagTraversal<T>(graph).addVisitorFor(D.ON_WORK_READY, commonVisitor);
const asyncCommon: import('../src').AsyncDagVisitor<T> = async () => ({
  commands: [{ commandName: C.NOOP }],
});
new AsyncDagTraversal<T>(graph).addVisitorFor(D.ON_WORK_READY, asyncCommon);

{
  importedBreadth({
    traversableTree: tree.traversableTree!,
    visitors: {
      LEVEL_ORDER: (_v, options) => {
        const phase: B.LEVEL_ORDER = options.phase;
        void phase;
        return {
          commands: [
            {
              commandName: C.REWRITE_CHILD_HINTS,
              commandArguments: { newHints: [] },
            },
          ],
        };
      },
    },
  });
  // @ts-expect-error Breadth-first helpers cannot defer DAG readiness.
  importedBreadth(tree.traversableTree, () => ({
    commands: [{ commandName: C.DEFER_WORK_COMPLETION }],
  }));
}
{
  importedBreadthAsync({
    traversableTree: tree.traversableTree!,
    visitors: {
      LEVEL_ORDER: (_v, options) => {
        const phase: B.LEVEL_ORDER = options.phase;
        void phase;
        return {
          commands: [
            {
              commandName: C.REWRITE_CHILD_HINTS,
              commandArguments: { newHints: [] },
            },
          ],
        };
      },
    },
  });
  // @ts-expect-error Breadth-first helpers cannot defer DAG readiness.
  importedBreadthAsync(tree.traversableTree, () => ({
    commands: [{ commandName: C.DEFER_WORK_COMPLETION }],
  }));
}
import {
  traverseTreeBreadthFirst as importedBreadth,
  traverseTreeBreadthFirstAsync as importedBreadthAsync,
} from '../src';
new DepthFirstTreeTraversal<T>(tree).configure({
  visitors: {
    [F.PRE_ORDER]: [
      {
        priority: 1,
        visitor: (_v, o) => {
          const phase: F.PRE_ORDER = o.phase;
          void phase;
          return {
            commands: [
              {
                commandName: C.REWRITE_CHILD_HINTS,
                commandArguments: { newHints: [] },
              },
            ],
          };
        },
      },
    ],
  },
});
new AsyncDepthFirstTreeTraversal<T>(tree).configure({
  visitors: {
    [F.PRE_ORDER]: [
      {
        priority: 1,
        visitor: (_v, o) => {
          const phase: F.PRE_ORDER = o.phase;
          void phase;
          return {
            commands: [
              {
                commandName: C.REWRITE_CHILD_HINTS,
                commandArguments: { newHints: [] },
              },
            ],
          };
        },
      },
    ],
  },
});
new DepthFirstTreeTraversal<T>(tree).setVisitorsFor(F.PRE_ORDER, [
  {
    priority: 1,
    visitor: (_v, o) => {
      const phase: F.PRE_ORDER = o.phase;
      void phase;
    },
  },
]);
new AsyncDepthFirstTreeTraversal<T>(tree).setVisitorsFor(F.PRE_ORDER, [
  {
    priority: 1,
    visitor: (_v, o) => {
      const phase: F.PRE_ORDER = o.phase;
      void phase;
    },
  },
]);
new BreadthFirstTreeTraversal<T>(tree).configure({
  visitors: {
    [B.LEVEL_ORDER]: [
      {
        priority: 1,
        visitor: (_v, o) => {
          const phase: B.LEVEL_ORDER = o.phase;
          void phase;
        },
      },
    ],
  },
});
new AsyncBreadthFirstTreeTraversal<T>(tree).configure({
  visitors: {
    [B.LEVEL_ORDER]: [
      {
        priority: 1,
        visitor: (_v, o) => {
          const phase: B.LEVEL_ORDER = o.phase;
          void phase;
        },
      },
    ],
  },
});
new BreadthFirstTreeTraversal<T>(tree).setVisitorsFor(B.LEVEL_ORDER, [
  {
    priority: 1,
    visitor: (_v, o) => {
      const phase: B.LEVEL_ORDER = o.phase;
      void phase;
    },
  },
]);
new AsyncBreadthFirstTreeTraversal<T>(tree).setVisitorsFor(B.LEVEL_ORDER, [
  {
    priority: 1,
    visitor: (_v, o) => {
      const phase: B.LEVEL_ORDER = o.phase;
      void phase;
    },
  },
]);
new DagTraversal<T>(graph).setVisitorsFor(D.ON_WORK_READY, [
  {
    priority: 1,
    visitor: (_v, o) => {
      const phase: D.ON_WORK_READY = o.phase;
      void phase;
      return { commands: [{ commandName: C.DEFER_WORK_COMPLETION }] };
    },
  },
]);
new AsyncDagTraversal<T>(graph).setVisitorsFor(D.ON_WORK_READY, [
  {
    priority: 1,
    visitor: (_v, o) => {
      const phase: D.ON_WORK_READY = o.phase;
      void phase;
      return { commands: [{ commandName: C.DEFER_WORK_COMPLETION }] };
    },
  },
]);

// Match async callback types to async entry points so phase errors cannot be
// masked by the independent sync/async recursive visitor-record distinction.
declare const asyncReady: import('../src').AsyncDagVisitor<
  T,
  T,
  D.ON_WORK_READY
>;
declare const asyncPre: import('../src').AsyncTraversalVisitor<
  F.PRE_ORDER,
  T,
  T
>;
const asyncDag = new AsyncDagTraversal<T>(graph);
const asyncDfs = new AsyncDepthFirstTreeTraversal<T>(tree);
asyncDag.addVisitorFor(D.ON_WORK_READY, asyncReady);
asyncDfs.addVisitorFor(F.PRE_ORDER, asyncPre);
// @ts-expect-error An async ON_WORK_READY callback cannot run at a union phase.
asyncDag.addVisitorFor(dagOrder, asyncReady);
// @ts-expect-error An async PRE_ORDER callback cannot run at a union phase.
asyncDfs.addVisitorFor(dfsOrder, asyncPre);
asyncDag.configure({
  visitors: {
    // @ts-expect-error Async configuration maps preserve phases of pre-typed callbacks.
    [D.ON_SUBGRAPH_READY]: [{ priority: 1, visitor: asyncReady }],
  },
});
asyncDfs.configure({
  visitors: {
    // @ts-expect-error Async configuration maps preserve phases of pre-typed callbacks.
    [F.POST_ORDER]: [{ priority: 1, visitor: asyncPre }],
  },
});
asyncDag.setVisitorsFor(dagOrder, [
  // @ts-expect-error Async replacement maps preserve phases of pre-typed callbacks.
  { priority: 1, visitor: asyncReady },
]);
asyncDfs.setVisitorsFor(dfsOrder, [
  // @ts-expect-error Async replacement maps preserve phases of pre-typed callbacks.
  { priority: 1, visitor: asyncPre },
]);
// @ts-expect-error Async helper maps preserve phases of pre-typed callbacks.
traverseDagAsync({ ...graph, visitors: { ON_SUBGRAPH_READY: asyncReady } });
traverseTreeDepthFirstAsync({
  traversableTree: tree.traversableTree,
  // @ts-expect-error Async helper maps preserve phases of pre-typed callbacks.
  visitors: { POST_ORDER: asyncPre },
});
const defaultTreeVisitor: import('../src').TraversalVisitor = () => ({
  commands: [{ commandName: C.NOOP }],
});
const defaultAsyncVisitor: import('../src').AsyncTraversalVisitor =
  async () => ({ commands: [{ commandName: C.NOOP }] });
void [defaultTreeVisitor, defaultAsyncVisitor];
