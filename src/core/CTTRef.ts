export class CTTRef<T> {
  private _ref: T;

  constructor(ref: T) {
    this._ref = ref;
  }

  unref(): T {
    return this._ref;
  }

  setPointsTo(ref: T): void {
    this._ref = ref;
  }
}
