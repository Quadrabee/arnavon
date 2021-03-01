import createApi from '../../api';

export default (dispatcher) => {
  const api = createApi();

  api.post('/jobs/:id', (req, res, next) => {
    dispatcher.dispatch(req.params.id, req.body)
      .then((job) => {
        return res.status(201).send(job);
      })
      .catch(next);
  });

  api.use((err, req, res, next) => {
    return res.status(500).send({ error: err.message });
  });

  return api;
};
