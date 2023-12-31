import { TraversableObjectTree } from '../src/traversable-tree-implementations/traversable-object-tree';
import { DepthFirstTraversal } from '../src/traversals/depth-first-traversal/DepthFirstTraversal';
import { DepthFirstTraversalOrder } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalOrder';
import { TraversalVisitorCommandName } from '../src/core/TraversalVisitor';
import { jsonStringifySafe } from '../src/utils/jsonStringifySafe';
import { getChildrenOfPropertyDefault } from '../src/traversable-tree-implementations/traversable-object-tree/lib/getChildrenOfPropertyDefault';

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
      // AA: 1,
      // DD: ['CC', 'EE'],
      // XX: ['YY'],
    },
    G: {
      _: null,
      I: { H: 1 },
    },
  },
};

const traversableTree = new TraversableObjectTree(obj, {
  makeVertexHook: (vertexHint) => {
    if (vertexHint.value === null) {
      return { returnMe: null };
    }
    return {};
  },
});
const traversal = new DepthFirstTraversal({
  traversableTree,
});

traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, (v, opts) => {
  console.log(
    '-',
    RED_FG,
    'Pre-order'.padEnd(10),
    RESET,
    'key:',
    v.getData().key,
    '; value:',
    jsonStringifySafe(v.getData().value),
  );
  if (v.getData().value === 'E') {
    return {
      commands: [
        {
          commandName:
            TraversalVisitorCommandName.REWRITE_VERTEX_HINTS_ON_PRE_ORDER,
          commandArguments: {
            newHints: getChildrenOfPropertyDefault({
              key: v.getData().key,
              value: {
                AA: 1,
                DD: ['CC', 'EE'],
                XX: ['YY'],
              },
            }),
          },
        },
      ],
    };
  }
  return {};
});
traversal.addVisitorFor(DepthFirstTraversalOrder.POST_ORDER, (v) => {
  console.log(
    '-',
    BLUE_FG,
    'Post-order'.padEnd(10),
    RESET,
    'key:',
    v.getData().key,
    '; value:',
    jsonStringifySafe(v.getData().value),
  );
  if (v.getData().key === 'B') {
    return {
      commands: [
        {
          commandName: TraversalVisitorCommandName.HALT_TRAVERSAL,
        },
      ],
    };
  }
  return {};
});
traversal.addVisitorFor(DepthFirstTraversalOrder.IN_ORDER, (v) => {
  console.log(
    '-',
    GREEN_FG,
    'In-order'.padEnd(10),
    RESET,
    'key:',
    v.getData().key,
    '; value:',
    jsonStringifySafe(v.getData().value),
  );
});
const traversalRunner = traversal.makeRunner();

traversalRunner.run();

console.log();
console.log(
  'First stop. Traversal runner status:',
  traversalRunner.getStatus(),
);
console.log();

traversalRunner.run();

console.log();
console.log(
  'Second stop. Traversal runner status:',
  traversalRunner.getStatus(),
);

/*
-  Pre-order   key: __TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__ ; value: {"F":{"B":{"A":1,"D":["C","E"]},"G":{"_":null,"I":{"H":1}}}}
-  Pre-order   key: F ; value: {"B":{"A":1,"D":["C","E"]},"G":{"_":null,"I":{"H":1}}}
-  Pre-order   key: B ; value: {"A":1,"D":["C","E"]}
-  Pre-order   key: A ; value: 1
-  In-order    key: A ; value: 1
-  Post-order  key: A ; value: 1
-  In-order    key: B ; value: {"A":1,"D":["C","E"]}
-  Pre-order   key: D ; value: ["C","E"]
-  Pre-order   key: 0 ; value: "C"
-  In-order    key: 0 ; value: "C"
-  Post-order  key: 0 ; value: "C"
-  In-order    key: D ; value: ["C","E"]
-  Pre-order   key: 1 ; value: "E"
-  Pre-order   key: AA ; value: 1
-  In-order    key: AA ; value: 1
-  Post-order  key: AA ; value: 1
-  In-order    key: 1 ; value: "E"
-  Pre-order   key: DD ; value: ["CC","EE"]
-  Pre-order   key: 0 ; value: "CC"
-  In-order    key: 0 ; value: "CC"
-  Post-order  key: 0 ; value: "CC"
-  In-order    key: DD ; value: ["CC","EE"]
-  Pre-order   key: 1 ; value: "EE"
-  In-order    key: 1 ; value: "EE"
-  Post-order  key: 1 ; value: "EE"
-  Post-order  key: DD ; value: ["CC","EE"]
-  In-order    key: 1 ; value: "E"
-  Pre-order   key: XX ; value: ["YY"]
-  Pre-order   key: 0 ; value: "YY"
-  In-order    key: 0 ; value: "YY"
-  Post-order  key: 0 ; value: "YY"
-  In-order    key: XX ; value: ["YY"]
-  Post-order  key: XX ; value: ["YY"]
-  Post-order  key: 1 ; value: "E"
-  Post-order  key: D ; value: ["C","E"]
-  Post-order  key: B ; value: {"A":1,"D":["C","E"]}

First stop. Traversal runner status: HALTED

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

Second stop. Traversal runner status: FINISHED
*/
