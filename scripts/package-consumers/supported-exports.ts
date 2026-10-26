import type {
  GraphWalkOperation,
  GraphWalkInspection,
  VertexTypes,
  DepthFirstTreeOptions,
  AsyncDagOptionsPatch,
} from 'configurable-tree-traversal';
import { materializeDagSourceFromRecords } from 'configurable-tree-traversal/sources';
import { materializeDagSourceFromRecords as rootMaterializer } from 'configurable-tree-traversal';
const materializer: typeof rootMaterializer = materializeDagSourceFromRecords;
const operations: GraphWalkOperation[] = [
  'roots',
  'rootNext',
  'resolveVertex',
  'outgoing',
  'edgeNext',
  'shouldFollowEdge',
  'shouldExpandVertex',
  'visitor',
  'iteratorReturn',
];
const operation: GraphWalkOperation = (null as unknown as GraphWalkInspection)
  .pendingRequests[0]!.operation;
// @ts-expect-error predicate diagnostics match public callback names
const oldOperation: GraphWalkOperation = 'followEdge';
const options: DepthFirstTreeOptions<VertexTypes> = {
  traversableTree: {
    resolveRoot: () => ({ kind: 'omitted' }),
    resolveChild: () => ({ kind: 'omitted' }),
  },
};
const patch: AsyncDagOptionsPatch<VertexTypes> = { concurrency: 2 };
void [materializer, operations, operation, oldOperation, options, patch];
// @ts-expect-error unsupported package path must not resolve
import * as denied0 from 'configurable-tree-traversal/core/TraversalKernel';
// @ts-expect-error unsupported package path must not resolve
import * as denied1 from 'configurable-tree-traversal/core/TraversalKernel.js';
// @ts-expect-error unsupported package path must not resolve
import * as denied2 from 'configurable-tree-traversal/core/drivers/runAsync';
// @ts-expect-error unsupported package path must not resolve
import * as denied3 from 'configurable-tree-traversal/core/drivers/runAsync.js';
// @ts-expect-error unsupported package path must not resolve
import * as denied4 from 'configurable-tree-traversal/core/graph/GraphStore';
// @ts-expect-error unsupported package path must not resolve
import * as denied5 from 'configurable-tree-traversal/core/graph/GraphStore.js';
// @ts-expect-error unsupported package path must not resolve
import * as denied6 from 'configurable-tree-traversal/core/Vertex';
// @ts-expect-error unsupported package path must not resolve
import * as denied7 from 'configurable-tree-traversal/core/Vertex.js';
// @ts-expect-error unsupported package path must not resolve
import * as denied8 from 'configurable-tree-traversal/traversals/depth-first-traversal/lib/DepthFirstTraversalRunnerState';
// @ts-expect-error unsupported package path must not resolve
import * as denied9 from 'configurable-tree-traversal/traversals/depth-first-traversal/lib/DepthFirstTraversalRunnerState.js';
// @ts-expect-error unsupported package path must not resolve
import * as denied10 from 'configurable-tree-traversal/traversals/dag-traversal/lib/DagTraversalRunner';
// @ts-expect-error unsupported package path must not resolve
import * as denied11 from 'configurable-tree-traversal/traversals/dag-traversal/lib/DagTraversalRunner.js';
// @ts-expect-error unsupported package path must not resolve
import * as denied12 from 'configurable-tree-traversal/traversals/graph-walk/lib/WalkEffects';
// @ts-expect-error unsupported package path must not resolve
import * as denied13 from 'configurable-tree-traversal/traversals/graph-walk/lib/WalkEffects.js';
// @ts-expect-error unsupported package path must not resolve
import * as denied14 from 'configurable-tree-traversal/traversals/graph-walk/GraphWalkRunner';
// @ts-expect-error unsupported package path must not resolve
import * as denied15 from 'configurable-tree-traversal/traversals/graph-walk/GraphWalkRunner.js';
// @ts-expect-error unsupported package path must not resolve
import * as denied16 from 'configurable-tree-traversal/utils/deepFreeze';
// @ts-expect-error unsupported package path must not resolve
import * as denied17 from 'configurable-tree-traversal/utils/deepFreeze.js';
// @ts-expect-error unsupported package path must not resolve
import * as denied18 from 'configurable-tree-traversal/dist/core/TraversalKernel';
// @ts-expect-error unsupported package path must not resolve
import * as denied19 from 'configurable-tree-traversal/dist/core/TraversalKernel.js';
// @ts-expect-error unsupported package path must not resolve
import * as denied20 from 'configurable-tree-traversal/dist/index';
// @ts-expect-error unsupported package path must not resolve
import * as denied21 from 'configurable-tree-traversal/dist/index.js';
// @ts-expect-error unsupported package path must not resolve
import * as denied22 from 'configurable-tree-traversal/dist/traversals/graph-walk/lib/WalkEffects';
// @ts-expect-error unsupported package path must not resolve
import * as denied23 from 'configurable-tree-traversal/dist/traversals/graph-walk/lib/WalkEffects.js';
// @ts-expect-error engine and legacy scaffolding is not a supported root contract
import type { DepthFirstTreeResolvedOptions } from 'configurable-tree-traversal';
// @ts-expect-error engine and legacy scaffolding is not a supported root contract
import type { DagResolvedOptions } from 'configurable-tree-traversal';
// @ts-expect-error engine and legacy scaffolding is not a supported root contract
import type { DepthFirstTraversalRunnerState } from 'configurable-tree-traversal';
// @ts-expect-error engine and legacy scaffolding is not a supported root contract
import type { DepthFirstTraversalRunnerInternalObjects } from 'configurable-tree-traversal';
// @ts-expect-error engine and legacy scaffolding is not a supported root contract
import type { MakeVertexResult } from 'configurable-tree-traversal';
// @ts-expect-error engine and legacy scaffolding is not a supported root contract
import type { MakeTreeVertexResult } from 'configurable-tree-traversal';
// @ts-expect-error engine and legacy scaffolding is not a supported root contract
import type { normalizeVertexContent } from 'configurable-tree-traversal';
// @ts-expect-error engine and legacy scaffolding is not a supported root contract
import type { DEFAULT_VISITOR_PRIORITY } from 'configurable-tree-traversal';
// @ts-expect-error engine and legacy scaffolding is not a supported root contract
import type { TraversalRunnerIterableConfig } from 'configurable-tree-traversal';
// @ts-expect-error engine and legacy scaffolding is not a supported root contract
import type { TraversalVisitorFunctionResolutionStyle } from 'configurable-tree-traversal';
// @ts-expect-error engine and legacy scaffolding is not a supported root contract
import type { WalkAction } from 'configurable-tree-traversal';
// @ts-expect-error engine and legacy scaffolding is not a supported root contract
import type { KernelInspection } from 'configurable-tree-traversal';
// @ts-expect-error engine and legacy scaffolding is not a supported root contract
import type { mergeInstanceConfigs } from 'configurable-tree-traversal';
// @ts-expect-error engine and legacy scaffolding is not a supported root contract
import type { __REWRITE_OBJECT_DEFAULT_ROOT_KEY__ } from 'configurable-tree-traversal';
// @ts-expect-error curated subpaths do not restore engine contracts
import type { DagResolvedOptions as SubpathDagResolvedOptions } from 'configurable-tree-traversal/traversals/dag-traversal';
// @ts-expect-error curated subpaths do not restore engine contracts
import type { DepthFirstTreeResolvedOptions as SubpathDepthFirstTreeResolvedOptions } from 'configurable-tree-traversal/traversals/depth-first-traversal';
// @ts-expect-error curated subpaths do not restore engine contracts
import type { BreadthFirstTraversalRunnerState as SubpathBreadthFirstTraversalRunnerState } from 'configurable-tree-traversal/traversals/breadth-first-traversal';
// @ts-expect-error curated subpaths do not restore engine contracts
import type { ObjectTreeResolvedOptions as SubpathObjectTreeResolvedOptions } from 'configurable-tree-traversal/traversable-tree-implementations/traversable-object-tree';
// @ts-expect-error curated subpaths do not restore engine contracts
import type { WalkAction as SubpathWalkAction } from 'configurable-tree-traversal/traversals/graph-walk';
// @ts-expect-error curated subpaths do not restore engine contracts
import type { normalizeVertexContent as SubpathnormalizeVertexContent } from 'configurable-tree-traversal/core';
// @ts-expect-error curated subpaths do not restore engine contracts
import type { __REWRITE_OBJECT_DEFAULT_ROOT_KEY__ as Subpath__REWRITE_OBJECT_DEFAULT_ROOT_KEY__ } from 'configurable-tree-traversal/tools/rewrite-object';

// The minimum compiler must preserve walking enum-to-event literal mapping.
import type { EmissionKind, GraphWalkPhase } from 'configurable-tree-traversal';
type WalkKinds = 'vertex' | 'edge' | 'path';
const widenKinds = (value: EmissionKind<GraphWalkPhase>): WalkKinds => value;
const narrowKinds = (value: WalkKinds): EmissionKind<GraphWalkPhase> => value;
void [widenKinds, narrowKinds];

import { ResolvedTreeStore } from 'configurable-tree-traversal';
// @ts-expect-error public tree editing does not grant graph-engine access
new ResolvedTreeStore<VertexTypes>().getGraphStore();
// @ts-expect-error the internal tree bridge is not an exported package path
import * as treeCapability from 'configurable-tree-traversal/core/graph/treeStoreCapabilities';
// @ts-expect-error the internal tree bridge is not an exported package path
import * as explicitTreeCapability from 'configurable-tree-traversal/core/graph/treeStoreCapabilities.js';
