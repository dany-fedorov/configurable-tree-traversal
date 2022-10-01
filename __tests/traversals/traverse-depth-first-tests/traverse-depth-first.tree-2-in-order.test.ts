import { testDepthFirstTree, tree2 } from './common';

test('Tree 2: In-order', () => {
  const {
    visited,
    visitedData,
    rootVertex,
    resolvedTreeMap,
    vertexContextMap,
  } = testDepthFirstTree(tree2, 'inOrderVisitor');
  expect(visitedData).toMatchSnapshot();
  expect(visited).toMatchSnapshot();
  expect({ rootVertex, resolvedTreeMap, vertexContextMap }).toMatchSnapshot();
});
