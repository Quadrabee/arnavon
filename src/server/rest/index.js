import createApi from '../../api';
import { UnknownJobError } from '../../robust';

export default (dispatcher) => {
  const api = createApi();

  api.post('/jobs/:id', (req, res, next) => {
    dispatcher.dispatch(req.params.id, req.body, { id: req.id })
      .then((job) => {
        return res.status(201).send(job);
      })
      .catch((err) => {
        if (err instanceof UnknownJobError) {
          return res.status(404).send({ error: err.message });
        }
        next(err);
      });
  });

  api.use((err, req, res, next) => {
    return res.status(500).send({ error: err.message });
  });

  return api;
};
