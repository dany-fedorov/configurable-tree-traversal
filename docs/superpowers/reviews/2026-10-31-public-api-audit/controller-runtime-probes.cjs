const c=require('/home/df/wd/personal/configurable-tree-traversal/dist');
const v=new c.Vertex({$data:'root',$childHints:['a']});
const clone=v.clone();clone.getChildrenHints().push('b');
console.log('standalone clone shares hints:',v.getChildrenHints()===clone.getChildrenHints(),v.getChildrenHints());
const source={resolveRoot:()=>({kind:'found',vertex:{vertexContent:{$data:'root',$childHints:['a']}}}),resolveChild:(hint)=>({kind:'found',vertex:{vertexContent:{$data:hint,$childHints:[]}}})};
const seen=[];new c.DepthFirstTreeTraversal({traversableTree:source,sortChildrenHints:h=>h.length?['replacement']:h,visitors:{PRE_ORDER:v=>{seen.push(v.getData())}}}).createRunner().run();console.log('sorter replacement traversal:',seen);
console.log('rewrite null output',c.rewriteObject(null).getOutput());
console.log('rewrite deleted root output',c.rewriteObject(1,{rewrite:()=>({kind:'delete'})}).getOutput());
for(const legacy of [undefined,{vertexContent:null}]) {
 const source={resolveRoot:()=>({kind:'found',vertex:{vertexId:'root',dependsOnWork:['p'],vertexContent:{$data:'root',$childHints:[]}}}),resolveChild:()=>({kind:'omitted',satisfiesDependencies:true}),resolvePrerequisite:()=>legacy};
 try {new c.DagTraversal({traversableGraph:source,discovery:'eager'}).createRunner().prepare();console.log('legacy lookup unexpectedly accepted');} catch(e) {console.log('legacy lookup rejected:',e.constructor.name,e.message);}
}
try {c.rewriteObject({}, {isComposite:()=>true});} catch(e) {console.log('isComposite option rejected:',e.constructor.name,e.message);}
