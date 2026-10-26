import { ObjectTreeSource } from '../src/traversable-tree-implementations/traversable-object-tree';
import {
  BreadthFirstTreeTraversal,
  BreadthFirstTraversalOrder,
} from '../src/traversals/breadth-first-traversal';

const input = {
  first: { firstChild: 1 },
  second: { secondChild: 2 },
};

const traversal = new BreadthFirstTreeTraversal({
  traversableTree: new ObjectTreeSource(input),
});

traversal.addVisitorFor(BreadthFirstTraversalOrder.LEVEL_ORDER, (vertex) =>
  console.log(vertex.getData()),
);

traversal.createRunner().run();
