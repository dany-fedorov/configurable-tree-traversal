import type {
  CommandCommitMode,
  VisitorGroupMetadata,
} from '@core/TraversalVisitor';

/** Command commit boundaries are independent of callback ordering. */
export function getVisitorBatchEnds(
  records: readonly {
    commandCommitMode?: CommandCommitMode | undefined;
    visitorGroup?: VisitorGroupMetadata | undefined;
  }[],
): boolean[] {
  return records.map((record, index) => {
    const next = records[index + 1];
    return (
      record.commandCommitMode === 'afterEachVisitor' ||
      next === undefined ||
      next.commandCommitMode !== 'afterGroup' ||
      next.visitorGroup !== record.visitorGroup
    );
  });
}
