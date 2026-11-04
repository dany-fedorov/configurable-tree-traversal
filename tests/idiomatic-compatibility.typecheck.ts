import {
  Vertex,
  MutableValueReference,
  runTreeDepthFirstUntilSuspendedOrTerminal,
  type TreeSourceVertexResolution,
  type DagPrerequisiteLookupResult,
  type VisitorRegistrationDefinition,
  type DagSettlementOutcome,
  type VertexDataAndChildHintTypes,
  type LiveResolvedGraphView,
  type TraversalVisitorCommand,
} from '../src';
// @ts-expect-error Removed legacy sentinel.
import { DEFER_READY } from '../src';
// @ts-expect-error Removed legacy batching policy enum.
import { TraversalVisitorFunctionResolutionStyle } from '../src';
type T = VertexDataAndChildHintTypes<string, string>;
// @ts-expect-error Canonical content is required.
new Vertex<T>({ $d: 'old', $c: [] });
const vertex = new Vertex<T>({
  $vertexData: 'canonical',
  $childDiscoveryHints: [],
});
// @ts-expect-error Retired access alias.
vertex.$d;
// @ts-expect-error Retired access alias.
vertex.$c;
// @ts-expect-error Retired clone alias.
vertex.createEditableShallowCloneWithContentOverrides({ $d: 'old' });
// @ts-expect-error UUID getter has a single canonical name.
new MutableValueReference(vertex).getId();
declare const graph: LiveResolvedGraphView<T>;
// @ts-expect-error Removed graph forwarding alias.
graph.getIdOf(new MutableValueReference(vertex));
// @ts-expect-error Removed graph forwarding alias.
graph.getVertexById('id');
// @ts-expect-error Untagged source results are unsupported.
const found: TreeSourceVertexResolution<T> = { vertexContent: vertex };
// @ts-expect-error Untagged omission is unsupported.
const omitted: TreeSourceVertexResolution<T> = { vertexContent: null };
// @ts-expect-error Missing prerequisite must be explicit.
const missing: DagPrerequisiteLookupResult<T> = undefined;
const visitor: VisitorRegistrationDefinition<() => void> = {
  visitor() {
    return undefined;
  },
  // @ts-expect-error Caller cannot set assigned registration indexes.
  phaseRegistrationInsertionIndex: 4,
};
// @ts-expect-error Settlement requires a tagged outcome.
const outcome: DagSettlementOutcome = { ok: true };
const command: TraversalVisitorCommand<T> = {
  // @ts-expect-error Old hint command is removed.
  commandName: 'REWRITE_VERTEX_HINTS_ON_PRE_ORDER',
  commandArguments: { replacementChildHints: [] },
};
runTreeDepthFirstUntilSuspendedOrTerminal(
  {
    resolveRoot: () => ({ kind: 'omitted' }),
    resolveChild: () => ({ kind: 'omitted' }),
  },
  // @ts-expect-error Convenience helpers accept one options argument.
  null,
);
void [
  found,
  omitted,
  missing,
  visitor,
  outcome,
  command,
  DEFER_READY,
  TraversalVisitorFunctionResolutionStyle,
];
