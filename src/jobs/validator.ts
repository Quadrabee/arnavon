import Finitio from 'finitio';
import { inspect, DataValidationError } from '../robust';
import logger from '../logger';

/**
 * A validator function takes unknown input data and returns the
 * validated/dressed data. It should throw on invalid input.
 */
export type ValidatorFn = (data: unknown) => unknown;

export default class JobValidator {

  #validateFn: ValidatorFn;

  /**
   * Creates a new JobValidator
   *
   * Accepts either a Finitio.System or a plain validator function.
   */
  constructor(schema: Finitio.System | ValidatorFn) {
    if (typeof schema === 'function') {
      this.#validateFn = schema;
    } else if (schema instanceof Finitio.System) {
      this.#validateFn = (inputData: unknown) => {
        try {
          return schema.dress(inputData);
        } catch (err) {
          if (err instanceof Finitio.TypeError) {
            logger.error('Invalid job payload', err);
            logger.debug({ inputData }, 'Input data does not respect the schema');
            throw DataValidationError.fromFinitioError('Invalid input data:', err);
          }
          throw err;
        }
      };
    } else {
      throw new Error(`Finitio system or validator function expected, got ${inspect(schema)}`);
    }
  }

  /**
   * Validates the input data for a job
   */
  validate(inputData: unknown) {
    return this.#validateFn(inputData);
  }

}
