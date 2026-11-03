import {
  rewriteObject,
  type ObjectRewriteOutputResult,
  type DagExternalWorkSession,
  type DagExternalWorkSessionControl,
  type GraphWalkVertexResolutionMode,
  type GraphWalkOutgoingLink,
  type GraphWalkVertexResolutionTarget,
  type GraphWalkDiscoverySource,
  type VertexContentInput,
  type VertexDataAndChildHintTypes,
  type TraversalVisitorCommandArguments,
  TraversalVisitorCommandName,
} from '../src';

type T = VertexDataAndChildHintTypes<string, string>;
const readonlyContent: VertexContentInput<T> = {
  $vertexData: 'value',
  $childDiscoveryHints: ['child'] as const,
};
const hints: TraversalVisitorCommandArguments<T>[TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_CHILD_HINTS] =
  { replacementChildHints: ['replacement'] as const };
void readonlyContent;
void hints;
const mode: GraphWalkVertexResolutionMode =
  'inlineResolutionOrPreviouslyAdmittedVertex';
const target: GraphWalkVertexResolutionTarget<string, string, typeof mode> = {
  kind: 'inlineResolution',
  vertexId: 'a',
  resolutionIfNotPreviouslyAdmitted: { kind: 'found', vertexData: 'value' },
};
const inlineLink: GraphWalkOutgoingLink<
  string,
  number,
  string,
  'inlineResolutionOrPreviouslyAdmittedVertex'
> = {
  targetToResolveOnAdmission: target,
  edgeData: 1,
};
const inlineSource: GraphWalkDiscoverySource<string, number, string> = {
  vertexResolutionMode: mode,
  enumerateRootTargets: () => [target],
  enumerateOutgoingLinks: () => [inlineLink],
};
void inlineSource;
const invalidTarget: GraphWalkVertexResolutionTarget<
  string,
  string,
  'resolverWithOptionalInlineResolution'
> = {
  // @ts-expect-error Cache-only targets are outside resolver target vocabulary.
  kind: 'previouslyAdmittedVertex',
  vertexId: 'a',
};
void invalidTarget;
declare const session: DagExternalWorkSession<string>;
const controls: DagExternalWorkSessionControl<string> = session;
const chains = controls.captureExecutionSnapshot().vertexPhaseVisitorChains;
void chains;
const output: ObjectRewriteOutputResult<unknown> =
  rewriteObject(null).getFinalOutputResult();
if (output.kind === 'present') {
  const value: unknown = output.value;
  void value;
} else {
  const absent: 'absent' = output.kind;
  void absent;
}
