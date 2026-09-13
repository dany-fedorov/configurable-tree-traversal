type Waiter = {
  promise: Promise<void>;
  resolve: () => void;
};

export class Wakeup {
  private notified = false;
  private waiter: Waiter | null = null;

  public notify(): void {
    if (this.waiter !== null) {
      this.waiter.resolve();
      return;
    }
    this.notified = true;
  }

  public wait(): Promise<void> {
    if (this.notified) {
      this.notified = false;
      return Promise.resolve();
    }
    if (this.waiter !== null) return this.waiter.promise;

    let resolve!: () => void;
    const promise = new Promise<void>((done) => {
      resolve = done;
    });
    this.waiter = { promise, resolve };
    void promise.then(() => {
      this.waiter = null;
    });
    return promise;
  }
}
