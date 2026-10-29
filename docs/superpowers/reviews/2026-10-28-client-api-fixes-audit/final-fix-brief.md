# Final review correction wave

Workdir /home/df/.codex/worktrees/04b4/configurable-tree-traversal, branch feat/api-clarity-migration, base7baeff97f2e437e5bae7fd008c16f625c52b5871. Read final-review.md in this workspace first. Complete findings list:0Critical0Important1Minor.

Correct docs/migration-client-api.md F19 previous-usage cell (line29): actual old tree/DAG operation was sortChildHints, actual old walking operation visitor; new literals are sortChildrenHints and visit. Preserve distinct iterator labels. No source/API/test changes are requested.

Read AGENTS.md and inspect diff/source baseline for this doc claim. No subagents; no push/merge/publish; do not touch original checkout or protected old audit/report. Existing untracked new audit task8review/rereview copies belong to controller; leave unstaged.

Run covering verification after correction: CTT_TYPESCRIPT_COMPILER=/tmp/ctt-client-api-fixes-tools-20261029/node_modules/typescript/bin/tsc node scripts/verify-package.cjs against existing final build (production unchanged). This existing gate verifies actual packed guide inclusion/navigation/snippet execution and actualTS4.7.4 declarations/runtime identities. Do not add tests or repeat full source suite for a factual table correction. Keep stdout/stderr and explicit command/exit/compiler/version metadata in NEW docs/superpowers/reviews/2026-10-28-client-api-fixes-audit/final-doc-fix-package.log and .json. Original final-check/floor logs and tested-inputs.json are historical evidence: do not overwrite. Create final-reviewed-inputs.json in new audit directory with current529tracked-input hashes after correction, based on original tested-inputs keys; only guide hash should differ. Record exact changed-input list, runtime source/test identity, and diff whitespace validation in final-fix-report.md in workspace.

Commit only corrected guide plus your3newverificationartifacts (log,json,final-reviewed-inputs.json); preserve unrelated existing untracked2protectedpaths and controller2reviewcopies. Return status,commit,testsummary,reportpath. Controller will scopedreview then archive final verdict/completion audit.
