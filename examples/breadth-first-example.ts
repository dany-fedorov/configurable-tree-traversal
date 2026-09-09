import { TraversableObjectTree } from '../src/traversable-tree-implementations/traversable-object-tree';
import {
  BreadthFirstTraversal,
  BreadthFirstTraversalOrder,
} from '../src/traversals/breadth-first-traversal';

const input = {
  first: { firstChild: 1 },
  second: { secondChild: 2 },
};

const traversal = new BreadthFirstTraversal({
  traversableTree: new TraversableObjectTree(input),
});

traversal.addVisitorFor(BreadthFirstTraversalOrder.LEVEL_ORDER, (vertex) =>
  console.log(vertex.getData()),
);

traversal.makeRunner().run();
