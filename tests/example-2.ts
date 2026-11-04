import { ObjectPropertyTreeSource } from '@traversable-object-tree/index';
import { DepthFirstTreeTraversalBuilder } from '@depth-first-traversal/DepthFirstTraversal';
import { DepthFirstTreeVisitPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import { TraversalVisitorCommandName } from '@core/TraversalVisitor';

const obj = {
  a: 'a1',
  b: ['b1'],
  c: [{ c1: 'c11' }],
  d: [{ d1: { d11: 'd11', d12: 'd12' } }],
};

const tree = new ObjectPropertyTreeSource(obj);
const t = new DepthFirstTreeTraversalBuilder({
  treeDiscoverySource: tree,
});
t.registerVisitorForPhase(DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION, (v) => {
  console.log('BEFORE_CHILD_EXPANSION', v.getVertexData());
});
t.registerVisitorForPhase(DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES, (v) => {
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
t.registerVisitorForPhase(DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES, (v) => {
  console.log('AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES', v.getVertexData());
});

const runner = t.createIndependentRunnerFromCurrentOptions();
runner.runUntilSuspendedOrTerminal();
console.log(runner.getTraversalLifecycleStatus());
runner.runUntilSuspendedOrTerminal();
console.log(runner.getTraversalLifecycleStatus());
