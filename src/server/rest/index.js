import createApi from '../../api';

export default ({ config, processor }) => {
  const api = createApi();

  api.post('/jobs/:id', (req, res) => {
    processor.schedule(req.params.id, req.body)
      .then(() => {
        return res.send(204);
      });
  });

  api.use((err, req, res, next) => {
    return res.send(500, { error: err.message });
  });

  return api;
};
