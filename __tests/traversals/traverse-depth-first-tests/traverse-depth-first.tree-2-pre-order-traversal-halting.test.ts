import { testDepthFirstTree, tree2 } from './common';
import { ChildrenOrder } from '../../../src/traversals/traverse-depth-first';
import { TraversalVisitorCommandName } from '../../../src/types';

test('Tree 2: Pre-order - halting', () => {
  const {
    visited,
    visitedData,
    rootVertex,
    resolvedTreeMap,
    vertexContextMap,
  } = testDepthFirstTree(
    tree2,
    'preOrderVisitor',
    {
      childrenOrder: ChildrenOrder.DEFAULT,
    },
    (vertex) => {
      if (vertex.$d === 'C') {
        return {
          commands: [
            { commandName: TraversalVisitorCommandName.HALT_TRAVERSAL },
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
