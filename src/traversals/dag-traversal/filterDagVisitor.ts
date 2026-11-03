import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { DagVisitorPhase } from './lib/DagTraversalOrder';
import type {
  AsyncDagVisitor,
  DagVisitor,
  DagVisitorContext,
} from './lib/DagTraversalVisitor';

type FilteredVisitor<
  Data,
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
  Phase extends DagVisitorPhase,
  VertexId,
> = ReturnType<
  DagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>
> extends infer VisitorResult
  ? (
      data: Data,
      context: DagVisitorContext<
        SourceVertexTypes,
        RewrittenVertexTypes,
        Phase,
        VertexId
      >,
    ) => VisitorResult
  : never;

type AsyncFilteredVisitor<
  Data,
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
  Phase extends DagVisitorPhase,
  VertexId,
> = ReturnType<
  AsyncDagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>
> extends infer VisitorResult
  ? (
      data: Data,
      context: DagVisitorContext<
        SourceVertexTypes,
        RewrittenVertexTypes,
        Phase,
        VertexId
      >,
    ) => VisitorResult
  : never;

/** Filter current vertex data; a guard narrows data, never the live graph context. */
export function createConditionalDagDataVisitor<
  Data,
  NarrowedData extends Data,
  SourceVertexTypes extends VertexDataAndChildHintTypes<Data> = VertexDataAndChildHintTypes<Data>,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes<Data> = SourceVertexTypes,
  Phase extends DagVisitorPhase = DagVisitorPhase,
  VertexId = unknown,
>(
  predicate: (data: Data) => data is NarrowedData,
  visitor: FilteredVisitor<
    NarrowedData,
    SourceVertexTypes,
    RewrittenVertexTypes,
    Phase,
    VertexId
  >,
): DagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>;
export function createConditionalDagDataVisitor<
  Data,
  SourceVertexTypes extends VertexDataAndChildHintTypes<Data> = VertexDataAndChildHintTypes<Data>,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes<Data> = SourceVertexTypes,
  Phase extends DagVisitorPhase = DagVisitorPhase,
  VertexId = unknown,
>(
  predicate: (data: Data) => boolean,
  visitor: FilteredVisitor<
    Data,
    SourceVertexTypes,
    RewrittenVertexTypes,
    Phase,
    VertexId
  >,
): DagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>;
export function createConditionalDagDataVisitor<
  Data,
  NarrowedData extends Data,
  SourceVertexTypes extends VertexDataAndChildHintTypes<Data>,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes<Data>,
  Phase extends DagVisitorPhase,
  VertexId,
>(
  predicate: (data: Data) => boolean,
  visitor: FilteredVisitor<
    NarrowedData,
    SourceVertexTypes,
    RewrittenVertexTypes,
    Phase,
    VertexId
  >,
): DagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId> {
  return ((vertex, context) => {
    const data = vertex.getVertexData();
    // The guard overload proves this narrowing; the boolean overload keeps DATA.
    return predicate(data) ? visitor(data as NarrowedData, context) : undefined;
  }) as DagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>;
}

/** Async callbacks retain their original promise and exact rejection value. */
export function createConditionalAsyncDagDataVisitor<
  Data,
  NarrowedData extends Data,
  SourceVertexTypes extends VertexDataAndChildHintTypes<Data> = VertexDataAndChildHintTypes<Data>,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes<Data> = SourceVertexTypes,
  Phase extends DagVisitorPhase = DagVisitorPhase,
  VertexId = unknown,
>(
  predicate: (data: Data) => data is NarrowedData,
  visitor: AsyncFilteredVisitor<
    NarrowedData,
    SourceVertexTypes,
    RewrittenVertexTypes,
    Phase,
    VertexId
  >,
): AsyncDagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>;
export function createConditionalAsyncDagDataVisitor<
  Data,
  SourceVertexTypes extends VertexDataAndChildHintTypes<Data> = VertexDataAndChildHintTypes<Data>,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes<Data> = SourceVertexTypes,
  Phase extends DagVisitorPhase = DagVisitorPhase,
  VertexId = unknown,
>(
  predicate: (data: Data) => boolean,
  visitor: AsyncFilteredVisitor<
    Data,
    SourceVertexTypes,
    RewrittenVertexTypes,
    Phase,
    VertexId
  >,
): AsyncDagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>;
export function createConditionalAsyncDagDataVisitor<
  Data,
  NarrowedData extends Data,
  SourceVertexTypes extends VertexDataAndChildHintTypes<Data>,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes<Data>,
  Phase extends DagVisitorPhase,
  VertexId,
>(
  predicate: (data: Data) => boolean,
  visitor: AsyncFilteredVisitor<
    NarrowedData,
    SourceVertexTypes,
    RewrittenVertexTypes,
    Phase,
    VertexId
  >,
): AsyncDagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId> {
  return ((vertex, context) => {
    const data = vertex.getVertexData();
    return predicate(data) ? visitor(data as NarrowedData, context) : undefined;
  }) as AsyncDagVisitor<
    SourceVertexTypes,
    RewrittenVertexTypes,
    Phase,
    VertexId
  >;
}
