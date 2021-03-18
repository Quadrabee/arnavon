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
    req.id = uuidv4();
    req.logger = logger.child({ reqId: req.id }, true);
    req.logger.info({ req });
    res.on('finish', () => req.logger.info({ res }));
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
  app.use(bodyParser.json({ limit: process.env.API_BODYPARSER_LIMIT || '1MB' }));

  app.get('/version', (req, res) => {
    res.send({ arnavon: { version, agent } });
  });

  return app;
};

