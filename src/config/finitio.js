import fs from 'fs';
import path from 'path';
import Finitio from 'finitio';
import YAML from 'yaml';
import { AWFWError, DataValidationError } from '../robust';

const schema = fs.readFileSync(path.join(__dirname, 'schema.fio')).toString();

let system;
try {
  system = Finitio.system(schema);
} catch (err) {
  console.error(err);
  throw new AWFWError(`Invalid finitio schema: ${err.message}`);
}

const dressFromFile = (path, type) => {
  let config;
  if (/.*\.ya?ml/.test(path)) {
    config = YAML.parse(fs.readFileSync(path).toString());
  } else {
    config = require(path);
  }
  try {
    config = type.dress(config);
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
