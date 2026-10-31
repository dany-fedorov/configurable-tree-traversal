import assert from 'node:assert/strict';
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
  resolveChildHook: (vertexHint) => {
    if (vertexHint.value === null) {
      return { kind: 'omitted' };
    }
    return { kind: 'useDefault' };
  },
});
const traversal = new DepthFirstTreeTraversal({
  traversableTree,
});

// Every visitor callback that actually runs is recorded here as `PHASE:key`.
const callbackLog: string[] = [];

traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, (v) => {
  callbackLog.push(`${DepthFirstPhase.PRE_ORDER}:${String(v.getData().key)}`);
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
  callbackLog.push(`${DepthFirstPhase.POST_ORDER}:${String(v.getData().key)}`);
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
  callbackLog.push(`${DepthFirstPhase.IN_ORDER}:${String(v.getData().key)}`);
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

// Each iterator lease records the `phase:key` of every event it yields.
const lease1Records: string[] = [];
const lease2Records: string[] = [];
const lease3Records: string[] = [];

// First lease: deliver only PRE_ORDER events, run only POST_ORDER callbacks.
const traversalIterable = traversalRunner.iterateEvents({
  visitorPhases: { include: [DepthFirstPhase.POST_ORDER] },
  emitEvents: [DepthFirstPhase.PRE_ORDER],
});

for (const { vertex, phase: order } of traversalIterable) {
  lease1Records.push(`${order}:${String(vertex.getData().key)}`);
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
    break; // Returning the consumer iterator pauses the runner.
  }
}

assert.deepEqual(lease1Records, [
  'PRE_ORDER:__TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__',
  'PRE_ORDER:F',
  'PRE_ORDER:B',
  'PRE_ORDER:A',
  'PRE_ORDER:D',
]);
// Only the POST_ORDER callback for the leaf A ran before the break on D.
assert.deepEqual(callbackLog, ['POST_ORDER:A']);
assert.equal(traversalRunner.getStatus(), 'HALTED');

console.log('----');
console.log('----');

// Second lease: `visitorPhases: { include: [] }` disables every visitor
// callback admitted from now on, while the omitted `emitEvents` field keeps
// the first lease's `[PRE_ORDER]` selection (selector fields patch
// field-wise). Because callbacks are disabled, the POST_ORDER pause visitor
// at B never runs, so nothing pauses the traversal again: this lease yields
// the remaining PRE_ORDER events (0, 1, G, I, H) and runs to the end. The
// `_` child of G is omitted by `resolveChildHook`.
const traversalIterable2 = traversalRunner.iterateEvents({
  visitorPhases: { include: [] },
});

for (const { vertex, phase: order } of traversalIterable2) {
  lease2Records.push(`${order}:${String(vertex.getData().key)}`);
  console.log(
    `Inside the loop on`,
    [getFgColorFor(order), order.padEnd(10), RESET].join(''),
    '; key:',
    vertex.getData().key,
    '; value:',
    JSON.stringify(vertex.getData().value),
  );
}

assert.deepEqual(lease2Records, [
  'PRE_ORDER:0',
  'PRE_ORDER:1',
  'PRE_ORDER:G',
  'PRE_ORDER:I',
  'PRE_ORDER:H',
]);
// No callback (in particular no POST_ORDER callback) ran during the second
// lease, so the pause at B never happened.
assert.deepEqual(callbackLog, ['POST_ORDER:A']);
assert.equal(traversalRunner.getStatus(), 'FINISHED');

console.log('----');
console.log('----');

// Third lease: the runner already FINISHED during the second lease, so this
// iterator yields nothing and runs no callbacks.
const traversalIterable3 = traversalRunner.iterateEvents({
  visitorPhases: { include: [] },
});

for (const { vertex, phase: order } of traversalIterable3) {
  lease3Records.push(`${order}:${String(vertex.getData().key)}`);
  console.log(
    `Inside the loop on`,
    [getFgColorFor(order), order.padEnd(10), RESET].join(''),
    '; key:',
    vertex.getData().key,
    '; value:',
    JSON.stringify(vertex.getData().value),
  );
}

assert.deepEqual(lease3Records, []);
assert.deepEqual(callbackLog, ['POST_ORDER:A']);
assert.equal(traversalRunner.getStatus(), 'FINISHED');

/*
Output (ANSI colour codes stripped):

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
Inside the loop on PRE_ORDER  ; key: 1 ; value: "E"
Inside the loop on PRE_ORDER  ; key: G ; value: {"_":null,"I":{"H":1}}
Inside the loop on PRE_ORDER  ; key: I ; value: {"H":1}
Inside the loop on PRE_ORDER  ; key: H ; value: 1
----
----
*/
