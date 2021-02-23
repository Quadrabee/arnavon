class AWFMError extends Error {}

class DataValidationError extends Error {
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
  AWFMError,
  DataValidationError,
  inspect
};
