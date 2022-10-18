import { TraversableObjectTree } from '@traversable-object-tree/index';
import { DepthFirstTraversal } from '@depth-first-traversal/DepthFirstTraversal';
import { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import { TraversalVisitorCommandName } from '@core/TraversalVisitor';
import { jsonStringifySafe } from '@utils/jsonStringifySafe';

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
    case DepthFirstTraversalOrder.PRE_ORDER:
      return RED_FG;
    case DepthFirstTraversalOrder.IN_ORDER:
      return GREEN_FG;
    case DepthFirstTraversalOrder.POST_ORDER:
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

traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, (v) => {
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

const traversalIterable = traversalRunner.getIterable({
  enableVisitorFunctionsFor: [DepthFirstTraversalOrder.POST_ORDER],
  iterateOver: [DepthFirstTraversalOrder.PRE_ORDER],
});

for (const { vertex, order } of traversalIterable) {
  console.log(
    `Inside the loop on`,
    [getFgColorFor(order), order.padEnd(10), RESET].join(''),
    '; key:',
    vertex.getData().key,
    '; value:',
    jsonStringifySafe(vertex.getData().value),
  );
  if (vertex.getData().key === 'D') {
    console.log('Found D!!');
    break;
  }
}

console.log('----');
console.log('----');

const traversalIterable2 = traversalRunner.getIterable({
  enableVisitorFunctionsFor: [],
});

for (const { vertex, order } of traversalIterable2) {
  console.log(
    `Inside the loop on`,
    [getFgColorFor(order), order.padEnd(10), RESET].join(''),
    '; key:',
    vertex.getData().key,
    '; value:',
    jsonStringifySafe(vertex.getData().value),
  );
}

console.log('----');
console.log('----');

const traversalIterable3 = traversalRunner.getIterable({
  enableVisitorFunctionsFor: [],
});

for (const { vertex, order } of traversalIterable3) {
  console.log(
    `Inside the loop on`,
    [getFgColorFor(order), order.padEnd(10), RESET].join(''),
    '; key:',
    vertex.getData().key,
    '; value:',
    jsonStringifySafe(vertex.getData().value),
  );
}
