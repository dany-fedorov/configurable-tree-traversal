import { TraversableObjectTree } from '@traversable-object-tree/index';
import { DepthFirstTraversal } from '@depth-first-traversal/DepthFirstTraversal';
import { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import { TraversalVisitorCommandName } from '@core/TraversalVisitor';

const obj = {
  a: 'a1',
  b: ['b1'],
  c: [{ c1: 'c11' }],
  d: [{ d1: { d11: 'd11', d12: 'd12' } }],
};

const tree = new TraversableObjectTree(obj);
const t = new DepthFirstTraversal({
  traversableTree: tree,
});
t.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, (v) => {
  console.log('PRE_ORDER', v.getData());
});
t.addVisitorFor(DepthFirstTraversalOrder.POST_ORDER, (v) => {
  console.log('POST_ORDER', v.getData());
  if (v.getData().key === 'a') {
    return {
      commands: [
        {
          commandName: TraversalVisitorCommandName.HALT_TRAVERSAL,
        },
      ],
    };
  }
  return {};
});
t.addVisitorFor(DepthFirstTraversalOrder.IN_ORDER, (v) => {
  console.log('IN_ORDER', v.getData());
});

t.run();
console.log(t.getStatus());
t.run();
console.log(t.getStatus());
