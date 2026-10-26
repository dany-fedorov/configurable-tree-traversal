import {
  ObjectTreeSource,
  DepthFirstTreeTraversal,
  DepthFirstPhase,
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

function getFgColorFor(order: unknown): string {
  switch (order) {
    case DepthFirstPhase.PRE_ORDER:
      return RED_FG;
    case DepthFirstPhase.IN_ORDER:
      return GREEN_FG;
    case DepthFirstPhase.POST_ORDER:
      return BLUE_FG;
    default:
      return '';
  }
}

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

const traversableTree = new ObjectTreeSource(obj, {
  resolveVertexHook: (vertexHint) => {
    if (vertexHint.value === null) {
      return { kind: 'omitted' };
    }
    return { kind: 'useDefault' };
  },
});
const traversal = new DepthFirstTreeTraversal({
  traversableTree,
});

traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, (v) => {
  console.log(
    '-',
    RED_FG,
    'Pre-order'.padEnd(10),
    RESET,
    'key:',
    v.getData().key,
    '; value:',
    JSON.stringify(v.getData().value),
  );
});
traversal.addVisitorFor(DepthFirstPhase.POST_ORDER, (v) => {
  console.log(
    '-',
    BLUE_FG,
    'Post-order'.padEnd(10),
    RESET,
    'key:',
    v.getData().key,
    '; value:',
    JSON.stringify(v.getData().value),
  );
  if (v.getData().key === 'B') {
    return {
      commands: [
        {
          commandName: TraversalVisitorCommandName.PAUSE_TRAVERSAL,
        },
      ],
    };
  }
  return {};
});
traversal.addVisitorFor(DepthFirstPhase.IN_ORDER, (v) => {
  console.log(
    '-',
    GREEN_FG,
    'In-order'.padEnd(10),
    RESET,
    'key:',
    v.getData().key,
    '; value:',
    JSON.stringify(v.getData().value),
  );
});

const traversalRunner = traversal.createRunner();

const traversalIterable = traversalRunner.iterateEvents({
  visitorPhases: { include: [DepthFirstPhase.POST_ORDER] },
  emitEvents: [DepthFirstPhase.PRE_ORDER],
});

for (const { vertex, phase: order } of traversalIterable) {
  console.log(
    `Inside the loop on`,
    [getFgColorFor(order), order.padEnd(10), RESET].join(''),
    '; key:',
    vertex.getData().key,
    '; value:',
    JSON.stringify(vertex.getData().value),
  );
  if (vertex.getData().key === 'D') {
    console.log('Found D!!');
    break;
  }
}

console.log('----');
console.log('----');

const traversalIterable2 = traversalRunner.iterateEvents({
  visitorPhases: { include: [] },
});

for (const { vertex, phase: order } of traversalIterable2) {
  console.log(
    `Inside the loop on`,
    [getFgColorFor(order), order.padEnd(10), RESET].join(''),
    '; key:',
    vertex.getData().key,
    '; value:',
    JSON.stringify(vertex.getData().value),
  );
}

console.log('----');
console.log('----');

const traversalIterable3 = traversalRunner.iterateEvents({
  visitorPhases: { include: [] },
});

for (const { vertex, phase: order } of traversalIterable3) {
  console.log(
    `Inside the loop on`,
    [getFgColorFor(order), order.padEnd(10), RESET].join(''),
    '; key:',
    vertex.getData().key,
    '; value:',
    JSON.stringify(vertex.getData().value),
  );
}

/*
Inside the loop on PRE_ORDER  ; key: __TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__ ; value: {"F":{"B":{"A":1,"D":["C","E"]},"G":{"_":null,"I":{"H":1}}}}
Inside the loop on PRE_ORDER  ; key: F ; value: {"B":{"A":1,"D":["C","E"]},"G":{"_":null,"I":{"H":1}}}
Inside the loop on PRE_ORDER  ; key: B ; value: {"A":1,"D":["C","E"]}
Inside the loop on PRE_ORDER  ; key: A ; value: 1
-  Post-order  key: A ; value: 1
Inside the loop on PRE_ORDER  ; key: D ; value: ["C","E"]
Found D!!
----
----
Inside the loop on PRE_ORDER  ; key: 0 ; value: "C"
-  Post-order  key: 0 ; value: "C"
Inside the loop on PRE_ORDER  ; key: 1 ; value: "E"
-  Post-order  key: 1 ; value: "E"
-  Post-order  key: D ; value: ["C","E"]
-  Post-order  key: B ; value: {"A":1,"D":["C","E"]}
----
----
Inside the loop on PRE_ORDER  ; key: I ; value: {"H":1}
Inside the loop on PRE_ORDER  ; key: H ; value: 1
-  Post-order  key: H ; value: 1
-  Post-order  key: I ; value: {"H":1}
-  Post-order  key: G ; value: {"_":null,"I":{"H":1}}
-  Post-order  key: F ; value: {"B":{"A":1,"D":["C","E"]},"G":{"_":null,"I":{"H":1}}}
-  Post-order  key: __TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__ ; value: {"F":{"B":{"A":1,"D":["C","E"]},"G":{"_":null,"I":{"H":1}}}}
*/
