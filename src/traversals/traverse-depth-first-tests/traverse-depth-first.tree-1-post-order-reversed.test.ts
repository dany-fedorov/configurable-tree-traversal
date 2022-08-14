import { testDepthFirstTree, tree1 } from './common';
import { ChildrenOrder } from '../traverse-depth-first';

test('Tree 1: Post-order - reversed', () => {
  const {
    visited,
    visitedData,
    rootVertex,
    resolvedTreeMap,
    vertexContextMap,
  } = testDepthFirstTree(tree1, 'postOrderVisitor', {
    childrenOrder: ChildrenOrder.REVERSED,
  });
  expect(visitedData).toMatchSnapshot();
  expect(visited).toMatchSnapshot();
  expect({ rootVertex, resolvedTreeMap, vertexContextMap }).toMatchSnapshot();
});
