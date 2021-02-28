import { version } from '../../package.json';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import bodyParser from 'body-parser';
import promBundle from 'express-prom-bundle';
import logger from '../logger';
import Arnavon from '../';

/**
 * Creates an express app, reusing a previous prometheus registry if provided
 * if not, a new one is created
 */
export default ({ agent = 'arnavon' } = {}) => {
  const app = express();

  app.use((req, res, next) => {
    req.log = logger.child({ req_id: uuidv4() }, true);
    req.log.info({ req });
    res.on('finish', () => req.log.info({ res }));
    next();
  });

  // expose prometheus metrics
  const metricsMiddleware = promBundle({
    includeMethod: true,
    includePath: true,
    promRegistry: Arnavon.registry
  });
  app.use(metricsMiddleware);

  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: false }));

  // parse application/json
  app.use(bodyParser.json());

  app.get('/version', (req, res) => {
    res.send({ arnavon: { version, agent } });
  });

  return app;
};

