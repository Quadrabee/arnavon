import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import bodyParser from 'body-parser';
import promBundle from 'express-prom-bundle';
import logger from '../logger';
import { AWFMError } from '../robust';

export default () => {
  const app = express();

  app.use((req, res, next) => {
    req.log = logger.child({ req_id: uuidv4() }, true);
    req.log.info({ req });
    res.on('finish', () => req.log.info({ res }));
    next();
  });

  // expose prometheus metrics
  const metricsMiddleware = promBundle({ includeMethod: true, includePath: true });
  app.use(metricsMiddleware);

  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: false }));

  // parse application/json
  app.use(bodyParser.json());

  return app;
};

