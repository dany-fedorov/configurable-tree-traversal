# Forward task notes

## Task 3

Options allowlists apply to actual option/patch bags, not source protocol objects carrying caller-owned state or opaque data. Inherited source protocol methods must keep receiver behavior. Include new converter/adapter/cache/policy/hook option keys from Tasks 1/2.

## Task 4

F12 type-only means no exported declare-class VALUE pretending a runtime constructor exists. A private declared nominal class with exported type alias can preserve private-member identity without exposing a value binding. Verify runtime/type import boundaries as well as spread rejection.

## Task 7

Uniform delivery selection must preserve callback admission snapshots and never replay work. Audit inspection/configuration records so historical admitted emitEvents values are not misleadingly described as controlling delivery; document any retained observational snapshot fields precisely.

## Task 8

Run fresh node scripts/api-clarity-census.cjs to a NEW completion audit directory, preserving the existing 2026-10-28-client-api-audit artifacts. Confirm published floor TypeScript4.7.4 against packed consumers in addition to the local4.9.5 check if cached compiler is available; investigate before claiming compatibility. This supports the existing no-unnecessary-floor-bump constraint.

## Task 6

ObjectTreeSource currently tracks original accepted identities by resolution-context object identity (including hook substitutions and pre-order rewrites). Preserve that behavior when removing resolvedTree.get(...). A stable detached/frozen public context projection keyed by the private accepted context may preserve identity without exposing mutable stores; investigate actual store lifecycle. Retain all existing object-cycle/hook/concurrent-source regressions, canonical handle identity and shallow caller payload identity. Avoid coupling the generic engine to object-specific observer hooks.

## Final evidence recovery

Before deleting the ignored SDD workspace, archive needed progress/rulings, reviews and final checks into a NEW completion audit/report; preserve the original protected review artifacts. Final answer must reproduce every Ruling and its cost if wrong. Audit every F01–F20 with concrete source/test/check evidence. Use this goal's b51fa3638822186197f3b6b19e2b76cd2b259f2a baseline for final whole-change review. Keep the existing plan/workspace identities after the date rolls to October29. No replacement goal or implied push/merge/publish.

## Task 8 prepared compiler tool (actual version verified)

Installed isolated TypeScript4.7.4 at /tmp/ctt-client-api-fixes-tools-20261029/node_modules/typescript/bin/tsc (node --version probe printed Version4.7.4; temporary install used --ignore-scripts and changed no project dependencies). scripts/verify-package.cjs supports CTT_TYPESCRIPT_COMPILER. After final standard build/check, run CTT_TYPESCRIPT_COMPILER=/tmp/ctt-client-api-fixes-tools-20261029/node_modules/typescript/bin/tsc node scripts/verify-package.cjs serially; retain actual exit/log to prove the declared floor. Compiler installation log /tmp/ctt-client-api-fixes-tools-20261029-install.log. Root default Node is24.20.0; no cached Volta22 runtime found. The current package floor is4.7.4; do not claim a bump is necessary or compatibility is retained without this check.
