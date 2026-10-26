import { ObjectTreeSource } from '../src/traversable-tree-implementations/traversable-object-tree';
import {
  BreadthFirstTreeTraversal,
  BreadthFirstPhase,
} from '../src/traversals/breadth-first-traversal';

const input = {
  first: { firstChild: 1 },
  second: { secondChild: 2 },
};

const traversal = new BreadthFirstTreeTraversal({
  traversableTree: new ObjectTreeSource(input),
});

traversal.addVisitorFor(BreadthFirstPhase.LEVEL_ORDER, (vertex) =>
  console.log(vertex.getData()),
);

traversal.createRunner().run();
