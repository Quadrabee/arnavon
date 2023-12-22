export default class JobResult {

  constructor({ success, error, result }: { success: boolean, error?: Error, result: unknown }) {
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

  static fail(error: Error, result: unknown) {
    return new JobResult({ success: false, error, result });
  }

  static success(result: unknown) {
    return new JobResult({ success: true, result });
  }

}
