import createApi from '../../api';

export default ({ config, dispatcher }) => {
  const api = createApi();

  api.post('/jobs/:id', (req, res, next) => {
    dispatcher.dispatch(req.params.id, req.body)
      .then(() => {
        return res.send(204);
      })
      .catch(next);
  });

  api.use((err, req, res, next) => {
    return res.status(500).send({ error: err.message });
  });

  return api;
};
