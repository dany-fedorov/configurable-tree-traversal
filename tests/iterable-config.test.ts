import { makeEffectiveDepthFirstTraversalRunnerIterableConfig as depthConfig } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunnerIterableConfig';
import { makeEffectiveBreadthFirstTraversalRunnerIterableConfig as breadthConfig } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalRunnerIterableConfig';
import { DepthFirstTreeVisitPhase as DepthOrder } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalOrder';
import { BreadthFirstTreeVisitPhase as BreadthOrder } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalOrder';

test('effective depth-first options do not mutate future defaults', () => {
  const options = depthConfig();
  const saved = options.iterateOver.slice();
  try {
    options.iterateOver.length = 0;
    expect(depthConfig().iterateOver).toEqual([
      DepthOrder.BEFORE_CHILD_EXPANSION,
      DepthOrder.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES,
      DepthOrder.AFTER_CHILD_SUBTREES,
    ]);
  } finally {
    options.iterateOver.push(...saved);
  }
});

test('effective breadth-first options do not mutate future defaults', () => {
  const options = breadthConfig();
  const saved = options.iterateOver.slice();
  try {
    options.iterateOver.length = 0;
    expect(breadthConfig().iterateOver).toEqual([BreadthOrder.AT_LEVEL_ORDER_VERTEX]);
  } finally {
    options.iterateOver.push(...saved);
  }
});

test('caller option arrays are copied for each effective configuration', () => {
  const enable = [DepthOrder.BEFORE_CHILD_EXPANSION];
  const disable = [DepthOrder.AFTER_CHILD_SUBTREES];
  const options = depthConfig({
    admittedVisitorCallbackPhases: { include: enable },
  });
  enable.length = 0;
  const excluded = depthConfig({ admittedVisitorCallbackPhases: { exclude: disable } });
  disable.length = 0;
  expect(options.enableVisitorFunctionsFor).toEqual([DepthOrder.BEFORE_CHILD_EXPANSION]);
  expect(excluded.disableVisitorFunctionsFor).toEqual([DepthOrder.AFTER_CHILD_SUBTREES]);
});
