import {Vertex, type VertexView, type VertexTypes, type GraphWalkLink, type GraphWalkSource, type DagWorkSession} from '/home/df/wd/personal/configurable-tree-traversal/dist';
const editable = new Vertex<VertexTypes<string,string>>({$data:'x',$childHints:['a']});
const observed: VertexView<VertexTypes<string,string>> = editable;
observed.clone().getChildrenHints().push('b');
// @ts-expect-error Readonly hint tuples are rejected by the input contract.
new Vertex<VertexTypes<string,string>>({$data:'x',$childHints:['a'] as const});
declare const session: DagWorkSession<string>;
// @ts-expect-error Session inspection loses concrete DAG chain details.
session.inspect().chains;
const link: GraphWalkLink<string,string,string> = {target:{kind:'inline',vertexId:'a',resolution:{kind:'found',data:'value'}},data:'edge'};
// @ts-expect-error broad Link alias does not encode inlineOrCached hydration.
const source: GraphWalkSource<string,string,string> = {
 hydration:'inlineOrCached', roots:()=>[],
 outgoing:()=>[link]
};
void source;
