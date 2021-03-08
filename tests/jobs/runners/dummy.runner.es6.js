class DummyRunner {
  constructor() {
    this.reset();
    this.promise = Promise.resolve();
  }
  reset() {
    this.calls = [];
  }
  run(payload) {
    this.calls.push(payload);
    return this.promise;
  }
}

const runner = new DummyRunner();

export default runner.run.bind(runner);
export { runner };
