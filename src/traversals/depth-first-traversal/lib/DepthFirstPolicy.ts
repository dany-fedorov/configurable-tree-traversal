import type { OwnerToken } from '@core/effects/types';
import type { InternalVertexRef } from '@core/graph/types';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { InOrderOptions } from './DepthFirstTraversalInOrderTraversalConfig';
import { DepthFirstPhase } from './DepthFirstTraversalOrder';
import { shouldVisitParentOnInOrder } from '../in-order-helpers/shouldVisitParentOnInOrder';

export type DepthFirstFrameStage =
  | 'pre'
  | 'pre-visit'
  | 'transformHints'
  | 'sort-wait'
  | 'children'
  | 'child-wait'
  | 'leaf-after-close'
  | 'in-visit'
  | 'post'
  | 'post-visit'
  | 'done';

export type DepthFirstFrame<T extends VertexTypes> = {
  owner: OwnerToken;
  vertexRef: InternalVertexRef<T>;
  depth: number;
  stage: DepthFirstFrameStage;
  hints: T['VertexHint'][];
  nextChild: number;
  completedChild: { index: number; resolved: boolean } | null;
  resumeAfterInOrder: 'children' | 'post';
};

export type DepthFirstWork<T extends VertexTypes> =
  | {
      kind: 'VISIT';
      frame: DepthFirstFrame<T>;
      order: DepthFirstPhase;
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
export class DepthFirstPolicy<T extends VertexTypes> {
  private readonly frames: DepthFirstFrame<T>[] = [];

  constructor(
    private readonly inOrderConfig: InOrderOptions,
    private readonly hasHintTransformer: boolean,
  ) {}

  push(
    owner: OwnerToken,
    vertexRef: InternalVertexRef<T>,
    depth: number,
  ): void {
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
    hasVertex: (ref: InternalVertexRef<T>) => boolean,
    isDisabled: (ref: InternalVertexRef<T>) => boolean,
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
            order: DepthFirstPhase.PRE_ORDER,
          };
        case 'transformHints': {
          const hints = isDisabled(frame.vertexRef)
            ? []
            : frame.vertexRef.getValue().getChildHints().slice();
          if (this.hasHintTransformer) {
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
                this.inOrderConfig.visitAfterOmittedChildren) &&
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
                order: DepthFirstPhase.IN_ORDER,
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
            order: DepthFirstPhase.IN_ORDER,
          };
        case 'post':
          frame.stage = 'post-visit';
          return {
            kind: 'VISIT',
            frame,
            order: DepthFirstPhase.POST_ORDER,
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

  completeVisit(frame: DepthFirstFrame<T>, order: DepthFirstPhase): void {
    if (order === DepthFirstPhase.PRE_ORDER) frame.stage = 'transformHints';
    else if (order === DepthFirstPhase.IN_ORDER)
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
