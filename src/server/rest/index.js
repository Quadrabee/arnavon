import createApi from '../../api';
import { ArnavonError, UnknownJobError, DataValidationError } from '../../robust';

// Valid x-arnavon-push-modes
const PUSH_MODES = ['SINGLE', 'BATCH'];

export default (dispatcher) => {
  const api = createApi();

  api.post('/jobs/:id', (req, res, next) => {
    // Check X-Arnavon-Push-Mode:
    // are we in SINGLE or BATCH mode ?
    const pushMode = (req.headers['x-arnavon-push-mode'] || 'SINGLE')
      .toString()
      .toUpperCase();
    if (!PUSH_MODES.includes(pushMode)) {
      return res.status(400).send({
        error: `Invalid X-Arnavon-Push-Mode header: ${pushMode}`
      });
    }

    // Decide on the dispatch mode
    const dispatchFn = pushMode === 'SINGLE' ? dispatcher.dispatch : dispatcher.dispatchBatch;
    dispatchFn.bind(dispatcher)(req.params.id, req.body, { id: req.id })
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

  api.use((err, req, res, next) => {
    console.error(err);
    if (err instanceof ArnavonError) {
      return res.status(500).send(err);
    }
    return res.status(500).send({ error: err.message });
  });

  return api;
};
