import {
  DepthFirstTraversal,
  DepthFirstTraversalOrder,
  TraversableObjectTree,
  TraversalRunnerStatus,
  TraversalVisitorCommandName,
  traverseDepthFirst,
  type TraversalRunner,
  type TreeTypeParameters,
  type TraversableTree,
} from '../src';

type Node = { $d: string; $c: (Node | null)[] };
type Tree = TreeTypeParameters<string, Node | null>;

const root: Node = { $d: 'root', $c: [{ $d: 'leaf', $c: [] }] };
const tree: TraversableTree<Tree> = {
  makeRoot: () => ({ vertexContent: root }),
  makeVertex: (hint) => ({ vertexContent: hint }),
};

const traversal = new DepthFirstTraversal({ traversableTree: tree });
traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, () => ({
  commands: [
    {
      commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
      commandArguments: { newData: 'rewritten' },
    },
  ],
}));

const concreteRunner = traversal.makeRunner();
for (const event of concreteRunner.getIterable()) {
  const data: string = event.vertex.getData();
  void data;
}

const interfaceRunner: TraversalRunner<DepthFirstTraversalOrder, Tree, Tree> =
  traversal.makeRunner();
interfaceRunner.getIterable();
interfaceRunner.run({ iterateOver: [] });
const failedStatus: TraversalRunnerStatus = TraversalRunnerStatus.FAILED;

const convenienceRunner = traverseDepthFirst(tree, {
  postOrderVisitor: (vertex) => {
    const data: string = vertex.getData();
    void data;
  },
});
const convenienceData: string = convenienceRunner
  .getResolvedTree()
  .getRoot()!
  .unref()
  .getData();

const objectTree = new TraversableObjectTree({ answer: 42 });
const objectRunner = new DepthFirstTraversal({
  traversableTree: objectTree,
}).makeRunner();
for (const event of objectRunner.getIterable()) {
  const key: string | number | symbol = event.vertex.getData().key;
  void key;
}

void [interfaceRunner, convenienceData, failedStatus];
