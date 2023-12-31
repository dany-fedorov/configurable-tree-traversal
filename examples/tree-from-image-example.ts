import { DepthFirstTraversal } from '../src/traversals/depth-first-traversal/DepthFirstTraversal';
import { DepthFirstTraversalOrder } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalOrder';

/**
 * Utils
 */

const RED_FG = '\u001b[31m';
// const RED_BG = '\u001b[41m';
const GREEN_FG = '\u001b[32m';
// const GREEN_BG = '\u001b[42m';
const BLUE_FG = '\u001b[94m';
// const BLUE_BG = '\u001b[104m';
const BLACK_FG = '\u001b[30m';
// const WHITE_FG = '\u001b[97m';
const WHITE_BG = '\u001b[107m';
const RESET = '\u001b[0m';

const ANSI_ESCAPE =
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

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

const seq: string[] = [];

function reportVisit(order: DepthFirstTraversalOrder, data: any) {
  seq.push([WHITE_BG, getFgColorFor(order), data, BLACK_FG, '-'].join(''));
}

function logWhiteRow(str: string, d = 0): void {
  const s = [WHITE_BG, str].join('');
  const asciiS = s.replace(ANSI_ESCAPE, '');
  console.log(
    s,
    Array.from({ length: process.stdout.columns - asciiS.length - 1 - d })
      .map(() => ' ')
      .join(''),
  );
}

/**
 * Print legend
 */

const LEFT_PADDING = '    ';

logWhiteRow('');
logWhiteRow('');
logWhiteRow('');
logWhiteRow(
  [
    LEFT_PADDING,
    getFgColorFor(DepthFirstTraversalOrder.PRE_ORDER),
    'Pre-order'.padEnd(10),
    BLACK_FG,
  ].join(''),
);
logWhiteRow(
  [
    LEFT_PADDING,
    getFgColorFor(DepthFirstTraversalOrder.IN_ORDER),
    'In-order'.padEnd(10),
    BLACK_FG,
  ].join(''),
);
logWhiteRow(
  [
    LEFT_PADDING,
    getFgColorFor(DepthFirstTraversalOrder.POST_ORDER),
    'Post-order'.padEnd(10),
    BLACK_FG,
  ].join(''),
);
logWhiteRow('');

/**
 * Print next command prompt on the next line
 */

process.on('beforeExit', () => {
  logWhiteRow([LEFT_PADDING, seq.join('')].join(''));
  logWhiteRow('');
  logWhiteRow('');
  console.log(RESET);
});

/**
 * Example (weird formatting to make it compact for README.md)
 */

// @webstorm-formatter:off
// prettier-ignore
const treeData =
  { $d: 'F', $c: [
      { $d: 'B', $c: [
          { $d: 'A', $c: [] },
          { $d: 'D', $c: [
              { $d: 'C', $c: [] },
              { $d: 'E', $c: [] }] }] },
      { $d: 'G', $c: [
          null,
          { $d: 'I', $c: [
              { $d: 'H', $c: [] }] }] }] };

const traversal = new DepthFirstTraversal({
  traversableTree: {
    makeRoot: () => ({ vertexContent: treeData }),
    makeVertex: (childHint: any) => ({ vertexContent: childHint }),
  },
});
traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, (vertex) =>
  reportVisit(DepthFirstTraversalOrder.PRE_ORDER, vertex.getData()),
);
traversal.addVisitorFor(DepthFirstTraversalOrder.IN_ORDER, (vertex) =>
  reportVisit(DepthFirstTraversalOrder.IN_ORDER, vertex.getData()),
);
traversal.addVisitorFor(DepthFirstTraversalOrder.POST_ORDER, (vertex) =>
  reportVisit(DepthFirstTraversalOrder.POST_ORDER, vertex.getData()),
);
traversal.makeRunner().run();

/*
    Pre-order
    In-order
    Post-order

    F-B-A-A-A-B-D-C-C-C-D-E-E-E-D-B-F-G-G-I-H-H-H-I-I-G-F-
 */
