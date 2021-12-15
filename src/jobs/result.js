export default class JobResult {

  constructor({ success, error, result }) {
    Object.defineProperties(this, {
      success: {
        writable: false,
        value: success,
      },
      error: {
        writable: false,
        value: error,
      },
      result: {
        writable: false,
        value: result,
      },
    });
  }

  static fail(error, result) {
    return new JobResult({ success: false, error, result });
  }

  static success(result) {
    return new JobResult({ success: true, result });
  }

}
