import { NextFunction, Request, Response } from 'express';
import createApi from '../../api';
import { JobDispatcher } from '../../jobs';
import { ArnavonError, UnknownJobError, DataValidationError } from '../../robust';
import logger from '../../logger';
import Arnavon from '../../index';

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

    // Pass all x-* headers (except x-arnavon-*) to the queue
    // This allows using special rabbitmq things like delayed messages, ttl, etc
    const headers = Object.keys(req.headers)
      .filter(h => h.toLowerCase().startsWith('x-') && !h.toLowerCase().startsWith('x-arnavon'))
      .reduce((headers, k) => {
        headers[k] = req.headers[k];
        return headers;
      }, {});

    // Add all x-arnavon-meta-* headers to the metadata
    const additionalMetadata = Object.keys(req.headers)
      .filter(h => h.toLowerCase().startsWith('x-arnavon-meta-'))
      .reduce((headers, k) => {
        const key = k.substring('x-arnavon-meta-'.length);
        headers[key] = req.headers[k];
        return headers;
      }, {});

    // Decide on the dispatch mode
    const dispatchFn = pushMode === 'SINGLE' ? dispatcher.dispatch : dispatcher.dispatchBatch;
    dispatchFn.bind(dispatcher)(req.params.id, req.body, { id: req.id, ...additionalMetadata }, {
      strict: validationMode === 'ALL-OR-NOTHING',
      headers,
    })
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

  api.post('/dlq/:queueName/requeue', async (req, res, next) => {
    const { queueName } = req.params;
    const count = req.query.count ? parseInt(req.query.count as string, 10) : undefined;
    const { destinationQueue } = req.body || {};

    // Validate destinationQueue is provided
    if (!destinationQueue || typeof destinationQueue !== 'string') {
      return res.status(400).send({
        error: 'destinationQueue is required in request body',
      });
    }

    // Validate count if provided
    if (count !== undefined && (isNaN(count) || count < 1)) {
      return res.status(400).send({
        error: 'Invalid count parameter: must be a positive integer',
      });
    }

    try {
      const result = await Arnavon.queue.requeue(queueName, { count, destinationQueue });
      return res.status(200).send(result);
    } catch (err) {
      next(err);
    }
  });

  api.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error(err, 'Unhandled error in REST API');
    if (err instanceof ArnavonError) {
      return res.status(500).send(err);
    }
    return res.status(500).send({ error: err.message });
  });

  return api;
};
