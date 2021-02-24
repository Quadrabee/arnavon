class DummyRunner {
  constructor() {
    this.reset();
  }
  reset() {
    this.calls = [];
  }
  run(payload) {
    this.calls.push(payload);
  }
}
const runner = new DummyRunner();

module.exports = runner.run.bind(runner);
module.exports.runner = runner;
