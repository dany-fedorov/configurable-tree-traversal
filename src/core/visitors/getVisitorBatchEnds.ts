import type {
  VisitorCommandCommitTiming,
  VisitorGroupMetadata,
} from '@core/TraversalVisitor';

/** Command commit boundaries are independent of callback ordering. */
export function getVisitorBatchEnds(
  records: readonly {
    visitorCommandCommitTiming?: VisitorCommandCommitTiming | undefined;
    visitorGroup?: VisitorGroupMetadata | undefined;
  }[],
): boolean[] {
  return records.map((record, index) => {
    const next = records[index + 1];
    return (
      record.visitorCommandCommitTiming === 'afterEachVisitorCallback' ||
      next === undefined ||
      next.visitorCommandCommitTiming !== 'afterContiguousVisitorBatch' ||
      next.visitorGroup !== record.visitorGroup
    );
  });
}
