import Finitio from 'finitio';
import { inspect, DataValidationError } from '../robust';
import logger from '../logger';

export default class JobValidator {

  #schema;

  /**
   * Creates a new JobValidator
   *
   * @param {Finitio.Schema} schema a finitio schema that will be used to ensure the job input data
   * is valid
   */
  constructor(schema: Finitio.System) {
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
  validate(inputData: any) {
    try {
      return this.#schema.dress(inputData);
    } catch (err) {
      if (err instanceof Finitio.TypeError) {
        logger.error('Invalid job payload', err);
        logger.debug({ inputData }, 'Input data does not respect the schema');
        throw DataValidationError.fromFinitioError('Invalid input data:', err);
      }
      throw err;
    }
  }

}
