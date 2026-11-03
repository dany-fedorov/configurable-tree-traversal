/** Distinct positions or inclusive intervals, with negative indices relative to the end. */
export type ZeroBasedOrEndRelativeChildIndexSelection =
  | { readonly indices: readonly number[]; readonly ranges?: never }
  | {
      readonly ranges: readonly {
        readonly fromInclusive: number;
        readonly throughInclusive: number;
      }[];
      readonly indices?: never;
    };
