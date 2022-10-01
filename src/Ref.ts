export class Ref<T> {
  private _ref: T;

  constructor(ref: T) {
    this._ref = ref;
  }

  get(): T {
    return this._ref;
  }

  set(ref: T): void {
    this._ref = ref;
  }
}
