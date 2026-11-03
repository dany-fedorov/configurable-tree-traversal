import assert from 'node:assert/strict';
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

function getFgColorFor(order: unknown): string {
  switch (order) {
    case DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION:
      return RED_FG;
    case DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES:
      return GREEN_FG;
    case DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES:
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

// Every visitor callback that actually runs is recorded here as `PHASE:key`.
const callbackLog: string[] = [];

traversal.registerVisitorCallbackForPhase(
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  (v) => {
    callbackLog.push(
      `${DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION}:${String(
        v.getVertexData().propertyKey,
      )}`,
    );
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
  },
);
traversal.registerVisitorCallbackForPhase(
  DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
  (v) => {
    callbackLog.push(
      `${DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES}:${String(
        v.getVertexData().propertyKey,
      )}`,
    );
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
    callbackLog.push(
      `${
        DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES
      }:${String(v.getVertexData().propertyKey)}`,
    );
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

// Each iterator lease records the `phase:key` of every event it yields.
const lease1Records: string[] = [];
const lease2Records: string[] = [];
const lease3Records: string[] = [];

// First lease: deliver only PRE_ORDER events, run only POST_ORDER callbacks.
const traversalIterable =
  traversalRunner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    admittedVisitorCallbackPhases: {
      include: [DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES],
    },
    deliveredEventKinds: [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION],
  });

for (const { vertex, eventKind: order } of traversalIterable) {
  lease1Records.push(`${order}:${String(vertex.getVertexData().propertyKey)}`);
  console.log(
    `Inside the loop on`,
    [getFgColorFor(order), order.padEnd(10), RESET].join(''),
    '; key:',
    vertex.getVertexData().propertyKey,
    '; value:',
    JSON.stringify(vertex.getVertexData().propertyValue),
  );
  if (vertex.getVertexData().propertyKey === 'D') {
    console.log('Found D!!');
    break; // Returning the consumer iterator pauses the runner.
  }
}

assert.deepEqual(lease1Records, [
  'BEFORE_CHILD_EXPANSION:__TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__',
  'BEFORE_CHILD_EXPANSION:F',
  'BEFORE_CHILD_EXPANSION:B',
  'BEFORE_CHILD_EXPANSION:A',
  'BEFORE_CHILD_EXPANSION:D',
]);
// Only the POST_ORDER callback for the leaf A ran before the break on D.
assert.deepEqual(callbackLog, ['AFTER_CHILD_SUBTREES:A']);
assert.equal(traversalRunner.getTraversalLifecycleStatus(), 'SUSPENDED');

console.log('----');
console.log('----');

// Second lease: `admittedVisitorCallbackPhases: { include: [] }` disables every visitor
// callback admitted from now on, while the omitted `deliveredEventKinds` field keeps
// the first lease's `[BEFORE_CHILD_EXPANSION]` selection (selector fields patch
// field-wise). Because callbacks are disabled, the POST_ORDER pause visitor
// at B never runs, so nothing pauses the traversal again: this lease yields
// the remaining PRE_ORDER events (0, 1, G, I, H) and runs to the end. The
// `_` child of G is omitted by `resolveChildPropertyOrUseDefault`.
const traversalIterable2 =
  traversalRunner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    admittedVisitorCallbackPhases: { include: [] },
  });

for (const { vertex, eventKind: order } of traversalIterable2) {
  lease2Records.push(`${order}:${String(vertex.getVertexData().propertyKey)}`);
  console.log(
    `Inside the loop on`,
    [getFgColorFor(order), order.padEnd(10), RESET].join(''),
    '; key:',
    vertex.getVertexData().propertyKey,
    '; value:',
    JSON.stringify(vertex.getVertexData().propertyValue),
  );
}

assert.deepEqual(lease2Records, [
  'BEFORE_CHILD_EXPANSION:0',
  'BEFORE_CHILD_EXPANSION:1',
  'BEFORE_CHILD_EXPANSION:G',
  'BEFORE_CHILD_EXPANSION:I',
  'BEFORE_CHILD_EXPANSION:H',
]);
// No callback (in particular no POST_ORDER callback) ran during the second
// lease, so the pause at B never happened.
assert.deepEqual(callbackLog, ['AFTER_CHILD_SUBTREES:A']);
assert.equal(traversalRunner.getTraversalLifecycleStatus(), 'FINISHED');

console.log('----');
console.log('----');

// Third lease: the runner already FINISHED during the second lease, so this
// iterator yields nothing and runs no callbacks.
const traversalIterable3 =
  traversalRunner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    admittedVisitorCallbackPhases: { include: [] },
  });

for (const { vertex, eventKind: order } of traversalIterable3) {
  lease3Records.push(`${order}:${String(vertex.getVertexData().propertyKey)}`);
  console.log(
    `Inside the loop on`,
    [getFgColorFor(order), order.padEnd(10), RESET].join(''),
    '; key:',
    vertex.getVertexData().propertyKey,
    '; value:',
    JSON.stringify(vertex.getVertexData().propertyValue),
  );
}

assert.deepEqual(lease3Records, []);
assert.deepEqual(callbackLog, ['AFTER_CHILD_SUBTREES:A']);
assert.equal(traversalRunner.getTraversalLifecycleStatus(), 'FINISHED');

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
