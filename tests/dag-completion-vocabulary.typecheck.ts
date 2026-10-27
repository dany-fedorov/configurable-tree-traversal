import type {
  DagSettlementOutcome,
  DagWorkState,
  DagTraversalRunner,
  AsyncDagTraversalRunner,
} from '../src';
import type { DagSettlementOutcome as SubpathOutcome } from '../src/traversals/dag-traversal';

const completed: DagWorkState = 'completed';
const canonical: DagSettlementOutcome = { kind: 'workCompleted' };
const fatal: SubpathOutcome = { kind: 'traversalFailed', error: undefined };
// @ts-expect-error Boolean settlement feedback is retired.
const legacy: DagSettlementOutcome = { ok: true };
// @ts-expect-error Boolean failure feedback is retired.
const legacyFatal: DagSettlementOutcome = { ok: false, error: null };
// @ts-expect-error Old progress state is replaced, not an alternate business state.
const succeeded: DagWorkState = 'succeeded';
// @ts-expect-error CTT has no independent business work failure state.
const failed: DagWorkState = 'failed';
// @ts-expect-error Fatal traversal feedback requires an explicit error value.
const missingError: DagSettlementOutcome = { kind: 'traversalFailed' };
// @ts-expect-error Tagged and deprecated feedback forms are exclusive.
const mixed: DagSettlementOutcome = { kind: 'workCompleted', ok: true };
const conflicting: DagSettlementOutcome = {
  kind: 'traversalFailed',
  error: null,
  // @ts-expect-error Conflicting feedback forms are exclusive.
  ok: true,
};
// @ts-expect-error Completed work carries no traversal error.
const completedError: DagSettlementOutcome = {
  kind: 'workCompleted',
  error: null,
};
// @ts-expect-error Legacy completed work carries no traversal error.
const legacyCompletedError: DagSettlementOutcome = { ok: true, error: null };
function settle(runner: DagTraversalRunner | AsyncDagTraversalRunner) {
  runner.settle('id', canonical, Symbol());
  runner.settle('id', fatal, Symbol());
  runner.settle('id', legacy, Symbol());
  runner.settle('id', legacyFatal, Symbol());
}
void [
  completed,
  succeeded,
  failed,
  missingError,
  mixed,
  conflicting,
  completedError,
  legacyCompletedError,
  settle,
];
