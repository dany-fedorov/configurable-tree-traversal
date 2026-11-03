import type { SchedulingOwnerValidityToken } from '@core/effects/types';
import type { InternalVertexRef } from '@core/graph/types';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { DepthFirstChildBoundaryVisitOptions } from './DepthFirstTraversalInOrderTraversalConfig';
import { DepthFirstTreeVisitPhase } from './DepthFirstTraversalOrder';
import { shouldVisitParentOnInOrder } from '../in-order-helpers/shouldVisitParentOnInOrder';

export type DepthFirstTraversalFrameStage =
  | 'beforeInitialVisitAdmission'
  | 'waitingForInitialVisitChain'
  | 'transformingChildHints'
  | 'waitingForChildHintTransformation'
  | 'processingChildDiscoverySlots'
  | 'waitingForChildResolution'
  | 'beforeLeafBoundaryVisit'
  | 'waitingForChildBoundaryVisitChain'
  | 'beforeCompletionVisitAdmission'
  | 'waitingForCompletionVisitChain'
  | 'frameTraversalFinished';

export type DepthFirstFrame<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = {
  owner: SchedulingOwnerValidityToken;
  vertexHandle: InternalVertexRef<InputVertexTypes>;
  depth: number;
  stage: DepthFirstTraversalFrameStage;
  hints: InputVertexTypes['ChildHint'][];
  nextChild: number;
  completedChild: { index: number; resolved: boolean } | null;
  resumeAfterInOrder:
    | 'processingChildDiscoverySlots'
    | 'beforeCompletionVisitAdmission';
};

export type DepthFirstWork<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> =
  | {
      kind: 'VISIT';
      frame: DepthFirstFrame<InputVertexTypes>;
      order: DepthFirstTreeVisitPhase;
    }
  | {
      kind: 'PREPARE_HINTS';
      frame: DepthFirstFrame<InputVertexTypes>;
      hints: InputVertexTypes['ChildHint'][];
    }
  | {
      kind: 'SORT_HINTS';
      frame: DepthFirstFrame<InputVertexTypes>;
      hints: InputVertexTypes['ChildHint'][];
    }
  | {
      kind: 'MAKE_VERTEX';
      frame: DepthFirstFrame<InputVertexTypes>;
      index: number;
    }
  | { kind: 'CLOSE'; frame: DepthFirstFrame<InputVertexTypes> }
  | { kind: 'POP'; frame: DepthFirstFrame<InputVertexTypes> };

/** Explicit stack policy preserving the legacy synchronous DFS boundaries. */
export class DepthFirstPolicy<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> {
  private readonly frames: DepthFirstFrame<InputVertexTypes>[] = [];

  constructor(
    private readonly inOrderConfig: DepthFirstChildBoundaryVisitOptions,
    private readonly hasChildHintsListTransformer: boolean,
  ) {}

  push(
    owner: SchedulingOwnerValidityToken,
    vertexHandle: InternalVertexRef<InputVertexTypes>,
    depth: number,
  ): void {
    this.frames.push({
      owner,
      vertexHandle,
      depth,
      stage: 'beforeInitialVisitAdmission',
      hints: [],
      nextChild: 0,
      completedChild: null,
      resumeAfterInOrder: 'processingChildDiscoverySlots',
    });
  }

  next(
    hasVertex: (ref: InternalVertexRef<InputVertexTypes>) => boolean,
    isDisabled: (ref: InternalVertexRef<InputVertexTypes>) => boolean,
  ): DepthFirstWork<InputVertexTypes> | null {
    for (;;) {
      const frame = this.frames[this.frames.length - 1];
      if (frame === undefined) return null;
      if (!hasVertex(frame.vertexHandle)) {
        this.frames.pop();
        continue;
      }
      switch (frame.stage) {
        case 'beforeInitialVisitAdmission':
          frame.stage = 'waitingForInitialVisitChain';
          return {
            kind: 'VISIT',
            frame,
            order: DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
          };
        case 'transformingChildHints': {
          const hints = isDisabled(frame.vertexHandle)
            ? []
            : frame.vertexHandle
                .getReferencedValue()
                .getMutableChildDiscoveryHints()
                .slice();
          if (this.hasChildHintsListTransformer) {
            frame.stage = 'waitingForChildHintTransformation';
            return { kind: 'SORT_HINTS', frame, hints };
          }
          return { kind: 'PREPARE_HINTS', frame, hints };
        }
        case 'processingChildDiscoverySlots': {
          if (frame.completedChild !== null) {
            const completed = frame.completedChild;
            frame.completedChild = null;
            if (
              (completed.resolved ||
                this.inOrderConfig.allowBoundaryVisitsAfterOmittedChildSlots) &&
              shouldVisitParentOnInOrder(
                this.inOrderConfig,
                completed.index,
                frame.hints.length,
              )
            ) {
              frame.resumeAfterInOrder = 'processingChildDiscoverySlots';
              frame.stage = 'waitingForChildBoundaryVisitChain';
              return {
                kind: 'VISIT',
                frame,
                order:
                  DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES,
              };
            }
            continue;
          }
          if (
            frame.nextChild < frame.hints.length &&
            !isDisabled(frame.vertexHandle)
          ) {
            const index = frame.nextChild++;
            frame.stage = 'waitingForChildResolution';
            return { kind: 'MAKE_VERTEX', frame, index };
          }
          frame.stage =
            frame.hints.length === 0
              ? 'beforeLeafBoundaryVisit'
              : 'beforeCompletionVisitAdmission';
          return { kind: 'CLOSE', frame };
        }
        case 'beforeLeafBoundaryVisit':
          frame.resumeAfterInOrder = 'beforeCompletionVisitAdmission';
          frame.stage = 'waitingForChildBoundaryVisitChain';
          return {
            kind: 'VISIT',
            frame,
            order:
              DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES,
          };
        case 'beforeCompletionVisitAdmission':
          frame.stage = 'waitingForCompletionVisitChain';
          return {
            kind: 'VISIT',
            frame,
            order: DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
          };
        case 'frameTraversalFinished':
          this.frames.pop();
          return { kind: 'POP', frame };
        case 'waitingForInitialVisitChain':
        case 'waitingForChildHintTransformation':
        case 'waitingForChildResolution':
        case 'waitingForChildBoundaryVisitChain':
        case 'waitingForCompletionVisitChain':
          return null;
      }
    }
  }

  completeVisit(
    frame: DepthFirstFrame<InputVertexTypes>,
    order: DepthFirstTreeVisitPhase,
  ): void {
    if (order === DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION)
      frame.stage = 'transformingChildHints';
    else if (
      order === DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES
    )
      frame.stage = frame.resumeAfterInOrder;
    else frame.stage = 'frameTraversalFinished';
  }

  setHints(
    frame: DepthFirstFrame<InputVertexTypes>,
    hints: InputVertexTypes['ChildHint'][],
  ): void {
    frame.hints = hints.slice();
    frame.stage = 'processingChildDiscoverySlots';
  }

  completeChild(
    frame: DepthFirstFrame<InputVertexTypes>,
    index: number,
    resolved: boolean,
  ): void {
    frame.completedChild = { index, resolved };
    frame.stage = 'processingChildDiscoverySlots';
  }

  getFrames(): readonly DepthFirstFrame<InputVertexTypes>[] {
    return this.frames;
  }

  clear(): void {
    this.frames.length = 0;
  }
}
