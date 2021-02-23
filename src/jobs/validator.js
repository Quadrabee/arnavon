import Finitio from 'finitio';
import { inspect, DataValidationError } from '../robust';

export default class JobValidator {

  #schema;

  /**
   * Creates a new JobValidator
   *
   * @param {Finitio.Schema} schema a finitio schema that will be used to ensure the job input data
   * is valid
   */
  constructor(schema) {
    if (!(schema instanceof Finitio.System)) {
      throw new Error(`Finitio system expected, got ${inspect(schema)}`);
    }
    this.#schema = schema;
  }

  /**
   * Validates the input data for a job
   *
   * @param {Object} inputData
   */
  validate(inputData) {
    try {
      return this.#schema.dress(inputData);
    } catch (err) {
      if (err instanceof Finitio.TypeError) {
        throw DataValidationError.fromFinitioError('Invalid input data:', err);
      }
      throw err;
    }
  }

}
