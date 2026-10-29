/** Distinct positions or inclusive intervals, with negative indices relative to the end. */
export type ChildIndexSelection =
  | { readonly indices: readonly number[]; readonly ranges?: never }
  | {
      readonly ranges: readonly {
        readonly from: number;
        readonly through: number;
      }[];
      readonly indices?: never;
    };
