import { ObjectPropertyTreeSource } from '@traversable-object-tree/index';
import { DepthFirstTreeTraversalBuilder } from '@depth-first-traversal/DepthFirstTraversal';
import { DepthFirstTreeVisitPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
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
  const tree = new ObjectPropertyTreeSource(obj);
  const t = new DepthFirstTreeTraversalBuilder({
    treeDiscoverySource: tree,
  });
  t.registerVisitorCallbackForPhase(DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION, (v) => {
    console.log('BEFORE_CHILD_EXPANSION', v.getVertexData());
  });
  t.registerVisitorCallbackForPhase(DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES, (v) => {
    console.log('AFTER_CHILD_SUBTREES', v.getVertexData());
    if (v.getVertexData().propertyKey === 'a') {
      return {
        commands: [
          {
            commandName: TraversalVisitorCommandName.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY,
          },
        ],
      };
    }
    return {};
  });
  t.registerVisitorCallbackForPhase(DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES, (v) => {
    console.log('AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES', v.getVertexData());
  });
  // t.run();
  // const g = t.iterateEvents();
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
  // for (const x of t.iterateEvents(false, [DepthFirstPhase.POST_ORDER])) {
  //   console.log(x.order, x.vertex.getData().key, x.vertex.getData().value);
  // }
  const runner = t.createIndependentRunnerFromCurrentOptions();
  runner.runUntilSuspendedOrTerminal();
  console.log(runner.getTraversalLifecycleStatus());
  runner.runUntilSuspendedOrTerminal();
  console.log(runner.getTraversalLifecycleStatus());
};

main();
