import {
  VertexTypes, createObjectMutationBinder, traverseTreeDepthFirst,
  DepthFirstPhase, TraversalVisitorCommandName, rewriteObject,
} from '/home/df/.codex/worktrees/04b4/configurable-tree-traversal/dist/index';
type Prop = { key: string; value: number; note: string };
type Types = VertexTypes<Prop, Prop>;
const bind = createObjectMutationBinder<Types, Types>();
const runner = traverseTreeDepthFirst<Types>({
  traversableTree: {
    resolveRoot: () => ({ kind: 'found', vertex: { vertexContent: {
      $data: { key: 'root', value: 1, note: 'old' }, $childHints: [],
    } } }),
    resolveChild: () => ({ kind: 'omitted' }),
  },
  visitors: { [DepthFirstPhase.POST_ORDER]: (vertex, context) => ({ commands: [
    bind(vertex, context).makeMutationCommand({ rewrite: { note: 'new' } }),
  ] }) },
});
console.log('typed patch requested note=new; actual note=', runner.getResolvedTreeView().getRoot()!.getValue().$data.note);
rewriteObject<number, PropertyKey, number, unknown, PropertyKey, string>(1, {
  visitors: { [DepthFirstPhase.PRE_ORDER]: vertex => ({ commands: [{
    commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
    commandArguments: { newData: { key: vertex.$data.key, value: 'changed' } },
  }] }) },
  rewrite(prop, context) {
    const declaredNumber: number = prop.value;
    console.log('rewrite value declared number; actual type=', typeof declaredNumber);
    console.log('rewrite context vertex declared input; actual type=', typeof context.vertex.$data.value);
    return undefined;
  },
});
