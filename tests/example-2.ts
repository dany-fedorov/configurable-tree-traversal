import { ObjectTreeSource } from '@traversable-object-tree/index';
import { DepthFirstTreeTraversal } from '@depth-first-traversal/DepthFirstTraversal';
import { DepthFirstPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import { TraversalVisitorCommandName } from '@core/TraversalVisitor';

const obj = {
  a: 'a1',
  b: ['b1'],
  c: [{ c1: 'c11' }],
  d: [{ d1: { d11: 'd11', d12: 'd12' } }],
};

const tree = new ObjectTreeSource(obj);
const t = new DepthFirstTreeTraversal({
  traversableTree: tree,
});
t.addVisitorFor(DepthFirstPhase.PRE_ORDER, (v) => {
  console.log('PRE_ORDER', v.getData());
});
t.addVisitorFor(DepthFirstPhase.POST_ORDER, (v) => {
  console.log('POST_ORDER', v.getData());
  if (v.getData().key === 'a') {
    return {
      commands: [
        {
          commandName: TraversalVisitorCommandName.PAUSE_TRAVERSAL,
        },
      ],
    };
  }
  return {};
});
t.addVisitorFor(DepthFirstPhase.IN_ORDER, (v) => {
  console.log('IN_ORDER', v.getData());
});

const runner = t.createRunner();
runner.run();
console.log(runner.getStatus());
runner.run();
console.log(runner.getStatus());
