import {
  rewriteObject,
  type ObjectRewriteOutputResult,
  type DagWorkSession,
  type DagWorkSessionControl,
  type GraphWalkHydration,
  type GraphWalkLink,
  type GraphWalkTarget,
  type GraphWalkSource,
  type VertexContentInput,
  type VertexTypes,
  type TraversalVisitorCommandArguments,
  TraversalVisitorCommandName,
} from '../src';

type T = VertexTypes<string, string>;
const readonlyContent: VertexContentInput<T> = {
  $data: 'value',
  $childHints: ['child'] as const,
};
const hints: TraversalVisitorCommandArguments<T>[TraversalVisitorCommandName.REWRITE_CHILD_HINTS] =
  { newHints: ['replacement'] as const };
void readonlyContent;
void hints;
const mode: GraphWalkHydration = 'inlineOrCached';
const target: GraphWalkTarget<string, string, typeof mode> = {
  kind: 'inline',
  vertexId: 'a',
  resolution: { kind: 'found', data: 'value' },
};
const inlineLink: GraphWalkLink<string, number, string, 'inlineOrCached'> = {
  target,
  data: 1,
};
const inlineSource: GraphWalkSource<string, number, string> = {
  hydration: mode,
  roots: () => [target],
  outgoing: () => [inlineLink],
};
void inlineSource;
const invalidTarget: GraphWalkTarget<string, string, 'resolver'> = {
  // @ts-expect-error Cache-only targets are outside resolver target vocabulary.
  kind: 'cached',
  vertexId: 'a',
};
void invalidTarget;
declare const session: DagWorkSession<string>;
const controls: DagWorkSessionControl<string> = session;
const chains = controls.inspect().chains;
void chains;
const output: ObjectRewriteOutputResult<unknown> =
  rewriteObject(null).getOutputResult();
if (output.kind === 'present') {
  const value: unknown = output.value;
  void value;
} else {
  const absent: 'absent' = output.kind;
  void absent;
}
