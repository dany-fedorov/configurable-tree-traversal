import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { Traversal } from '@core/Traversal';
import type {
  DepthFirstTraversalInstanceConfig,
  DepthFirstTraversalInstanceConfigInput,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type { DepthFirstTraversalVisitors } from '@depth-first-traversal/lib/DepthFirstTraversalVisitors';
import {
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeInstanceConfigs,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type {
  TraversalVisitor,
  TraversalVisitorFunctionOptions,
  TraversalVisitorRecord,
} from '@core/TraversalVisitor';
import { DEFAULT_VISITOR_FN_OPTIONS } from '@core/TraversalVisitor';
import { initVisitors } from '@depth-first-traversal/init-helpers/initVisitors';
import type { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import { DepthFirstTraversalRunner } from '@depth-first-traversal/lib/DepthFirstTraversalRunner';

export class DepthFirstTraversal<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> extends Traversal<DepthFirstTraversalOrder, TTP, RW_TTP> {
  icfg: DepthFirstTraversalInstanceConfig<TTP, RW_TTP>;

  visitors: DepthFirstTraversalVisitors<TTP, RW_TTP>;
  // resolvedTreesContainer: DepthFirstTraversalResolvedTreesContainer<
  //   TTP,
  //   RW_TTP
  // >;
  // traversalState: DepthFirstTraversalState<TTP, RW_TTP>;
  // curGenerator: Generator<
  //   TraversalIteratorResultContent<DepthFirstTraversalOrder, TTP, RW_TTP>
  // > | null;

  constructor(icfgInput: DepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>) {
    super();
    this.icfg = mergeInstanceConfigs(
      DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as DepthFirstTraversalInstanceConfig<
        TTP,
        RW_TTP
      >,
      icfgInput,
    );
    this.visitors = initVisitors(this.icfg);
    // const { resolvedTreesContainer, traversalState } = initInternalObjects(
    //   this.icfg,
    // );
    // this.resolvedTreesContainer = resolvedTreesContainer;
    // this.traversalState = traversalState;
    // this.curGenerator = null;
  }

  configure(
    icfgInput: DepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
  ): this {
    this.icfg = mergeInstanceConfigs(this.icfg, icfgInput);
    this.visitors = initVisitors(this.icfg);
    // const { resolvedTreesContainer, traversalState } = initInternalObjects(
    //   this.icfg,
    // );
    // this.resolvedTreesContainer = resolvedTreesContainer;
    // this.traversalState = traversalState;
    return this;
  }

  addVisitorFor(
    order: DepthFirstTraversalOrder,
    visitor: TraversalVisitor<DepthFirstTraversalOrder, TTP, RW_TTP>,
    options: Partial<TraversalVisitorFunctionOptions> = DEFAULT_VISITOR_FN_OPTIONS,
  ): this {
    const effectiveOptions: TraversalVisitorFunctionOptions = {
      ...DEFAULT_VISITOR_FN_OPTIONS,
      ...options,
    };
    this.visitors[order].push({
      priority: effectiveOptions.priority,
      visitor,
      addedIndex: this.visitors[order].length,
      resolutionStyle: effectiveOptions.resolutionStyle,
    });
    this.visitors[order].sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      } else {
        return a.addedIndex - b.addedIndex;
      }
    });
    return this;
  }

  listVisitorsFor(
    order: DepthFirstTraversalOrder,
  ): TraversalVisitorRecord<DepthFirstTraversalOrder, TTP, RW_TTP>[] {
    return this.visitors[order];
  }

  setVisitorsFor(
    order: DepthFirstTraversalOrder,
    visitorRecords: TraversalVisitorRecord<
      DepthFirstTraversalOrder,
      TTP,
      RW_TTP
    >[],
  ): this {
    this.visitors[order] = visitorRecords;
    return this;
  }

  /**getIterable(
   config?: DepthFirstTraversalIterableConfigInput,
   ): Generator<
   TraversalIteratorResultContent<DepthFirstTraversalOrder, TTP, RW_TTP>
   > {
    const iterableConfig =
      makeEffectiveDepthFirstTraversalIterableConfig(config);
    const rootVertexRef = this.initRootVertex();
    if (rootVertexRef === null) {
      return;
    }

    this.pushHintsOf(rootVertexRef, 0);
    yield* this.yieldAndVisit(
      iterableConfig,
      DepthFirstTraversalOrder.PRE_ORDER,
      rootVertexRef,
    );

    while (this.traversalState.STACK.length > 0) {
      const vertexContext =
        this.traversalState.STACK.pop() as VertexResolutionContext<
          TTP | RW_TTP
        >;
      const vertexContent = this.getTraversableTree().makeVertex(
        vertexContext.vertexHint,
        {
          resolutionContext: vertexContext,
          resolvedTree: this.resolvedTreesContainer.resolvedTree,
          notMutatedResolvedTree:
            this.resolvedTreesContainer.notMutatedResolvedTree,
        },
      );
      if (vertexContent === null) {
        if (
          this.icfg.inOrderTraversalConfig.considerVisitAfterNullContentVertices
        ) {
          yield* this.onPostOrder_tryInOrderVisitOnParentVertex(
            iterableConfig,
            vertexContext,
          );
          this.traversalState.countVisitedOnPostOrderAChildOf(
            vertexContext.parentVertexRef,
          );
        }
        continue;
      }
      const vertexRef = new CTTRef(new Vertex(vertexContent));
      yield* this.onPreOrder(iterableConfig, vertexRef, vertexContext);

      if (
        vertexRef.unref().isLeafVertex() &&
        this.hasPostOrderOrInOrderVisitors()
      ) {
        yield* this.onPostOrder(iterableConfig, vertexRef, vertexContext);
      }
    }

    yield* this.onPostOrder(iterableConfig, rootVertexRef, null);

    return;
  }*/

  /*  run(): this {
      if (this.getStatus() === TraversalRunnerStatus.FINISHED) {
        return this;
      }
      if (this.curGenerator === null) {
        this.curGenerator = this.getIterable();
      }
      this.setStatus(TraversalRunnerStatus.RUNNING);
      while (true) {
        const r = this.curGenerator.next();
        if (r.done === true) {
          this.setStatus(TraversalRunnerStatus.FINISHED);
          return this;
        }
        if (this.isHalted()) {
          return this;
        }
      }
    }*/

  makeRunner() {
    return new DepthFirstTraversalRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }
}
