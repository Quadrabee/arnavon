import createApi from '../../api';

export default ({ config, dispatcher }) => {
  const api = createApi();

  api.post('/jobs/:id', (req, res) => {
    dispatcher.dispatch(req.params.id, req.body)
      .then(() => {
        return res.send(204);
      });
  });

  api.use((err, req, res, next) => {
    return res.send(500, { error: err.message });
  });

  return api;
};
