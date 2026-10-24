import {
  DagTraversal,
  AsyncDagTraversal,
  DagTraversalOrder as D,
  DepthFirstTraversal,
  AsyncDepthFirstTraversal,
  DepthFirstTraversalOrder as F,
  BreadthFirstTraversal,
  AsyncBreadthFirstTraversal,
  BreadthFirstTraversalOrder as B,
  TraversalVisitorCommandName as C,
  DEFER_READY,
  traverseDepthFirst,
  traverseDepthFirstAsync,
  traverseDag,
  traverseDagAsync,
} from '../src';
import type {
  TreeTypeParameters,
  DagVisitor,
  TraversalVisitorResult,
} from '../src';
type T = TreeTypeParameters<string, string>;
declare const graph: { traversableGraph: import('../src').TraversableGraph<T> };
declare const tree: { traversableTree: import('../src').TraversableTree<T> };
declare const dagOrder: D;
declare const dfsOrder: F;
for (const traversal of [
  new DagTraversal<T>(graph),
  new AsyncDagTraversal<T>(graph),
]) {
  traversal.addVisitorFor(D.ON_READY, (_vertex, options) => {
    const order: D.ON_READY = options.order;
    void order;
    return { commands: [{ commandName: C.DEFER_READY }] };
  });
  // @ts-expect-error Completion cannot defer, including by legacy sentinel.
  traversal.addVisitorFor(D.ON_COMPLETE, () => DEFER_READY);
  traversal.addVisitorFor(D.ON_COMPLETE, () => ({
    // @ts-expect-error Completion cannot defer by command.
    commands: [{ commandName: C.DEFER_READY }],
  }));
  traversal.addVisitorFor(dagOrder, () => ({
    // @ts-expect-error A union order can be completion.
    commands: [{ commandName: C.DEFER_READY }],
  }));
  traversal.addVisitorFor(D.ON_READY, () => ({
    // @ts-expect-error Deferral cannot be combined with another command.
    commands: [{ commandName: C.DEFER_READY }, { commandName: C.NOOP }],
  }));

  traversal.configure({
    visitors: {
      [D.ON_COMPLETE]: [
        // @ts-expect-error Config map controls phase.
        { addedIndex: 0, priority: 100, visitor: () => DEFER_READY },
      ],
    },
  });
  traversal.setVisitorsFor(D.ON_COMPLETE, [
    {
      addedIndex: 0,
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
    [D.ON_READY]: [
      {
        addedIndex: 0,
        priority: 100,
        visitor: (_v, o) => {
          const phase: D.ON_READY = o.order;
          void phase;
          return DEFER_READY;
        },
      },
    ],
  },
});
new AsyncDagTraversal<T>(graph).configure({
  visitors: {
    [D.ON_READY]: [
      {
        addedIndex: 0,
        priority: 100,
        visitor: (_v, o) => {
          const phase: D.ON_READY = o.order;
          void phase;
          return DEFER_READY;
        },
      },
    ],
  },
});
for (const traversal of [
  new DepthFirstTraversal<T>(tree),
  new AsyncDepthFirstTraversal<T>(tree),
]) {
  traversal.addVisitorFor(F.PRE_ORDER, (_v, o) => {
    const phase: F.PRE_ORDER = o.order;
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
        // @ts-expect-error Union order can be POST_ORDER.
        commandName: C.REWRITE_VERTEX_HINTS_ON_PRE_ORDER,
        // @ts-expect-error Union order can be POST_ORDER.
        commandArguments: { newHints: [] },
      },
    ],
  }));
  traversal.configure({
    visitors: {
      [F.IN_ORDER]: [
        {
          addedIndex: 0,
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
      addedIndex: 0,
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
  new BreadthFirstTraversal<T>(tree),
  new AsyncBreadthFirstTraversal<T>(tree),
]) {
  traversal.addVisitorFor(B.LEVEL_ORDER, (_v, o) => {
    const phase: B.LEVEL_ORDER = o.order;
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
    commands: [{ commandName: C.DEFER_READY }],
  }));
  traversal.configure({
    visitors: {
      [B.LEVEL_ORDER]: [
        {
          addedIndex: 0,
          priority: 1,
          // @ts-expect-error Config map controls phase.
          visitor: () => ({ commands: [{ commandName: C.DEFER_READY }] }),
        },
      ],
    },
  });
  traversal.setVisitorsFor(B.LEVEL_ORDER, [
    {
      addedIndex: 0,
      priority: 1,
      // @ts-expect-error setVisitorsFor controls phase.
      visitor: () => ({ commands: [{ commandName: C.DEFER_READY }] }),
    },
  ]);
}
{
  traverseDepthFirst<T>(tree.traversableTree!, {
    // @ts-expect-error Legacy helper map controls phase.
    postOrderVisitor: () => ({
      commands: [
        {
          commandName: C.REWRITE_CHILD_HINTS,
          commandArguments: { newHints: [] },
        },
      ],
    }),
  });
}
{
  traverseDepthFirstAsync<T>(tree.traversableTree!, {
    // @ts-expect-error Legacy helper map controls phase.
    postOrderVisitor: () => ({
      commands: [
        {
          commandName: C.REWRITE_CHILD_HINTS,
          commandArguments: { newHints: [] },
        },
      ],
    }),
  });
}
{
  // @ts-expect-error Simple helper map controls phase.
  traverseDag<T>(graph, { onCompleteVisitor: () => DEFER_READY });
}
{
  // @ts-expect-error Simple helper map controls phase.
  traverseDagAsync<T>(graph, { onCompleteVisitor: () => DEFER_READY });
}
const commonVisitor: DagVisitor<T> = () => ({
  commands: [{ commandName: C.NOOP }],
});
void commonVisitor;
// @ts-expect-error A broad visitor must be explicitly annotated ON_READY to defer.
const broadVisitor: DagVisitor<T> = () => DEFER_READY;
void broadVisitor;
const broadResult: TraversalVisitorResult<T> = {
  commands: [
    // @ts-expect-error A result with unknown phase cannot rewrite hints.
    { commandName: C.REWRITE_CHILD_HINTS, commandArguments: { newHints: [] } },
  ],
};
void broadResult;

// Pre-typed callbacks must not hide an invalid phase behind a broader registration.
declare const ready: DagVisitor<T, T, D.ON_READY>;
declare const pre: import('../src').TraversalVisitor<F.PRE_ORDER, T, T>;
for (const traversal of [
  new DagTraversal<T>(graph),
  new AsyncDagTraversal<T>(graph),
]) {
  // @ts-expect-error The callback requires ON_READY but the registration can complete.
  traversal.addVisitorFor(dagOrder, ready);
  // @ts-expect-error A narrow callback cannot be registered for another phase.
  traversal.addVisitorFor(D.ON_COMPLETE, ready);
  traversal.configure({
    visitors: {
      // @ts-expect-error A pre-typed narrow callback cannot evade map phase restrictions.
      [D.ON_COMPLETE]: [{ addedIndex: 0, priority: 1, visitor: ready }],
    },
  });
  traversal.setVisitorsFor(dagOrder, [
    // @ts-expect-error A pre-typed narrow callback cannot evade setVisitorsFor restrictions.
    { addedIndex: 0, priority: 1, visitor: ready },
  ]);
}
for (const traversal of [
  new DepthFirstTraversal<T>(tree),
  new AsyncDepthFirstTraversal<T>(tree),
]) {
  // @ts-expect-error The callback can rewrite hints while the registration can run post-order.
  traversal.addVisitorFor(dfsOrder, pre);
  traversal.configure({
    visitors: {
      // @ts-expect-error A pre-typed narrow callback cannot evade map phase restrictions.
      [F.POST_ORDER]: [{ addedIndex: 0, priority: 1, visitor: pre }],
    },
  });
  traversal.setVisitorsFor(dfsOrder, [
    // @ts-expect-error A pre-typed narrow callback cannot evade setVisitorsFor restrictions.
    { addedIndex: 0, priority: 1, visitor: pre },
  ]);
}
{
  // @ts-expect-error A pre-typed narrow callback cannot evade helper map phase restrictions.
  traverseDepthFirst<T>(tree.traversableTree, { postOrderVisitor: pre });
}
{
  // @ts-expect-error A pre-typed narrow callback cannot evade helper map phase restrictions.
  traverseDepthFirstAsync<T>(tree.traversableTree, { postOrderVisitor: pre });
}
{
  // @ts-expect-error A pre-typed narrow callback cannot evade helper map phase restrictions.
  traverseDag<T>(graph, { onCompleteVisitor: ready });
}
{
  // @ts-expect-error A pre-typed narrow callback cannot evade helper map phase restrictions.
  traverseDagAsync<T>(graph, { onCompleteVisitor: ready });
}

new DagTraversal<T>(graph).addVisitorFor(D.ON_READY, commonVisitor);
const asyncCommon: import('../src').AsyncDagVisitor<T> = async () => ({
  commands: [{ commandName: C.NOOP }],
});
new AsyncDagTraversal<T>(graph).addVisitorFor(D.ON_READY, asyncCommon);

{
  importedBreadth(tree.traversableTree, (_v, options) => {
    const phase: B.LEVEL_ORDER = options.order;
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
  // @ts-expect-error Breadth-first helpers cannot defer DAG readiness.
  importedBreadth(tree.traversableTree, () => ({
    commands: [{ commandName: C.DEFER_READY }],
  }));
}
{
  importedBreadthAsync(tree.traversableTree, (_v, options) => {
    const phase: B.LEVEL_ORDER = options.order;
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
  // @ts-expect-error Breadth-first helpers cannot defer DAG readiness.
  importedBreadthAsync(tree.traversableTree, () => ({
    commands: [{ commandName: C.DEFER_READY }],
  }));
}
import {
  traverseBreadthFirst as importedBreadth,
  traverseBreadthFirstAsync as importedBreadthAsync,
} from '../src';
new DepthFirstTraversal<T>(tree).configure({
  visitors: {
    [F.PRE_ORDER]: [
      {
        addedIndex: 0,
        priority: 1,
        visitor: (_v, o) => {
          const phase: F.PRE_ORDER = o.order;
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
new AsyncDepthFirstTraversal<T>(tree).configure({
  visitors: {
    [F.PRE_ORDER]: [
      {
        addedIndex: 0,
        priority: 1,
        visitor: (_v, o) => {
          const phase: F.PRE_ORDER = o.order;
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
new DepthFirstTraversal<T>(tree).setVisitorsFor(F.PRE_ORDER, [
  {
    addedIndex: 0,
    priority: 1,
    visitor: (_v, o) => {
      const phase: F.PRE_ORDER = o.order;
      void phase;
    },
  },
]);
new AsyncDepthFirstTraversal<T>(tree).setVisitorsFor(F.PRE_ORDER, [
  {
    addedIndex: 0,
    priority: 1,
    visitor: (_v, o) => {
      const phase: F.PRE_ORDER = o.order;
      void phase;
    },
  },
]);
new BreadthFirstTraversal<T>(tree).configure({
  visitors: {
    [B.LEVEL_ORDER]: [
      {
        addedIndex: 0,
        priority: 1,
        visitor: (_v, o) => {
          const phase: B.LEVEL_ORDER = o.order;
          void phase;
        },
      },
    ],
  },
});
new AsyncBreadthFirstTraversal<T>(tree).configure({
  visitors: {
    [B.LEVEL_ORDER]: [
      {
        addedIndex: 0,
        priority: 1,
        visitor: (_v, o) => {
          const phase: B.LEVEL_ORDER = o.order;
          void phase;
        },
      },
    ],
  },
});
new BreadthFirstTraversal<T>(tree).setVisitorsFor(B.LEVEL_ORDER, [
  {
    addedIndex: 0,
    priority: 1,
    visitor: (_v, o) => {
      const phase: B.LEVEL_ORDER = o.order;
      void phase;
    },
  },
]);
new AsyncBreadthFirstTraversal<T>(tree).setVisitorsFor(B.LEVEL_ORDER, [
  {
    addedIndex: 0,
    priority: 1,
    visitor: (_v, o) => {
      const phase: B.LEVEL_ORDER = o.order;
      void phase;
    },
  },
]);
new DagTraversal<T>(graph).setVisitorsFor(D.ON_READY, [
  {
    addedIndex: 0,
    priority: 1,
    visitor: (_v, o) => {
      const phase: D.ON_READY = o.order;
      void phase;
      return { commands: [{ commandName: C.DEFER_READY }] };
    },
  },
]);
new AsyncDagTraversal<T>(graph).setVisitorsFor(D.ON_READY, [
  {
    addedIndex: 0,
    priority: 1,
    visitor: (_v, o) => {
      const phase: D.ON_READY = o.order;
      void phase;
      return { commands: [{ commandName: C.DEFER_READY }] };
    },
  },
]);

// Match async callback types to async entry points so phase errors cannot be
// masked by the independent sync/async recursive visitor-record distinction.
declare const asyncReady: import('../src').AsyncDagVisitor<T, T, D.ON_READY>;
declare const asyncPre: import('../src').AsyncTraversalVisitor<
  F.PRE_ORDER,
  T,
  T
>;
const asyncDag = new AsyncDagTraversal<T>(graph);
const asyncDfs = new AsyncDepthFirstTraversal<T>(tree);
asyncDag.addVisitorFor(D.ON_READY, asyncReady);
asyncDfs.addVisitorFor(F.PRE_ORDER, asyncPre);
// @ts-expect-error An async ON_READY callback cannot run at a union phase.
asyncDag.addVisitorFor(dagOrder, asyncReady);
// @ts-expect-error An async PRE_ORDER callback cannot run at a union phase.
asyncDfs.addVisitorFor(dfsOrder, asyncPre);
asyncDag.configure({
  visitors: {
    // @ts-expect-error Async configuration maps preserve phases of pre-typed callbacks.
    [D.ON_COMPLETE]: [{ addedIndex: 0, priority: 1, visitor: asyncReady }],
  },
});
asyncDfs.configure({
  visitors: {
    // @ts-expect-error Async configuration maps preserve phases of pre-typed callbacks.
    [F.POST_ORDER]: [{ addedIndex: 0, priority: 1, visitor: asyncPre }],
  },
});
asyncDag.setVisitorsFor(dagOrder, [
  // @ts-expect-error Async replacement maps preserve phases of pre-typed callbacks.
  { addedIndex: 0, priority: 1, visitor: asyncReady },
]);
asyncDfs.setVisitorsFor(dfsOrder, [
  // @ts-expect-error Async replacement maps preserve phases of pre-typed callbacks.
  { addedIndex: 0, priority: 1, visitor: asyncPre },
]);
// @ts-expect-error Async helper maps preserve phases of pre-typed callbacks.
traverseDagAsync(graph, { onCompleteVisitor: asyncReady });
// @ts-expect-error Async helper maps preserve phases of pre-typed callbacks.
traverseDepthFirstAsync(tree.traversableTree, { postOrderVisitor: asyncPre });
const defaultTreeVisitor: import('../src').TraversalVisitor = () => ({
  commands: [{ commandName: C.NOOP }],
});
const defaultAsyncVisitor: import('../src').AsyncTraversalVisitor =
  async () => ({ commands: [{ commandName: C.NOOP }] });
void [defaultTreeVisitor, defaultAsyncVisitor];
