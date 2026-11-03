import {
  ObjectPropertyTreeSource,
  DepthFirstTreeTraversalBuilder,
  DepthFirstTreeVisitPhase,
  TraversalVisitorCommandName,
} from '../src';

const RED_FG = '\u001b[31m';
// const RED_BG = '\u001b[41m';
const GREEN_FG = '\u001b[92m';
// const GREEN_BG = '\u001b[102m';
const BLUE_FG = '\u001b[94m';
// const BLUE_BG = '\u001b[104m';
// const BLACK_FG = '\u001b[30m';
// const WHITE_FG = '\u001b[97m';
const RESET = '\u001b[0m';

const obj = {
  F: {
    B: {
      A: 1,
      D: ['C', 'E'],
    },
    G: {
      _: null,
      I: { H: 1 },
    },
  },
};

const treeDiscoverySource = new ObjectPropertyTreeSource(obj, {
  resolveChildPropertyOrUseDefault: (vertexHint) => {
    if (vertexHint.propertyValue === null) {
      return { kind: 'vertexIntentionallyOmitted' };
    }
    return { kind: 'useDefaultChildPropertyResolution' };
  },
});
const traversal = new DepthFirstTreeTraversalBuilder({
  treeDiscoverySource,
});

traversal.registerVisitorCallbackForPhase(
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  (v) => {
    console.log(
      '-',
      RED_FG,
      'Pre-order'.padEnd(10),
      RESET,
      'key:',
      v.getVertexData().propertyKey,
      '; value:',
      JSON.stringify(v.getVertexData().propertyValue),
    );
    if (v.getVertexData().propertyKey === 'B') {
      return {
        commands: [
          {
            commandName:
              TraversalVisitorCommandName.SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX,
          },
        ],
      };
    }
    return {};
  },
);
traversal.registerVisitorCallbackForPhase(
  DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
  (v) => {
    console.log(
      '-',
      BLUE_FG,
      'Post-order'.padEnd(10),
      RESET,
      'key:',
      v.getVertexData().propertyKey,
      '; value:',
      JSON.stringify(v.getVertexData().propertyValue),
    );
    if (v.getVertexData().propertyKey === 'B') {
      return {
        commands: [
          {
            commandName:
              TraversalVisitorCommandName.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY,
          },
        ],
      };
    }
    return {};
  },
);
traversal.registerVisitorCallbackForPhase(
  DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES,
  (v) => {
    console.log(
      '-',
      GREEN_FG,
      'In-order'.padEnd(10),
      RESET,
      'key:',
      v.getVertexData().propertyKey,
      '; value:',
      JSON.stringify(v.getVertexData().propertyValue),
    );
  },
);
const traversalRunner = traversal.createIndependentRunnerFromCurrentOptions();

traversalRunner.runUntilSuspendedOrTerminal();

console.log();
console.log(
  'First stop. TreeTraversal runner status:',
  traversalRunner.getTraversalLifecycleStatus(),
);
console.log();

traversalRunner.runUntilSuspendedOrTerminal();

console.log();
console.log(
  'Second stop. TreeTraversal runner status:',
  traversalRunner.getTraversalLifecycleStatus(),
);

/*
-  Pre-order   key: __TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__ ; value: {"F":{"B":{"A":1,"D":["C","E"]},"G":{"_":null,"I":{"H":1}}}}
-  Pre-order   key: F ; value: {"B":{"A":1,"D":["C","E"]},"G":{"_":null,"I":{"H":1}}}
-  Pre-order   key: B ; value: {"A":1,"D":["C","E"]}
-  In-order    key: B ; value: {"A":1,"D":["C","E"]}
-  Post-order  key: B ; value: {"A":1,"D":["C","E"]}

First stop. TreeTraversal runner status: HALTED

-  In-order    key: F ; value: {"B":{"A":1,"D":["C","E"]},"G":{"_":null,"I":{"H":1}}}
-  Pre-order   key: G ; value: {"_":null,"I":{"H":1}}
-  In-order    key: G ; value: {"_":null,"I":{"H":1}}
-  Pre-order   key: I ; value: {"H":1}
-  Pre-order   key: H ; value: 1
-  In-order    key: H ; value: 1
-  Post-order  key: H ; value: 1
-  In-order    key: I ; value: {"H":1}
-  Post-order  key: I ; value: {"H":1}
-  Post-order  key: G ; value: {"_":null,"I":{"H":1}}
-  Post-order  key: F ; value: {"B":{"A":1,"D":["C","E"]},"G":{"_":null,"I":{"H":1}}}
-  In-order    key: __TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__ ; value: {"F":{"B":{"A":1,"D":["C","E"]},"G":{"_":null,"I":{"H":1}}}}
-  Post-order  key: __TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__ ; value: {"F":{"B":{"A":1,"D":["C","E"]},"G":{"_":null,"I":{"H":1}}}}

Second stop. TreeTraversal runner status: FINISHED
*/
