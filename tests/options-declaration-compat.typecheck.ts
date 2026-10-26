// The public declaration migration must preserve both directions of input
// assignability while removing dependence on the normalized engine types.
import type {
  VertexTypes,
  DepthFirstTreeOptionsPatch,
  AsyncDepthFirstTreeOptionsPatch,
  BreadthFirstTreeOptionsPatch,
  AsyncBreadthFirstTreeOptionsPatch,
  DagOptionsPatch,
  AsyncDagOptionsPatch,
  InOrderOptions,
} from '../src';
import type { VisitorInputs } from '../src/core/TraversalVisitor';
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
type HistoricalPatch<T extends { visitors: object }> = Partial<
  Omit<T, 'visitors' | 'traversalRunnerInternalObjects' | 'inOrder'>
> & {
  visitors?: VisitorInputs<T['visitors']>;
};
type HistoricalDagPatch<T extends { visitors: object }> = Omit<
  HistoricalPatch<T>,
  'traversableTree' | 'traversableGraph'
>;
export type InputCompatibility = [
  Assert<
    SameShape<
      DepthFirstTreeOptionsPatch,
      HistoricalPatch<
        DepthFirstTreeResolvedOptions<VertexTypes, VertexTypes>
      > & { inOrder?: Partial<InOrderOptions> }
    >
  >,
  Assert<
    SameShape<
      AsyncDepthFirstTreeOptionsPatch,
      HistoricalPatch<AsyncDepthFirstTreeResolvedOptions<VertexTypes>> & {
        inOrder?: Partial<InOrderOptions>;
      }
    >
  >,
  Assert<
    SameShape<
      BreadthFirstTreeOptionsPatch,
      HistoricalPatch<BreadthFirstTreeResolvedOptions<VertexTypes>>
    >
  >,
  Assert<
    SameShape<
      AsyncBreadthFirstTreeOptionsPatch,
      HistoricalPatch<AsyncBreadthFirstTreeResolvedOptions<VertexTypes>>
    >
  >,
  Assert<
    SameShape<
      Omit<DagOptionsPatch, 'traversableTree' | 'traversableGraph'>,
      HistoricalDagPatch<DagResolvedOptions>
    >
  >,
  Assert<
    SameShape<
      Omit<AsyncDagOptionsPatch, 'traversableTree' | 'traversableGraph'>,
      HistoricalDagPatch<AsyncDagResolvedOptions>
    >
  >,
];
