import fs from 'fs';
import Finitio from 'finitio';
import YAML from 'yaml';
import { DataValidationError } from '../robust';
import schema from './schema.fio';
import JobConfig from '../jobs/config';

const baseWorld = {
  JobConfig
};

let system;
try {
  system = Finitio.system(schema, { JsTypes: baseWorld });
} catch (err) {
  console.error(err);
  throw new Error(`Invalid finitio schema: ${err.message}`);
}

const dressFromFile = (path, type, world) => {
  let config;
  if (/.*\.ya?ml/.test(path)) {
    config = YAML.parse(fs.readFileSync(path).toString());
  } else {
    config = require(path);
  }
  try {
    config = type.dress(config, world);
  } catch (err) {
    throw DataValidationError.fromFinitioError(`Invalid data for type ${type.name}:`, err);
  }
  return config;
};

const decoratedType = (type) => {
  type.dressFromFile = (path) => dressFromFile(path, type);
  return type;
};

const types = system.types.reduce((types, type) => {
  types[type.name] = decoratedType(type);
  return types;
}, {});

export default types;
