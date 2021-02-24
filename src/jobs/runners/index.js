class RunnersFactory {
  #runners;
  constructor() {
    this.#runners = {};
  }

  register(type, clazz) {
    this.#runners[type] = clazz;
  }

  get(type) {
    if (!this.#runners[type]) {
      throw new Error(`Unknown runner type: ${type}`);
    }
    return this.#runners[type];
  }

  factor(type, config) {
    const clazz = this.get(type);
    return new clazz(config);
  }
}

export default new RunnersFactory();
