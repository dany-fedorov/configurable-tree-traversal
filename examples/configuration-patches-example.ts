import {
  DepthFirstTreeTraversal,
  ObjectTreeSource,
  DepthFirstPhase,
} from '../src';

const traversal = new DepthFirstTreeTraversal({
  traversableTree: new ObjectTreeSource(['a', 'b', 'c', 'd']),
  inOrder: { afterChildIndices: { indices: [0, 2] } },
});
traversal.configure({
  traversableTree: undefined,
  inOrder: {
    afterChildIndices: undefined,
    fallbackChildIndices: { indices: [-1] },
  },
  visitors: { IN_ORDER: undefined },
});
const boundaries = [
  ...traversal
    .createRunner()
    .iterateEvents({ emitEvents: [DepthFirstPhase.IN_ORDER] }),
];
console.log(boundaries.map((event) => event.vertex.getData().key));
