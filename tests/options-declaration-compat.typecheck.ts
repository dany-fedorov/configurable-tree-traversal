// Public patches accept explicitly undefined fields under exact optional types.
import type {
  VertexDataAndChildHintTypes,
  DepthFirstTreeTraversalBuilderOptionsPatch,
  AsyncDepthFirstTreeTraversalBuilderOptionsPatch,
  BreadthFirstTreeTraversalBuilderOptionsPatch,
  AsyncBreadthFirstTreeTraversalBuilderOptionsPatch,
  DagTraversalBuilderOptionsPatch,
  AsyncDagTraversalBuilderOptionsPatch,
  DepthFirstChildBoundaryVisitOptions,
} from '../src';
import type { VisitorDefinitionsByPhase } from '../src/core/TraversalVisitor';
import type { DepthFirstTreeResolvedOptions } from '../src/traversals/depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type { AsyncDepthFirstTreeResolvedOptions } from '../src/traversals/depth-first-traversal/lib/AsyncDepthFirstTraversalInstanceConfig';
import type { BreadthFirstTreeResolvedOptions } from '../src/traversals/breadth-first-traversal/lib/BreadthFirstTraversalInstanceConfig';
import type { AsyncBreadthFirstTreeResolvedOptions } from '../src/traversals/breadth-first-traversal/lib/AsyncBreadthFirstTraversalInstanceConfig';
import type { DagResolvedOptions } from '../src/traversals/dag-traversal/lib/DagTraversalInstanceConfig';
import type { AsyncDagResolvedOptions } from '../src/traversals/dag-traversal/lib/AsyncDagTraversalInstanceConfig';

type Assert<T extends true> = T;
type SameShape<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : false
  : false;
type UndefinedPatch<T> = { [K in keyof T]?: T[K] | undefined };
type HistoricalPatch<T extends { visitors: object }> = UndefinedPatch<
  Omit<T, 'visitors' | 'traversalRunnerInternalObjects' | 'childBoundaryVisits'>
> & {
  visitors?: VisitorDefinitionsByPhase<T['visitors']> | undefined;
};
type HistoricalDagPatch<T extends { visitors: object }> = Omit<
  HistoricalPatch<T>,
  'treeDiscoverySource' | 'dagDiscoverySource'
>;
export type InputCompatibility = [
  Assert<
    SameShape<
      DepthFirstTreeTraversalBuilderOptionsPatch,
      HistoricalPatch<
        DepthFirstTreeResolvedOptions<
          VertexDataAndChildHintTypes,
          VertexDataAndChildHintTypes
        >
      > & {
        childBoundaryVisits?:
          | UndefinedPatch<DepthFirstChildBoundaryVisitOptions>
          | undefined;
      }
    >
  >,
  Assert<
    SameShape<
      AsyncDepthFirstTreeTraversalBuilderOptionsPatch,
      HistoricalPatch<
        AsyncDepthFirstTreeResolvedOptions<VertexDataAndChildHintTypes>
      > & {
        childBoundaryVisits?:
          | UndefinedPatch<DepthFirstChildBoundaryVisitOptions>
          | undefined;
      }
    >
  >,
  Assert<
    SameShape<
      BreadthFirstTreeTraversalBuilderOptionsPatch,
      HistoricalPatch<
        BreadthFirstTreeResolvedOptions<VertexDataAndChildHintTypes>
      >
    >
  >,
  Assert<
    SameShape<
      AsyncBreadthFirstTreeTraversalBuilderOptionsPatch,
      HistoricalPatch<
        AsyncBreadthFirstTreeResolvedOptions<VertexDataAndChildHintTypes>
      >
    >
  >,
  Assert<
    SameShape<
      Omit<
        DagTraversalBuilderOptionsPatch,
        'treeDiscoverySource' | 'dagDiscoverySource'
      >,
      HistoricalDagPatch<DagResolvedOptions>
    >
  >,
  Assert<
    SameShape<
      Omit<
        AsyncDagTraversalBuilderOptionsPatch,
        'treeDiscoverySource' | 'dagDiscoverySource'
      >,
      HistoricalDagPatch<AsyncDagResolvedOptions>
    >
  >,
];
