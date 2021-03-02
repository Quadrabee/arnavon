class ArnavonError extends Error {}

class UnknownJobError extends ArnavonError {
  constructor(jobName) {
    super(`Unknown job: ${jobName}, no definition found`);
  }
}

class DataValidationError extends ArnavonError {
  static fromFinitioError(msg, err) {
    const details = err.rootCausesCache.map(e => {
      return `${e.message} (${e.location})`;
    }).join('\n');
    return new DataValidationError(msg + ' ' + details);
  }
}

const inspect = (t) => {
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
  inspect
};
