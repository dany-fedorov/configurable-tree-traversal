const assert = require('node:assert/strict');
const c = require('../../../../dist');
const { DepthFirstTreeTraversal, DepthFirstPhase: P, TraversalVisitorCommandName: C, Vertex, DagTraversal, createDagWorkSession } = c;
const source = (hints, omit = false) => ({
  resolveRoot: () => ({ kind: 'found', vertex: { vertexContent: { $data: 'root', $childHints: hints } } }),
  resolveChild: h => omit ? {kind:'omitted'} : ({kind:'found',vertex:{vertexContent:{$data:h,$childHints:[]}}}),
});
const omitted = new DepthFirstTreeTraversal({traversableTree:source(['x'],true)}).createRunner().run();
const oref=omitted.getResolvedTreeView().getRoot();
assert.equal(omitted.getResolvedTreeView().getChildrenOf(oref).length,0);
assert.equal(omitted.isTraversalLeaf(oref),false);
console.log('isTraversalLeaf all omitted: false; resolved children: 0');
const skipped=new DepthFirstTreeTraversal({traversableTree:source(['a','b']),visitors:{[P.IN_ORDER]: (_v,ctx)=>ctx.isTreeRoot?{commands:[{commandName:C.SKIP_REMAINING_CHILDREN}]}:undefined}}).createRunner().run();
const sref=skipped.getResolvedTreeView().getRoot();
assert.equal(skipped.getResolvedTreeView().getChildrenOf(sref).length,1);
assert.equal(skipped.isTraversalLeaf(sref),true);
console.log('isTraversalLeaf after skip: true; resolved children: 1');
const v=new Vertex({$data:'v',$childHints:['a']});
v.clone().getChildrenHints().push('b');
assert.deepEqual(v.getChildrenHints(),['a','b']);
console.log('Vertex.clone shares original hint collection');
const transformed=new DepthFirstTreeTraversal({traversableTree:source(['a']),sortChildrenHints:hs=>hs.length?['replacement']:hs}).createRunner().run();
assert.equal(transformed.getResolvedTreeView().getChildrenOf(transformed.getResolvedTreeView().getRoot())[0].getValue().getData(),'replacement');
console.log('sortChildrenHints replaces expansion membership');
const found=(id,hints=[])=>({kind:'found',vertex:{vertexId:id,vertexContent:{$data:id,$childHints:hints}}});
const runner=new DagTraversal({traversableGraph:{resolveRoot:()=>found('a'),resolveChild:id=>found(id)},workCompletion:'externalSettlement'}).createRunner();
const a=createDagWorkSession(runner), b=createDagWorkSession(runner);
const at=a.advance().workTickets[0], bt=b.advance().workTickets[0];
assert.throws(()=>b.completeWork(at),TypeError);
assert.deepEqual(a.completeWork(at),{kind:'accepted'});
assert.deepEqual(b.summary().completedWorkIds,['a']);
assert.deepEqual(b.completeWork(bt),{kind:'alreadyAccepted'});
console.log('createDagWorkSession wrappers share runner progress but reject each other\'s tickets');
for(const policy of ['none','discoveryParentWork']){
  const r=new DagTraversal({traversableGraph:{resolveRoot:()=>found('r',['child']),resolveChild:id=>found(id)},omittedWorkDependencies:policy,discovery:'eager',workCompletion:'externalSettlement'}).createRunner().prepare();
  const view=r.getResolvedGraphView();
  const deps=view.get(view.getVertexRefById('child')).dependsOnWork;
  assert.deepEqual(deps,policy==='none'?[]:['r']);
  console.log(`omittedWorkDependencies ${policy}: live child's undeclared dependsOnWork = ${JSON.stringify(deps)}`);
}
const nullRoot=c.rewriteObject(null).getOutput();
const deleted=c.rewriteObject({a:1},{rewrite:(_p,ctx)=>ctx.isTreeRoot?{kind:'delete'}:undefined}).getOutput();
assert.equal(nullRoot,null);assert.equal(deleted,null);
console.log('retained null root and deleted root both return null');
console.log('All Astra public runtime assertions passed.');
