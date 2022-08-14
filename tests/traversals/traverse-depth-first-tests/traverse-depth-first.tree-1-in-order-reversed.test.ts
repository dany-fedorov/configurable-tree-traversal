import { testDepthFirstTree, tree1 } from './common';
import { ChildrenOrder } from '../../../src/traversals/traverse-depth-first';

test('Tree 1: In-order - reversed', () => {
  const {
    visited,
    visitedData,
    rootVertex,
    resolvedTreeMap,
    vertexContextMap,
  } = testDepthFirstTree(tree1, 'inOrderVisitor', {
    childrenOrder: ChildrenOrder.REVERSED,
  });
  expect(visitedData).toMatchSnapshot();
  expect(visited).toMatchSnapshot();
  expect({ rootVertex, resolvedTreeMap, vertexContextMap }).toMatchSnapshot();
});
