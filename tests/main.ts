import { TraversableObjectTree } from '@traversable-object-tree/index';
import { DepthFirstTraversal } from '@depth-first-traversal/DepthFirstTraversal';
import { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import { TraversalVisitorCommandName } from '@core/TraversalVisitor';

const main = () => {
  const obj = {
    a: 1,
    b: 2,
    // c: [1, 2, 1, 3],
    // d: { d1: { d2: 'heh' }, d11: { d22: { d33: { d44: 'heh-deep' } } } },
    // e: 'fef',
    // f: { f1: { f2: 'heh' } },
    // g: [{ g1: 123, g11: { g22: [1, 2, 3, 4, 3, 2, 1] } }],
  };
  const tree = new TraversableObjectTree({
    inputObject: obj,
  });
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
  // t.run();
  // const g = t.getIterable();
  // let r;
  // r = g.next();
  // console.log(r);
  // r = g.next();
  // console.log(r);
  // r = g.next();
  // console.log(r);
  // r = g.next();
  // console.log(r);
  // r = g.next();
  // console.log(r);
  // for (const x of t.getIterable(false, [DepthFirstTraversalOrder.POST_ORDER])) {
  //   console.log(x.order, x.vertex.getData().key, x.vertex.getData().value);
  // }
  t.run();
  console.log(t.getStatus());
  t.run();
  console.log(t.getStatus());
};

main();
