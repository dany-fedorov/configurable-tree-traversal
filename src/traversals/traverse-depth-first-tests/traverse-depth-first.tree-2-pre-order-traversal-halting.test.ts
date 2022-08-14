import { testDepthFirstTree, tree2 } from './common';
import { ChildrenOrder } from '../traverse-depth-first';
import { TraversalVisitorCommand } from '../../types';

test('Tree 1: Pre-order - halting', () => {
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
          command: TraversalVisitorCommand.HALT_TRAVERSAL,
        };
      }
      return;
    },
  );
  expect(visitedData).toMatchSnapshot();
  expect(visited).toMatchSnapshot();
  expect({ rootVertex, resolvedTreeMap, vertexContextMap }).toMatchSnapshot();
});
