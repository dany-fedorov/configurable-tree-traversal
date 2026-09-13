import type { OwnerToken } from '@core/effects/types';
import type { Ref } from '@core/graph/types';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { DepthFirstTraversalInOrderTraversalConfig } from './DepthFirstTraversalInOrderTraversalConfig';
import { DepthFirstTraversalOrder } from './DepthFirstTraversalOrder';
import { shouldVisitParentOnInOrder } from '../in-order-helpers/shouldVisitParentOnInOrder';

export type DepthFirstFrameStage =
  | 'pre'
  | 'pre-visit'
  | 'sort'
  | 'sort-wait'
  | 'children'
  | 'child-wait'
  | 'leaf-after-close'
  | 'in-visit'
  | 'post'
  | 'post-visit'
  | 'done';

export type DepthFirstFrame<T extends TreeTypeParameters> = {
  owner: OwnerToken;
  vertexRef: Ref<T>;
  depth: number;
  stage: DepthFirstFrameStage;
  hints: T['VertexHint'][];
  nextChild: number;
  completedChild: { index: number; resolved: boolean } | null;
  resumeAfterInOrder: 'children' | 'post';
};

export type DepthFirstWork<T extends TreeTypeParameters> =
  | {
      kind: 'VISIT';
      frame: DepthFirstFrame<T>;
      order: DepthFirstTraversalOrder;
    }
  | {
      kind: 'PREPARE_HINTS';
      frame: DepthFirstFrame<T>;
      hints: T['VertexHint'][];
    }
  | {
      kind: 'SORT_HINTS';
      frame: DepthFirstFrame<T>;
      hints: T['VertexHint'][];
    }
  | {
      kind: 'MAKE_VERTEX';
      frame: DepthFirstFrame<T>;
      index: number;
    }
  | { kind: 'CLOSE'; frame: DepthFirstFrame<T> }
  | { kind: 'POP'; frame: DepthFirstFrame<T> };

/** Explicit stack policy preserving the legacy synchronous DFS boundaries. */
export class DepthFirstPolicy<T extends TreeTypeParameters> {
  private readonly frames: DepthFirstFrame<T>[] = [];

  constructor(
    private readonly inOrderConfig: DepthFirstTraversalInOrderTraversalConfig,
    private readonly hasSorter: boolean,
  ) {}

  push(owner: OwnerToken, vertexRef: Ref<T>, depth: number): void {
    this.frames.push({
      owner,
      vertexRef,
      depth,
      stage: 'pre',
      hints: [],
      nextChild: 0,
      completedChild: null,
      resumeAfterInOrder: 'children',
    });
  }

  next(
    hasVertex: (ref: Ref<T>) => boolean,
    isDisabled: (ref: Ref<T>) => boolean,
  ): DepthFirstWork<T> | null {
    for (;;) {
      const frame = this.frames[this.frames.length - 1];
      if (frame === undefined) return null;
      if (!hasVertex(frame.vertexRef)) {
        this.frames.pop();
        continue;
      }
      switch (frame.stage) {
        case 'pre':
          frame.stage = 'pre-visit';
          return {
            kind: 'VISIT',
            frame,
            order: DepthFirstTraversalOrder.PRE_ORDER,
          };
        case 'sort': {
          const hints = isDisabled(frame.vertexRef)
            ? []
            : frame.vertexRef.unref().getChildrenHints().slice();
          if (this.hasSorter) {
            frame.stage = 'sort-wait';
            return { kind: 'SORT_HINTS', frame, hints };
          }
          return { kind: 'PREPARE_HINTS', frame, hints };
        }
        case 'children': {
          if (frame.completedChild !== null) {
            const completed = frame.completedChild;
            frame.completedChild = null;
            if (
              (completed.resolved ||
                this.inOrderConfig.considerVisitAfterNullContentVertices) &&
              shouldVisitParentOnInOrder(
                this.inOrderConfig,
                completed.index,
                frame.hints.length,
              )
            ) {
              frame.resumeAfterInOrder = 'children';
              frame.stage = 'in-visit';
              return {
                kind: 'VISIT',
                frame,
                order: DepthFirstTraversalOrder.IN_ORDER,
              };
            }
            continue;
          }
          if (
            frame.nextChild < frame.hints.length &&
            !isDisabled(frame.vertexRef)
          ) {
            const index = frame.nextChild++;
            frame.stage = 'child-wait';
            return { kind: 'MAKE_VERTEX', frame, index };
          }
          frame.stage = frame.hints.length === 0 ? 'leaf-after-close' : 'post';
          return { kind: 'CLOSE', frame };
        }
        case 'leaf-after-close':
          frame.resumeAfterInOrder = 'post';
          frame.stage = 'in-visit';
          return {
            kind: 'VISIT',
            frame,
            order: DepthFirstTraversalOrder.IN_ORDER,
          };
        case 'post':
          frame.stage = 'post-visit';
          return {
            kind: 'VISIT',
            frame,
            order: DepthFirstTraversalOrder.POST_ORDER,
          };
        case 'done':
          this.frames.pop();
          return { kind: 'POP', frame };
        case 'pre-visit':
        case 'sort-wait':
        case 'child-wait':
        case 'in-visit':
        case 'post-visit':
          return null;
      }
    }
  }

  completeVisit(frame: DepthFirstFrame<T>, order: DepthFirstTraversalOrder): void {
    if (order === DepthFirstTraversalOrder.PRE_ORDER) frame.stage = 'sort';
    else if (order === DepthFirstTraversalOrder.IN_ORDER)
      frame.stage = frame.resumeAfterInOrder;
    else frame.stage = 'done';
  }

  setHints(frame: DepthFirstFrame<T>, hints: T['VertexHint'][]): void {
    frame.hints = hints.slice();
    frame.stage = 'children';
  }

  completeChild(
    frame: DepthFirstFrame<T>,
    index: number,
    resolved: boolean,
  ): void {
    frame.completedChild = { index, resolved };
    frame.stage = 'children';
  }

  getFrames(): readonly DepthFirstFrame<T>[] {
    return this.frames;
  }

  clear(): void {
    this.frames.length = 0;
  }
}
