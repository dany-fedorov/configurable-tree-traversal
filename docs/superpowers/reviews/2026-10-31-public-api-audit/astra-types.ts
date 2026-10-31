import type { VertexContentInput, VertexTypes, VertexView, DagWorkSession, GraphWalkSource, GraphWalkLink, DagFragment, DagFragmentInstance } from '../../../../dist';
import { Vertex } from '../../../../dist';
const standalone: VertexView<VertexTypes<string,string>> = new Vertex({$data:'x',$childHints:['y']});
void standalone;
const readonlyHints = ['a'] as const;
const content: VertexContentInput<VertexTypes<string,string>> = {
  $data: 'x',
  // @ts-expect-error Frozen source hint arrays are not accepted today.
  $childHints: readonlyHints,
};
void content;
declare const session: DagWorkSession<string>;
// @ts-expect-error Coordination surface erases its known DAG inspection subtype.
void session.inspect().chains;
const broadLink: GraphWalkLink<string,number,string> = {target:{kind:'inline',vertexId:'a',resolution:{kind:'found',data:'a'}},data:1};
const linkFactory = (): GraphWalkLink<string,number,string>[] => [broadLink];
const narrowSource: Extract<GraphWalkSource<string,number,string>,{hydration:'inlineOrCached'}> = {
 hydration:'inlineOrCached',
 roots:()=>[],
 // @ts-expect-error Broad public link alias does not preserve its hydration mode.
 outgoing:linkFactory,
};
void narrowSource;
declare const fragment: DagFragment<string,string,'start'>;
const instance: DagFragmentInstance<string,string,'start'> = fragment;
void instance;
