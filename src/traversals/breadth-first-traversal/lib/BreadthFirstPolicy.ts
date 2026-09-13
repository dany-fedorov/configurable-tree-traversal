import type { OwnerToken } from '@core/effects/types';
import type { Ref } from '@core/graph/types';
import type { VertexResolutionContext } from '@core/ResolvedTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';

export type BreadthFirstPolicyState<T extends TreeTypeParameters> = {
  queue: VertexResolutionContext<T>[];
  queueIndex: number;
};

type BreadthFirstExpansion<T extends TreeTypeParameters> = {
  owner: OwnerToken;
  vertexRef: Ref<T>;
  depth: number;
  stage: 'prepare' | 'sort-wait';
};

type BreadthFirstResolution<T extends TreeTypeParameters> = {
  owner: OwnerToken;
  context: VertexResolutionContext<T>;
};

type ParentProgress = {
  remaining: number;
  closeWhenDone: boolean;
};

export type InjectedBreadthFirstFrontier<T extends TreeTypeParameters> = {
  contexts: readonly VertexResolutionContext<T>[];
  consumedHintIndices: ReadonlySet<number>;
};

export type BreadthFirstWork<T extends TreeTypeParameters> =
  | {
      kind: 'PREPARE_HINTS';
      expansion: BreadthFirstExpansion<T>;
      hints: T['VertexHint'][];
    }
  | {
      kind: 'SORT_HINTS';
      expansion: BreadthFirstExpansion<T>;
      hints: T['VertexHint'][];
    }
  | { kind: 'MAKE_VERTEX'; context: VertexResolutionContext<T> }
  | { kind: 'CLEAR_QUEUE' };

/** Queue policy preserving dequeue-time resolution and legacy public state. */
export class BreadthFirstPolicy<T extends TreeTypeParameters> {
  private readonly expansions: BreadthFirstExpansion<T>[] = [];
  private readonly progressByParent = new Map<Ref<T>, ParentProgress>();
  private readonly injectedFrontiers = new Map<
    Ref<T>,
    {
      contexts: VertexResolutionContext<T>[];
      consumedHintIndices: Set<number>;
    }
  >();
  private pendingResolution: BreadthFirstResolution<T> | null = null;

  constructor(
    private readonly state: BreadthFirstPolicyState<T>,
    private readonly hasSorter: boolean,
  ) {
    for (let index = 0; index < state.queue.length; index += 1) {
      const context = state.queue[index]!;
      let frontier = this.injectedFrontiers.get(context.parentVertexRef);
      if (frontier === undefined) {
        frontier = { contexts: [], consumedHintIndices: new Set() };
        this.injectedFrontiers.set(context.parentVertexRef, frontier);
      }
      frontier.contexts.push(context);
      if (index < state.queueIndex) {
        frontier.consumedHintIndices.add(context.hintIndex);
      } else {
        this.addParentProgress(context.parentVertexRef, 1, false);
      }
    }
  }

  takeInjectedFrontier(
    parent: Ref<T>,
  ): InjectedBreadthFirstFrontier<T> | null {
    const frontier = this.injectedFrontiers.get(parent);
    if (frontier === undefined) return null;
    this.injectedFrontiers.delete(parent);
    return frontier;
  }

  activateInjectedFrontier(parent: Ref<T>): boolean {
    const progress = this.progressByParent.get(parent);
    if (progress === undefined) return true;
    progress.closeWhenDone = true;
    return false;
  }

  enqueueExpansion(owner: OwnerToken, vertexRef: Ref<T>, depth: number): void {
    this.expansions.push({
      owner,
      vertexRef,
      depth,
      stage: 'prepare',
    });
  }

  next(
    hasVertex: (ref: Ref<T>) => boolean,
    isDisabled: (ref: Ref<T>) => boolean,
  ): BreadthFirstWork<T> | null {
    for (;;) {
      const expansion = this.expansions[0];
      if (expansion !== undefined) {
        if (!hasVertex(expansion.vertexRef)) {
          this.expansions.shift();
          continue;
        }
        if (expansion.stage === 'sort-wait') return null;
        const hints = isDisabled(expansion.vertexRef)
          ? []
          : expansion.vertexRef.unref().getChildrenHints().slice();
        if (this.hasSorter && !isDisabled(expansion.vertexRef)) {
          expansion.stage = 'sort-wait';
          return { kind: 'SORT_HINTS', expansion, hints };
        }
        return { kind: 'PREPARE_HINTS', expansion, hints };
      }

      if (this.pendingResolution !== null) return null;
      while (this.state.queueIndex < this.state.queue.length) {
        const context = this.state.queue[this.state.queueIndex++]!;
        if (
          hasVertex(context.parentVertexRef) &&
          !isDisabled(context.parentVertexRef)
        ) {
          return { kind: 'MAKE_VERTEX', context };
        }
        this.consumeParentProgress(context.parentVertexRef);
      }
      return this.state.queue.length > 0 ? { kind: 'CLEAR_QUEUE' } : null;
    }
  }

  setHints(
    expansion: BreadthFirstExpansion<T>,
    hints: T['VertexHint'][],
  ): boolean {
    if (this.expansions[0] !== expansion) {
      throw new Error('Unknown breadth-first expansion');
    }
    for (let hintIndex = 0; hintIndex < hints.length; hintIndex += 1) {
      this.state.queue.push({
        depth: expansion.depth + 1,
        parentVertex: expansion.vertexRef.unref(),
        parentVertexRef: expansion.vertexRef,
        hintIndex,
        vertexHint: hints[hintIndex]!,
      });
    }
    this.expansions.shift();
    this.addParentProgress(expansion.vertexRef, hints.length, true);
    return hints.length === 0;
  }

  setSortedHints(
    owner: OwnerToken,
    hints: T['VertexHint'][],
  ): { vertexRef: Ref<T>; empty: boolean } {
    const expansion = this.expansions[0];
    if (expansion?.owner.id !== owner.id) {
      throw new Error('Unknown breadth-first expansion owner');
    }
    const empty = this.setHints(expansion, hints);
    return { vertexRef: expansion.vertexRef, empty };
  }

  startResolution(
    owner: OwnerToken,
    context: VertexResolutionContext<T>,
  ): void {
    if (this.pendingResolution !== null) {
      throw new Error('Breadth-first resolution is already pending');
    }
    this.pendingResolution = { owner, context };
  }

  completeResolution(owner: OwnerToken): {
    context: VertexResolutionContext<T>;
    closeParent: boolean;
  } {
    if (this.pendingResolution?.owner.id !== owner.id) {
      throw new Error('Unknown breadth-first resolution');
    }
    const { context } = this.pendingResolution;
    this.pendingResolution = null;
    return {
      context,
      closeParent: this.consumeParentProgress(context.parentVertexRef),
    };
  }

  clearQueue(): void {
    this.state.queue.length = 0;
    this.state.queueIndex = 0;
  }

  getFrames(): readonly Readonly<{
    owner: OwnerToken;
    vertexRef: Ref<T>;
    stage: 'sort' | 'resolve';
    pendingIndices: readonly number[];
  }>[] {
    const expansions = this.expansions.map((expansion) => ({
      owner: expansion.owner,
      vertexRef: expansion.vertexRef,
      stage: (expansion.stage === 'sort-wait' ? 'sort' : 'resolve') as
        | 'sort'
        | 'resolve',
      pendingIndices: [] as number[],
    }));
    const resolution = this.pendingResolution;
    return resolution === null
      ? expansions
      : [
          ...expansions,
          {
            owner: resolution.owner,
            vertexRef: resolution.context.parentVertexRef,
            stage: 'resolve' as const,
            pendingIndices: [resolution.context.hintIndex],
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
    parent: Ref<T>,
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

  private consumeParentProgress(parent: Ref<T>): boolean {
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
