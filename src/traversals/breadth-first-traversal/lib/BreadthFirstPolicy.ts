import type { SchedulingOwnerValidityToken } from '@core/effects/types';
import type { InternalVertexRef } from '@core/graph/types';
import type { MutableTreeChildDiscoveryContext } from '@core/ResolvedTree';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';

export type BreadthFirstPolicyState<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = {
  queue: MutableTreeChildDiscoveryContext<InputVertexTypes>[];
  queueIndex: number;
};

type BreadthFirstExpansion<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = {
  owner: SchedulingOwnerValidityToken;
  vertexHandle: InternalVertexRef<InputVertexTypes>;
  depth: number;
  stage: 'prepare' | 'sort-wait';
};

type BreadthFirstResolution<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = {
  owner: SchedulingOwnerValidityToken;
  context: MutableTreeChildDiscoveryContext<InputVertexTypes>;
};

type ParentProgress = {
  remaining: number;
  closeWhenDone: boolean;
};

export type InjectedBreadthFirstFrontier<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = {
  contexts: readonly MutableTreeChildDiscoveryContext<InputVertexTypes>[];
  consumedHintIndices: ReadonlySet<number>;
};

export type BreadthFirstWork<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> =
  | {
      kind: 'PREPARE_HINTS';
      expansion: BreadthFirstExpansion<InputVertexTypes>;
      hints: InputVertexTypes['ChildHint'][];
    }
  | {
      kind: 'SORT_HINTS';
      expansion: BreadthFirstExpansion<InputVertexTypes>;
      hints: InputVertexTypes['ChildHint'][];
    }
  | {
      kind: 'MAKE_VERTEX';
      context: MutableTreeChildDiscoveryContext<InputVertexTypes>;
    }
  | { kind: 'CLEAR_QUEUE' };

/** Queue policy preserving dequeue-time resolution and legacy public state. */
export class BreadthFirstPolicy<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> {
  private readonly expansions: BreadthFirstExpansion<InputVertexTypes>[] = [];
  private readonly progressByParent = new Map<
    InternalVertexRef<InputVertexTypes>,
    ParentProgress
  >();
  private readonly injectedFrontiers = new Map<
    InternalVertexRef<InputVertexTypes>,
    {
      contexts: MutableTreeChildDiscoveryContext<InputVertexTypes>[];
      consumedHintIndices: Set<number>;
    }
  >();
  private pendingResolution: BreadthFirstResolution<InputVertexTypes> | null =
    null;

  constructor(
    private readonly state: BreadthFirstPolicyState<InputVertexTypes>,
    private readonly hasChildHintsListTransformer: boolean,
  ) {
    for (let index = 0; index < state.queue.length; index += 1) {
      const context = state.queue[index]!;
      let frontier = this.injectedFrontiers.get(context.parentVertexReference);
      if (frontier === undefined) {
        frontier = { contexts: [], consumedHintIndices: new Set() };
        this.injectedFrontiers.set(context.parentVertexReference, frontier);
      }
      frontier.contexts.push(context);
      if (index < state.queueIndex) {
        frontier.consumedHintIndices.add(context.parentChildHintIndex);
      } else {
        this.addParentProgress(context.parentVertexReference, 1, false);
      }
    }
  }

  takeInjectedFrontier(
    parent: InternalVertexRef<InputVertexTypes>,
  ): InjectedBreadthFirstFrontier<InputVertexTypes> | null {
    const frontier = this.injectedFrontiers.get(parent);
    if (frontier === undefined) return null;
    this.injectedFrontiers.delete(parent);
    return frontier;
  }

  activateInjectedFrontier(
    parent: InternalVertexRef<InputVertexTypes>,
  ): boolean {
    const progress = this.progressByParent.get(parent);
    if (progress === undefined) return true;
    progress.closeWhenDone = true;
    return false;
  }

  enqueueExpansion(
    owner: SchedulingOwnerValidityToken,
    vertexHandle: InternalVertexRef<InputVertexTypes>,
    depth: number,
  ): void {
    this.expansions.push({
      owner,
      vertexHandle,
      depth,
      stage: 'prepare',
    });
  }

  next(
    hasVertex: (ref: InternalVertexRef<InputVertexTypes>) => boolean,
    isDisabled: (ref: InternalVertexRef<InputVertexTypes>) => boolean,
  ): BreadthFirstWork<InputVertexTypes> | null {
    for (;;) {
      const expansion = this.expansions[0];
      if (expansion !== undefined) {
        if (!hasVertex(expansion.vertexHandle)) {
          this.expansions.shift();
          continue;
        }
        if (expansion.stage === 'sort-wait') return null;
        const hints = isDisabled(expansion.vertexHandle)
          ? []
          : expansion.vertexHandle
              .getReferencedValue()
              .getMutableChildDiscoveryHints()
              .slice();
        if (
          this.hasChildHintsListTransformer &&
          !isDisabled(expansion.vertexHandle)
        ) {
          expansion.stage = 'sort-wait';
          return { kind: 'SORT_HINTS', expansion, hints };
        }
        return { kind: 'PREPARE_HINTS', expansion, hints };
      }

      if (this.pendingResolution !== null) return null;
      while (this.state.queueIndex < this.state.queue.length) {
        const context = this.state.queue[this.state.queueIndex++]!;
        if (
          hasVertex(context.parentVertexReference) &&
          !isDisabled(context.parentVertexReference)
        ) {
          return { kind: 'MAKE_VERTEX', context };
        }
        this.consumeParentProgress(context.parentVertexReference);
      }
      return this.state.queue.length > 0 ? { kind: 'CLEAR_QUEUE' } : null;
    }
  }

  setHints(
    expansion: BreadthFirstExpansion<InputVertexTypes>,
    hints: InputVertexTypes['ChildHint'][],
  ): boolean {
    if (this.expansions[0] !== expansion) {
      throw new Error('Unknown breadth-first expansion');
    }
    for (let hintIndex = 0; hintIndex < hints.length; hintIndex += 1) {
      this.state.queue.push({
        discoveryDepthInEdges: expansion.depth + 1,
        parentVertexAtChildResolution:
          expansion.vertexHandle.getReferencedValue(),
        parentVertexReference: expansion.vertexHandle,
        parentChildHintIndex: hintIndex,
        childDiscoveryHint: hints[hintIndex]!,
      });
    }
    this.expansions.shift();
    this.addParentProgress(expansion.vertexHandle, hints.length, true);
    return hints.length === 0;
  }

  setSortedHints(
    owner: SchedulingOwnerValidityToken,
    hints: InputVertexTypes['ChildHint'][],
  ): { vertexHandle: InternalVertexRef<InputVertexTypes>; empty: boolean } {
    const expansion = this.expansions[0];
    if (expansion?.owner.runnerLocalOwnerId !== owner.runnerLocalOwnerId) {
      throw new Error('Unknown breadth-first expansion owner');
    }
    const empty = this.setHints(expansion, hints);
    return { vertexHandle: expansion.vertexHandle, empty };
  }

  startResolution(
    owner: SchedulingOwnerValidityToken,
    context: MutableTreeChildDiscoveryContext<InputVertexTypes>,
  ): void {
    if (this.pendingResolution !== null) {
      throw new Error('Breadth-first resolution is already pending');
    }
    this.pendingResolution = { owner, context };
  }

  completeResolution(owner: SchedulingOwnerValidityToken): {
    context: MutableTreeChildDiscoveryContext<InputVertexTypes>;
    closeParent: boolean;
  } {
    if (
      this.pendingResolution?.owner.runnerLocalOwnerId !==
      owner.runnerLocalOwnerId
    ) {
      throw new Error('Unknown breadth-first resolution');
    }
    const { context } = this.pendingResolution;
    this.pendingResolution = null;
    return {
      context,
      closeParent: this.consumeParentProgress(context.parentVertexReference),
    };
  }

  clearQueue(): void {
    this.state.queue.length = 0;
    this.state.queueIndex = 0;
  }

  getFrames(): readonly Readonly<{
    owner: SchedulingOwnerValidityToken;
    vertexHandle: InternalVertexRef<InputVertexTypes>;
    stage: 'transformHints' | 'resolve';
    pendingIndices: readonly number[];
  }>[] {
    const expansions = this.expansions.map((expansion) => ({
      owner: expansion.owner,
      vertexHandle: expansion.vertexHandle,
      stage: (expansion.stage === 'sort-wait'
        ? 'transformHints'
        : 'resolve') as 'transformHints' | 'resolve',
      pendingIndices: [] as number[],
    }));
    const resolution = this.pendingResolution;
    return resolution === null
      ? expansions
      : [
          ...expansions,
          {
            owner: resolution.owner,
            vertexHandle: resolution.context.parentVertexReference,
            stage: 'resolve' as const,
            pendingIndices: [resolution.context.parentChildHintIndex],
          },
        ];
  }

  isIdle(): boolean {
    return (
      this.expansions.length === 0 &&
      this.pendingResolution === null &&
      this.progressByParent.size === 0 &&
      this.state.queue.length === 0
    );
  }

  clear(): void {
    this.expansions.length = 0;
    this.pendingResolution = null;
    this.progressByParent.clear();
    this.injectedFrontiers.clear();
  }

  private addParentProgress(
    parent: InternalVertexRef<InputVertexTypes>,
    count: number,
    closeWhenDone: boolean,
  ): void {
    if (count === 0) return;
    const current = this.progressByParent.get(parent);
    this.progressByParent.set(parent, {
      remaining: (current?.remaining ?? 0) + count,
      closeWhenDone: (current?.closeWhenDone ?? false) || closeWhenDone,
    });
  }

  private consumeParentProgress(
    parent: InternalVertexRef<InputVertexTypes>,
  ): boolean {
    const progress = this.progressByParent.get(parent);
    if (progress === undefined || progress.remaining < 1) {
      throw new Error('Unknown breadth-first parent expansion');
    }
    if (progress.remaining === 1) {
      this.progressByParent.delete(parent);
      return progress.closeWhenDone;
    }
    progress.remaining -= 1;
    return false;
  }
}
