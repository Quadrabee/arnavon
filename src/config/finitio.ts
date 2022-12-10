import fs from 'fs';
import Finitio from 'finitio';
import YAML from 'yaml';
import { DataValidationError } from '../robust';
import schema from './schema.fio';
import JobConfig from '../jobs/config';
import ConsumerConfig from '../consumer/config';

const baseWorld = {
  JobConfig,
  ConsumerConfig,
};

interface FinitioType {
  name: string,
  dress(value: any, system: unknown): unknown
  dressFromFile(path: string, baseSystem: unknown): unknown
}

let system;
try {
  system = Finitio.system(schema, { JsTypes: baseWorld });
} catch (err: any) {
  console.error(err);
  throw new Error(`Invalid finitio schema: ${err.message}`);
}

const dressFromFile = (path: string, type: FinitioType, baseSystem: unknown) => {
  let config;
  if (/.*\.ya?ml/.test(path)) {
    config = YAML.parse(fs.readFileSync(path).toString());
  } else {
    config = require(path);
  }
  try {
    config = type.dress(config, baseSystem);
  } catch (err: any) {
    throw DataValidationError.fromFinitioError(`Invalid data for type ${type.name}:`, err);
  }
  return config;
};

const decoratedType = (type: FinitioType) => {
  type.dressFromFile = (path: string, baseSystem: unknown) => dressFromFile(path, type, baseSystem);
  return type;
};

const types = system.types.reduce((types: {[key: string]: FinitioType}, type: FinitioType) => {
  types[type.name] = decoratedType(type);
  return types;
}, {});

export default types;
