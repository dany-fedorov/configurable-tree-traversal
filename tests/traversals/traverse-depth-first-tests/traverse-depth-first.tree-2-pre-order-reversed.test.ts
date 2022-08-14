import { testDepthFirstTree, tree2 } from './common';
import { ChildrenOrder } from '../../../src/traversals/traverse-depth-first';

test('Tree 1: Pre-order - reversed', () => {
  const {
    visited,
    visitedData,
    rootVertex,
    resolvedTreeMap,
    vertexContextMap,
  } = testDepthFirstTree(tree2, 'preOrderVisitor', {
    childrenOrder: ChildrenOrder.REVERSED,
  });
  expect(visitedData).toMatchSnapshot();
  expect(visited).toMatchSnapshot();
  expect({ rootVertex, resolvedTreeMap, vertexContextMap }).toMatchSnapshot();
});
