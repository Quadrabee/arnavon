interface FinitioError extends Error {
  message: string;
  location: string;
  rootCauses: FinitioError[]
}

class ArnavonError extends Error {
  toJSON() {
    return {
      error: this.message,
    };
  }
}

class UnknownJobError extends ArnavonError {
  constructor(jobName: string) {
    super(`Unknown job: ${jobName}, no definition found`);
  }
}

class DataValidationError extends ArnavonError {
  static fromFinitioError(msg: string, err: FinitioError) {
    const details = err.rootCauses.map(e => {
      return `${e.message} (${e.location})`;
    }).join('\n');
    return new DataValidationError(`${msg} ${details}`);
  }
}

class InvalidRunError extends ArnavonError {

}

class InvalidBatch extends DataValidationError {
  public valids: any[]
  public invalids: any[]
  constructor(message: string, invalids: any[], valids: any[]) {
    super(message);
    this.valids = valids;
    this.invalids = invalids;
  }

  toJSON() {
    return {
      error: this.message,
      valids: this.valids,
      invalids: this.invalids,
    };
  }
}

const inspect = (t: unknown) => {
  if (t === undefined) {
    return 'undefined';
  }
  if (t === null) {
    return 'null';
  }
  if (t.constructor) {
    return t.constructor.name;
  }
  return t;
};

export {
  ArnavonError,
  DataValidationError,
  UnknownJobError,
  InvalidBatch,
  InvalidRunError,
  inspect,
};
