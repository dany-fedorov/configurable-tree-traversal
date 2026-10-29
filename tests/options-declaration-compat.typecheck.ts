// Public patches accept explicitly undefined fields under exact optional types.
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
type UndefinedPatch<T> = { [K in keyof T]?: T[K] | undefined };
type HistoricalPatch<T extends { visitors: object }> = UndefinedPatch<
  Omit<T, 'visitors' | 'traversalRunnerInternalObjects' | 'inOrder'>
> & {
  visitors?: VisitorInputs<T['visitors']> | undefined;
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
      > & { inOrder?: UndefinedPatch<InOrderOptions> | undefined }
    >
  >,
  Assert<
    SameShape<
      AsyncDepthFirstTreeOptionsPatch,
      HistoricalPatch<AsyncDepthFirstTreeResolvedOptions<VertexTypes>> & {
        inOrder?: UndefinedPatch<InOrderOptions> | undefined;
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
