import {
  DepthFirstTreeTraversalBuilder,
  DepthFirstTreeVisitPhase,
} from '../src';

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

const seq: string[] = [];

function reportVisit(order: DepthFirstTreeVisitPhase, data: any) {
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
    getFgColorFor(DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION),
    'Pre-order'.padEnd(10),
    BLACK_FG,
  ].join(''),
);
logWhiteRow(
  [
    LEFT_PADDING,
    getFgColorFor(
      DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES,
    ),
    'In-order'.padEnd(10),
    BLACK_FG,
  ].join(''),
);
logWhiteRow(
  [
    LEFT_PADDING,
    getFgColorFor(DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES),
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
  { $vertexData: 'F', $childDiscoveryHints: [
      { $vertexData: 'B', $childDiscoveryHints: [
          { $vertexData: 'A', $childDiscoveryHints: [] },
          { $vertexData: 'D', $childDiscoveryHints: [
              { $vertexData: 'C', $childDiscoveryHints: [] },
              { $vertexData: 'E', $childDiscoveryHints: [] }] }] },
      { $vertexData: 'G', $childDiscoveryHints: [
          null,
          { $vertexData: 'I', $childDiscoveryHints: [
              { $vertexData: 'H', $childDiscoveryHints: [] }] }] }] };

const traversal = new DepthFirstTreeTraversalBuilder({
  treeDiscoverySource: {
    resolveRootVertex: () => ({
      kind: 'vertexResolved' as const,
      resolvedVertexInput: { vertexContentInput: treeData },
    }),
    resolveChildVertexFromHint: (childHint: any) =>
      childHint === null
        ? { kind: 'vertexIntentionallyOmitted' }
        : {
            kind: 'vertexResolved',
            resolvedVertexInput: { vertexContentInput: childHint },
          },
  },
});
traversal.registerVisitorForPhase(
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  (vertex) =>
    reportVisit(
      DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
      vertex.getVertexData(),
    ),
);
traversal.registerVisitorForPhase(
  DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES,
  (vertex) =>
    reportVisit(
      DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES,
      vertex.getVertexData(),
    ),
);
traversal.registerVisitorForPhase(
  DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
  (vertex) =>
    reportVisit(
      DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
      vertex.getVertexData(),
    ),
);
traversal
  .createIndependentRunnerFromCurrentOptions()
  .runUntilSuspendedOrTerminal();

/*
    Pre-order
    In-order
    Post-order

    F-B-A-A-A-B-D-C-C-C-D-E-E-E-D-B-F-G-G-I-H-H-H-I-I-G-F-
 */
