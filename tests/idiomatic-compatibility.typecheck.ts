import {
  Vertex,
  MutableRef,
  traverseTreeDepthFirst,
  type TreeVertexResolution,
  type DagPrerequisiteResolution,
  type VisitorDefinition,
  type DagSettlementOutcome,
  type VertexTypes,
  type ResolvedGraphView,
  type TraversalVisitorCommand,
} from '../src';
// @ts-expect-error Removed legacy sentinel.
import { DEFER_READY } from '../src';
// @ts-expect-error Removed legacy batching policy enum.
import { TraversalVisitorFunctionResolutionStyle } from '../src';
type T = VertexTypes<string, string>;
// @ts-expect-error Canonical content is required.
new Vertex<T>({ $d: 'old', $c: [] });
const vertex = new Vertex<T>({ $data: 'canonical', $childHints: [] });
// @ts-expect-error Retired access alias.
vertex.$d;
// @ts-expect-error Retired access alias.
vertex.$c;
// @ts-expect-error Retired clone alias.
vertex.clone({ $d: 'old' });
// @ts-expect-error UUID getter has a single canonical name.
new MutableRef(vertex).getId();
declare const graph: ResolvedGraphView<T>;
// @ts-expect-error Removed graph forwarding alias.
graph.getIdOf(new MutableRef(vertex));
// @ts-expect-error Removed graph forwarding alias.
graph.getVertexById('id');
// @ts-expect-error Untagged source results are unsupported.
const found: TreeVertexResolution<T> = { vertexContent: vertex };
// @ts-expect-error Untagged omission is unsupported.
const omitted: TreeVertexResolution<T> = { vertexContent: null };
// @ts-expect-error Missing prerequisite must be explicit.
const missing: DagPrerequisiteResolution<T> = undefined;
const visitor: VisitorDefinition<() => void> = {
  visitor() {
    return undefined;
  },
  // @ts-expect-error Caller cannot set assigned registration indexes.
  addedIndex: 4,
};
// @ts-expect-error Settlement requires a tagged outcome.
const outcome: DagSettlementOutcome = { ok: true };
const command: TraversalVisitorCommand<T> = {
  // @ts-expect-error Old hint command is removed.
  commandName: 'REWRITE_VERTEX_HINTS_ON_PRE_ORDER',
  commandArguments: { newHints: [] },
};
traverseTreeDepthFirst(
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
