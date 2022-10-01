import { testDepthFirstTree, tree2, Tree2TypeParameters } from './common';
import {
  DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG,
  TraversalVisitorCommandName,
  VertexContent,
} from '../../../src';

test('Tree 2: Post-order - rewriting', () => {
  const {
    visited,
    visitedData,
    rootVertex,
    resolvedTreeMap,
    vertexContextMap,
  } = testDepthFirstTree(
    tree2,
    'postOrderVisitor',
    DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG,
    (vertex: VertexContent<Tree2TypeParameters>) => {
      if (vertex.$d === 'H') {
        return {
          commands: [
            {
              commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
              commandArguments: { newData: 'H2' },
            },
          ],
        };
      }
      return;
    },
  );
  expect(visitedData).toMatchSnapshot();
  expect(visited).toMatchSnapshot();
  expect({ rootVertex, resolvedTreeMap, vertexContextMap }).toMatchSnapshot();
});
