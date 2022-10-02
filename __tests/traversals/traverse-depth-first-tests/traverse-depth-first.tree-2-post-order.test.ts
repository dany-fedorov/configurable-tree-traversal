import { testDepthFirstTree, tree2 } from './common';

test('Tree 2: Post-order - reversed', () => {
  const {
    visited,
    visitedData,
    rootVertex,
    resolvedTreeMap,
    vertexContextMap,
  } = testDepthFirstTree(tree2, 'postOrderVisitor');
  expect(visitedData).toMatchSnapshot();
  expect(visited).toMatchSnapshot();
  expect({ rootVertex, resolvedTreeMap, vertexContextMap }).toMatchSnapshot();
});