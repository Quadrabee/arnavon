import { NextFunction, Request, Response } from 'express';
import createApi from '../../api';
import { JobDispatcher } from '../../jobs';
import { ArnavonError, UnknownJobError, DataValidationError } from '../../robust';

// Valid x-arnavon-push-modes
const PUSH_MODES = ['SINGLE', 'BATCH'];

// Valid x-arnavon-batch-input-validation
const VALIDATION_MODES = ['ALL-OR-NOTHING', 'BEST-EFFORT'];

export default (dispatcher: JobDispatcher) => {
  const api = createApi();

  api.post('/jobs/:id', (req, res, next) => {
    // Check X-Arnavon-Push-Mode:
    // are we in SINGLE or BATCH mode ?
    // (defaults to SINGLE)
    const pushMode: string = (req.headers['x-arnavon-push-mode'] || 'SINGLE')
      .toString()
      .toUpperCase();
    if (!PUSH_MODES.includes(pushMode)) {
      return res.status(400).send({
        error: `Invalid X-Arnavon-Push-Mode header: ${pushMode}`,
      });
    }

    // Providing the X-Arnavon-Batch-Input-Validation header in SINGLE push mode does not make sense
    if (pushMode === 'SINGLE' && req.headers['x-arnavon-batch-input-validation']) {
      return res.status(400).send({
        error: 'X-Arnavon-Batch-Input-Validation cannot be used in SINGLE push mode',
      });
    }

    // Check X-Arnavon-Batch-Input-Validation:
    // are we in ALL-OR-NOTHING or BEST-EFFORT mode ?
    // (defaults to best-effort)
    const validationMode = (req.headers['x-arnavon-batch-input-validation'] || 'BEST-EFFORT')
      .toString()
      .toUpperCase();
    if (!VALIDATION_MODES.includes(validationMode)) {
      return res.status(400).send({
        error: `Invalid X-Arnavon-Batch-Input-Validation header: ${validationMode}`,
      });
    }

    // Decide on the dispatch mode
    const dispatchFn = pushMode === 'SINGLE' ? dispatcher.dispatch : dispatcher.dispatchBatch;
    dispatchFn.bind(dispatcher)(req.params.id, req.body, { id: req.id }, { strict: validationMode === 'ALL-OR-NOTHING' })
      .then((job) => {
        return res.status(201).send(job);
      })
      .catch((err) => {
        if (err instanceof UnknownJobError) {
          return res.status(404).send(err);
        }
        if (err instanceof DataValidationError) {
          return res.status(400).send(err);
        }
        next(err);
      });
  });

  api.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    if (err instanceof ArnavonError) {
      return res.status(500).send(err);
    }
    return res.status(500).send({ error: err.message });
  });

  return api;
};
