export type OrNullAllFields<T extends object> = {
  [K in keyof T]: T[K] | null;
};
