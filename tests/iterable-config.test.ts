import { makeEffectiveDepthFirstTraversalRunnerIterableConfig as depthConfig } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunnerIterableConfig';
import { makeEffectiveBreadthFirstTraversalRunnerIterableConfig as breadthConfig } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalRunnerIterableConfig';
import { DepthFirstTraversalOrder as DepthOrder } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalOrder';
import { BreadthFirstTraversalOrder as BreadthOrder } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalOrder';

test('effective depth-first options do not mutate future defaults', () => {
  const options = depthConfig();
  const saved = options.iterateOver.slice();
  try {
    options.iterateOver.length = 0;
    expect(depthConfig().iterateOver).toEqual([
      DepthOrder.PRE_ORDER,
      DepthOrder.IN_ORDER,
      DepthOrder.POST_ORDER,
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
    expect(breadthConfig().iterateOver).toEqual([BreadthOrder.LEVEL_ORDER]);
  } finally {
    options.iterateOver.push(...saved);
  }
});

test('caller option arrays are copied for each effective configuration', () => {
  const enable = [DepthOrder.PRE_ORDER];
  const disable = [DepthOrder.POST_ORDER];
  const options = depthConfig({
    enableVisitorFunctionsFor: enable,
    disableVisitorFunctionsFor: disable,
  });
  enable.length = 0;
  disable.length = 0;
  expect(options.enableVisitorFunctionsFor).toEqual([DepthOrder.PRE_ORDER]);
  expect(options.disableVisitorFunctionsFor).toEqual([DepthOrder.POST_ORDER]);
});
