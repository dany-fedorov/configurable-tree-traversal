import {
  ObjectTreeSource,
  BreadthFirstTreeTraversal,
  BreadthFirstPhase,
} from '../src';

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
