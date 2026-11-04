import { TraversalVisitorCommandName as VisitorCommand } from '../src';
import {
  DagTraversalBuilder,
  AsyncDagTraversalBuilder,
  DagVisitorPhase as D,
  DepthFirstTreeTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  DepthFirstTreeVisitPhase as F,
  BreadthFirstTreeTraversalBuilder,
  AsyncBreadthFirstTreeTraversalBuilder,
  BreadthFirstTreeVisitPhase as B,
  TraversalVisitorCommandName as C,
  runTreeDepthFirstUntilSuspendedOrTerminal,
  runTreeDepthFirstUntilSuspendedOrTerminalAsync,
  traverseDag,
  traverseDagAsync,
} from '../src';
import type {
  VertexDataAndChildHintTypes,
  DagVisitor,
  VisitorCommandsResult,
} from '../src';
type T = VertexDataAndChildHintTypes<string, string>;
declare const graph: {
  dagDiscoverySource: import('../src').DagDiscoverySource<T>;
};
declare const tree: {
  treeDiscoverySource: import('../src').TreeDiscoverySource<T>;
};
declare const dagOrder: D;
declare const dfsOrder: F;
for (const traversal of [
  new DagTraversalBuilder<T>(graph),
  new AsyncDagTraversalBuilder<T>(graph),
]) {
  traversal.registerVisitorForPhase(
    D.ON_WORK_READY,
    (_vertex, options) => {
      const phase: D.ON_WORK_READY = options.visitorPhase;
      void phase;
      return {
        commands: [
          { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
        ],
      };
    },
  );
  traversal.registerVisitorForPhase(
    D.ON_SUBGRAPH_COMPLETION_READY,
    () => ({
      commands: [
        {
          // @ts-expect-error Completion cannot defer, including by legacy sentinel.
          commandName:
            VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
        },
      ],
    }),
  );
  traversal.registerVisitorForPhase(
    D.ON_SUBGRAPH_COMPLETION_READY,
    () => ({
      commands: [
        // @ts-expect-error Completion cannot defer by command.
        { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
      ],
    }),
  );
  traversal.registerVisitorForPhase(dagOrder, () => ({
    commands: [
      // @ts-expect-error A union phase can be completion.
      { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
    ],
  }));
  traversal.registerVisitorForPhase(D.ON_WORK_READY, () => ({
    // @ts-expect-error Deferral cannot be combined with another command.
    commands: [
      { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
      { commandName: C.NO_OPERATION },
    ],
  }));

  traversal.patchOptionsForFutureRunners({
    visitors: {
      [D.ON_SUBGRAPH_COMPLETION_READY]: [
        {
          descendingExecutionPriorityWithinGroup: 100,
          visitor: () => ({
            commands: [
              {
                // @ts-expect-error Config map controls phase.
                commandName:
                  VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
              },
            ],
          }),
        },
      ],
    },
  });
  traversal.replaceVisitorDefinitionsForPhase(D.ON_SUBGRAPH_COMPLETION_READY, [
    {
      descendingExecutionPriorityWithinGroup: 100,
      visitor: () => ({
        commands: [
          {
            // @ts-expect-error setVisitorsFor controls phase.
            commandName: C.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
            // @ts-expect-error setVisitorsFor controls phase.
            commandArguments: { replacementChildHints: [] },
          },
        ],
      }),
    },
  ]);
}
new DagTraversalBuilder<T>(graph).patchOptionsForFutureRunners({
  visitors: {
    [D.ON_WORK_READY]: [
      {
        descendingExecutionPriorityWithinGroup: 100,
        visitor: (_v, o) => {
          const phase: D.ON_WORK_READY = o.visitorPhase;
          void phase;
          return {
            commands: [
              {
                commandName:
                  VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
              },
            ],
          };
        },
      },
    ],
  },
});
new AsyncDagTraversalBuilder<T>(graph).patchOptionsForFutureRunners({
  visitors: {
    [D.ON_WORK_READY]: [
      {
        descendingExecutionPriorityWithinGroup: 100,
        visitor: (_v, o) => {
          const phase: D.ON_WORK_READY = o.visitorPhase;
          void phase;
          return {
            commands: [
              {
                commandName:
                  VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
              },
            ],
          };
        },
      },
    ],
  },
});
for (const traversal of [
  new DepthFirstTreeTraversalBuilder<T>(tree),
  new AsyncDepthFirstTreeTraversalBuilder<T>(tree),
]) {
  traversal.registerVisitorForPhase(
    F.BEFORE_CHILD_EXPANSION,
    (_v, o) => {
      const phase: F.BEFORE_CHILD_EXPANSION = o.visitorPhase;
      void phase;
      return {
        commands: [
          {
            commandName: C.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
            commandArguments: { replacementChildHints: [] },
          },
        ],
      };
    },
  );
  traversal.registerVisitorForPhase(F.AFTER_CHILD_SUBTREES, () => ({
    commands: [
      {
        // @ts-expect-error Rewrite is forbidden at POST_ORDER.
        commandName: C.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
        // @ts-expect-error Rewrite is forbidden at POST_ORDER.
        commandArguments: { replacementChildHints: [] },
      },
    ],
  }));
  traversal.registerVisitorForPhase(dfsOrder, () => ({
    commands: [
      {
        // @ts-expect-error Union phase can be POST_ORDER.
        commandName: C.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
        // @ts-expect-error Union phase can be POST_ORDER.
        commandArguments: { replacementChildHints: [] },
      },
    ],
  }));
  traversal.patchOptionsForFutureRunners({
    visitors: {
      [F.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES]: [
        {
          descendingExecutionPriorityWithinGroup: 1,
          visitor: () => ({
            commands: [
              {
                // @ts-expect-error Config map controls phase.
                commandName: C.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
                // @ts-expect-error Config map controls phase.
                commandArguments: { replacementChildHints: [] },
              },
            ],
          }),
        },
      ],
    },
  });
  traversal.replaceVisitorDefinitionsForPhase(F.AFTER_CHILD_SUBTREES, [
    {
      descendingExecutionPriorityWithinGroup: 1,
      visitor: () => ({
        commands: [
          {
            // @ts-expect-error setVisitorsFor controls phase.
            commandName: C.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
            // @ts-expect-error setVisitorsFor controls phase.
            commandArguments: { replacementChildHints: [] },
          },
        ],
      }),
    },
  ]);
}
for (const traversal of [
  new BreadthFirstTreeTraversalBuilder<T>(tree),
  new AsyncBreadthFirstTreeTraversalBuilder<T>(tree),
]) {
  traversal.registerVisitorForPhase(
    B.AT_LEVEL_ORDER_VERTEX,
    (_v, o) => {
      const phase: B.AT_LEVEL_ORDER_VERTEX = o.visitorPhase;
      void phase;
      return {
        commands: [
          {
            commandName: C.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
            commandArguments: { replacementChildHints: [] },
          },
        ],
      };
    },
  );
  traversal.registerVisitorForPhase(B.AT_LEVEL_ORDER_VERTEX, () => ({
    commands: [
      // @ts-expect-error Tree callbacks cannot defer.
      { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
    ],
  }));
  traversal.patchOptionsForFutureRunners({
    visitors: {
      [B.AT_LEVEL_ORDER_VERTEX]: [
        {
          descendingExecutionPriorityWithinGroup: 1,
          visitor: () => ({
            commands: [
              {
                // @ts-expect-error Config map controls phase.
                commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION,
              },
            ],
          }),
        },
      ],
    },
  });
  traversal.replaceVisitorDefinitionsForPhase(B.AT_LEVEL_ORDER_VERTEX, [
    {
      descendingExecutionPriorityWithinGroup: 1,
      visitor: () => ({
        commands: [
          // @ts-expect-error setVisitorsFor controls phase.
          { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
        ],
      }),
    },
  ]);
}
{
  runTreeDepthFirstUntilSuspendedOrTerminal<T>({
    treeDiscoverySource: tree.treeDiscoverySource!,
    // @ts-expect-error POST_ORDER cannot rewrite child hints.
    visitors: {
      AFTER_CHILD_SUBTREES: () => ({
        commands: [
          {
            commandName: C.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
            commandArguments: { replacementChildHints: [] },
          },
        ],
      }),
    },
  });
}
{
  runTreeDepthFirstUntilSuspendedOrTerminalAsync<T>({
    treeDiscoverySource: tree.treeDiscoverySource!,
    // @ts-expect-error POST_ORDER cannot rewrite child hints.
    visitors: {
      AFTER_CHILD_SUBTREES: () => ({
        commands: [
          {
            commandName: C.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
            commandArguments: { replacementChildHints: [] },
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
      ON_SUBGRAPH_COMPLETION_READY: () => ({
        commands: [
          {
            commandName:
              VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
          },
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
      ON_SUBGRAPH_COMPLETION_READY: () => ({
        commands: [
          {
            commandName:
              VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
          },
        ],
      }),
    },
  });
}
const commonVisitor: DagVisitor<T> = () => ({
  commands: [{ commandName: C.NO_OPERATION }],
});
void commonVisitor;
const broadVisitor: DagVisitor<T> = () => ({
  commands: [
    {
      // @ts-expect-error A broad visitor must be explicitly annotated ON_WORK_READY to defer.
      commandName:
        VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
    },
  ],
});
void broadVisitor;
const broadResult: VisitorCommandsResult<T> = {
  commands: [
    {
      // @ts-expect-error A result with unknown phase cannot rewrite hints.
      commandName: C.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
      // @ts-expect-error A result with unknown phase cannot rewrite hints.
      commandArguments: { replacementChildHints: [] },
    },
  ],
};
void broadResult;

// Pre-typed callbacks must not hide an invalid phase behind a broader registration.
declare const ready: DagVisitor<T, T, D.ON_WORK_READY>;
declare const pre: import('../src').TreeVertexPhaseVisitorCallback<
  T,
  T,
  F.BEFORE_CHILD_EXPANSION
>;
for (const traversal of [
  new DagTraversalBuilder<T>(graph),
  new AsyncDagTraversalBuilder<T>(graph),
]) {
  // @ts-expect-error The callback requires ON_WORK_READY but the registration can complete.
  traversal.registerVisitorForPhase(dagOrder, ready);
  traversal.registerVisitorForPhase(
    D.ON_SUBGRAPH_COMPLETION_READY,
    // @ts-expect-error A narrow callback cannot be registered for another phase.
    ready,
  );
  traversal.patchOptionsForFutureRunners({
    visitors: {
      [D.ON_SUBGRAPH_COMPLETION_READY]: [
        // @ts-expect-error A pre-typed narrow callback cannot evade map phase restrictions.
        { descendingExecutionPriorityWithinGroup: 1, visitor: ready },
      ],
    },
  });
  traversal.replaceVisitorDefinitionsForPhase(dagOrder, [
    // @ts-expect-error A pre-typed narrow callback cannot evade setVisitorsFor restrictions.
    { descendingExecutionPriorityWithinGroup: 1, visitor: ready },
  ]);
}
for (const traversal of [
  new DepthFirstTreeTraversalBuilder<T>(tree),
  new AsyncDepthFirstTreeTraversalBuilder<T>(tree),
]) {
  // @ts-expect-error The callback can rewrite hints while the registration can run post-phase.
  traversal.registerVisitorForPhase(dfsOrder, pre);
  traversal.patchOptionsForFutureRunners({
    visitors: {
      [F.AFTER_CHILD_SUBTREES]: [
        // @ts-expect-error A pre-typed narrow callback cannot evade map phase restrictions.
        { descendingExecutionPriorityWithinGroup: 1, visitor: pre },
      ],
    },
  });
  traversal.replaceVisitorDefinitionsForPhase(dfsOrder, [
    // @ts-expect-error A pre-typed narrow callback cannot evade setVisitorsFor restrictions.
    { descendingExecutionPriorityWithinGroup: 1, visitor: pre },
  ]);
}
{
  runTreeDepthFirstUntilSuspendedOrTerminal<T>({
    treeDiscoverySource: tree.treeDiscoverySource,
    // @ts-expect-error A pre-typed narrow callback cannot evade helper map phase restrictions.
    visitors: { AFTER_CHILD_SUBTREES: pre },
  });
}
{
  runTreeDepthFirstUntilSuspendedOrTerminalAsync<T>({
    treeDiscoverySource: tree.treeDiscoverySource,
    // @ts-expect-error A pre-typed narrow callback cannot evade helper map phase restrictions.
    visitors: { AFTER_CHILD_SUBTREES: pre },
  });
}
{
  traverseDag<T>({
    ...graph,
    // @ts-expect-error A pre-typed narrow callback cannot evade helper map phase restrictions.
    visitors: { ON_SUBGRAPH_COMPLETION_READY: ready },
  });
}
{
  traverseDagAsync<T>({
    ...graph,
    // @ts-expect-error A pre-typed narrow callback cannot evade helper map phase restrictions.
    visitors: { ON_SUBGRAPH_COMPLETION_READY: ready },
  });
}

new DagTraversalBuilder<T>(graph).registerVisitorForPhase(
  D.ON_WORK_READY,
  commonVisitor,
);
const asyncCommon: import('../src').AsyncDagVisitor<T> = async () => ({
  commands: [{ commandName: C.NO_OPERATION }],
});
new AsyncDagTraversalBuilder<T>(graph).registerVisitorForPhase(
  D.ON_WORK_READY,
  asyncCommon,
);

{
  importedBreadth({
    treeDiscoverySource: tree.treeDiscoverySource!,
    visitors: {
      AT_LEVEL_ORDER_VERTEX: (_v, options) => {
        const phase: B.AT_LEVEL_ORDER_VERTEX = options.visitorPhase;
        void phase;
        return {
          commands: [
            {
              commandName: C.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
              commandArguments: { replacementChildHints: [] },
            },
          ],
        };
      },
    },
  });
  // @ts-expect-error Breadth-first helpers cannot defer DAG readiness.
  importedBreadth(tree.treeDiscoverySource, () => ({
    commands: [
      { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
    ],
  }));
}
{
  importedBreadthAsync({
    treeDiscoverySource: tree.treeDiscoverySource!,
    visitors: {
      AT_LEVEL_ORDER_VERTEX: (_v, options) => {
        const phase: B.AT_LEVEL_ORDER_VERTEX = options.visitorPhase;
        void phase;
        return {
          commands: [
            {
              commandName: C.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
              commandArguments: { replacementChildHints: [] },
            },
          ],
        };
      },
    },
  });
  // @ts-expect-error Breadth-first helpers cannot defer DAG readiness.
  importedBreadthAsync(tree.treeDiscoverySource, () => ({
    commands: [
      { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
    ],
  }));
}
import {
  runTreeBreadthFirstUntilSuspendedOrTerminal as importedBreadth,
  runTreeBreadthFirstUntilSuspendedOrTerminalAsync as importedBreadthAsync,
} from '../src';
new DepthFirstTreeTraversalBuilder<T>(tree).patchOptionsForFutureRunners({
  visitors: {
    [F.BEFORE_CHILD_EXPANSION]: [
      {
        descendingExecutionPriorityWithinGroup: 1,
        visitor: (_v, o) => {
          const phase: F.BEFORE_CHILD_EXPANSION = o.visitorPhase;
          void phase;
          return {
            commands: [
              {
                commandName: C.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
                commandArguments: { replacementChildHints: [] },
              },
            ],
          };
        },
      },
    ],
  },
});
new AsyncDepthFirstTreeTraversalBuilder<T>(tree).patchOptionsForFutureRunners({
  visitors: {
    [F.BEFORE_CHILD_EXPANSION]: [
      {
        descendingExecutionPriorityWithinGroup: 1,
        visitor: (_v, o) => {
          const phase: F.BEFORE_CHILD_EXPANSION = o.visitorPhase;
          void phase;
          return {
            commands: [
              {
                commandName: C.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
                commandArguments: { replacementChildHints: [] },
              },
            ],
          };
        },
      },
    ],
  },
});
new DepthFirstTreeTraversalBuilder<T>(tree).replaceVisitorDefinitionsForPhase(
  F.BEFORE_CHILD_EXPANSION,
  [
    {
      descendingExecutionPriorityWithinGroup: 1,
      visitor: (_v, o) => {
        const phase: F.BEFORE_CHILD_EXPANSION = o.visitorPhase;
        void phase;
      },
    },
  ],
);
new AsyncDepthFirstTreeTraversalBuilder<T>(
  tree,
).replaceVisitorDefinitionsForPhase(F.BEFORE_CHILD_EXPANSION, [
  {
    descendingExecutionPriorityWithinGroup: 1,
    visitor: (_v, o) => {
      const phase: F.BEFORE_CHILD_EXPANSION = o.visitorPhase;
      void phase;
    },
  },
]);
new BreadthFirstTreeTraversalBuilder<T>(tree).patchOptionsForFutureRunners({
  visitors: {
    [B.AT_LEVEL_ORDER_VERTEX]: [
      {
        descendingExecutionPriorityWithinGroup: 1,
        visitor: (_v, o) => {
          const phase: B.AT_LEVEL_ORDER_VERTEX = o.visitorPhase;
          void phase;
        },
      },
    ],
  },
});
new AsyncBreadthFirstTreeTraversalBuilder<T>(tree).patchOptionsForFutureRunners(
  {
    visitors: {
      [B.AT_LEVEL_ORDER_VERTEX]: [
        {
          descendingExecutionPriorityWithinGroup: 1,
          visitor: (_v, o) => {
            const phase: B.AT_LEVEL_ORDER_VERTEX = o.visitorPhase;
            void phase;
          },
        },
      ],
    },
  },
);
new BreadthFirstTreeTraversalBuilder<T>(tree).replaceVisitorDefinitionsForPhase(
  B.AT_LEVEL_ORDER_VERTEX,
  [
    {
      descendingExecutionPriorityWithinGroup: 1,
      visitor: (_v, o) => {
        const phase: B.AT_LEVEL_ORDER_VERTEX = o.visitorPhase;
        void phase;
      },
    },
  ],
);
new AsyncBreadthFirstTreeTraversalBuilder<T>(
  tree,
).replaceVisitorDefinitionsForPhase(B.AT_LEVEL_ORDER_VERTEX, [
  {
    descendingExecutionPriorityWithinGroup: 1,
    visitor: (_v, o) => {
      const phase: B.AT_LEVEL_ORDER_VERTEX = o.visitorPhase;
      void phase;
    },
  },
]);
new DagTraversalBuilder<T>(graph).replaceVisitorDefinitionsForPhase(
  D.ON_WORK_READY,
  [
    {
      descendingExecutionPriorityWithinGroup: 1,
      visitor: (_v, o) => {
        const phase: D.ON_WORK_READY = o.visitorPhase;
        void phase;
        return {
          commands: [
            { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
          ],
        };
      },
    },
  ],
);
new AsyncDagTraversalBuilder<T>(graph).replaceVisitorDefinitionsForPhase(
  D.ON_WORK_READY,
  [
    {
      descendingExecutionPriorityWithinGroup: 1,
      visitor: (_v, o) => {
        const phase: D.ON_WORK_READY = o.visitorPhase;
        void phase;
        return {
          commands: [
            { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
          ],
        };
      },
    },
  ],
);

// Match async callback types to async entry points so phase errors cannot be
// masked by the independent sync/async recursive visitor-record distinction.
declare const asyncReady: import('../src').AsyncDagVisitor<
  T,
  T,
  D.ON_WORK_READY
>;
declare const asyncPre: import('../src').AsyncTreeVertexPhaseVisitorCallback<
  T,
  T,
  F.BEFORE_CHILD_EXPANSION
>;
const asyncDag = new AsyncDagTraversalBuilder<T>(graph);
const asyncDfs = new AsyncDepthFirstTreeTraversalBuilder<T>(tree);
asyncDag.registerVisitorForPhase(D.ON_WORK_READY, asyncReady);
asyncDfs.registerVisitorForPhase(F.BEFORE_CHILD_EXPANSION, asyncPre);
// @ts-expect-error An async ON_WORK_READY callback cannot run at a union phase.
asyncDag.registerVisitorForPhase(dagOrder, asyncReady);
// @ts-expect-error An async PRE_ORDER callback cannot run at a union phase.
asyncDfs.registerVisitorForPhase(dfsOrder, asyncPre);
asyncDag.patchOptionsForFutureRunners({
  visitors: {
    [D.ON_SUBGRAPH_COMPLETION_READY]: [
      // @ts-expect-error Async configuration maps preserve phases of pre-typed callbacks.
      { descendingExecutionPriorityWithinGroup: 1, visitor: asyncReady },
    ],
  },
});
asyncDfs.patchOptionsForFutureRunners({
  visitors: {
    [F.AFTER_CHILD_SUBTREES]: [
      // @ts-expect-error Async configuration maps preserve phases of pre-typed callbacks.
      { descendingExecutionPriorityWithinGroup: 1, visitor: asyncPre },
    ],
  },
});
asyncDag.replaceVisitorDefinitionsForPhase(dagOrder, [
  // @ts-expect-error Async replacement maps preserve phases of pre-typed callbacks.
  { descendingExecutionPriorityWithinGroup: 1, visitor: asyncReady },
]);
asyncDfs.replaceVisitorDefinitionsForPhase(dfsOrder, [
  // @ts-expect-error Async replacement maps preserve phases of pre-typed callbacks.
  { descendingExecutionPriorityWithinGroup: 1, visitor: asyncPre },
]);
traverseDagAsync({
  ...graph,
  // @ts-expect-error Async helper maps preserve phases of pre-typed callbacks.
  visitors: { ON_SUBGRAPH_COMPLETION_READY: asyncReady },
});
runTreeDepthFirstUntilSuspendedOrTerminalAsync({
  treeDiscoverySource: tree.treeDiscoverySource,
  // @ts-expect-error Async helper maps preserve phases of pre-typed callbacks.
  visitors: { AFTER_CHILD_SUBTREES: asyncPre },
});
const defaultTreeVisitor: import('../src').TreeVertexPhaseVisitorCallback =
  () => ({
    commands: [{ commandName: C.NO_OPERATION }],
  });
const defaultAsyncVisitor: import('../src').AsyncTreeVertexPhaseVisitorCallback =
  async () => ({
    commands: [{ commandName: C.NO_OPERATION }],
  });
void [defaultTreeVisitor, defaultAsyncVisitor];
