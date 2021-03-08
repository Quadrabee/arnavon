arnavon
===========

Opiniated producer/consumer framework on top of RabbitMQ.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@quadrabee/arnavon-cli.svg)](https://npmjs.org/package/@quadrabee/arnavon-cli)
[![Build Status](https://travis-ci.com/Quadrabee/arnavon.svg?branch=master)](https://travis-ci.com/Quadrabee/arnavon)
[![Downloads/week](https://img.shields.io/npm/dw/@quadrabee/arnavon-cli.svg)](https://npmjs.org/package/@quadrabee/arnavon-cli)
[![License](https://img.shields.io/npm/l/@quadrabee/arnavon-cli.svg)](https://github.com/quadrabee/arnavon-cli/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @quadrabee/arnavon
$ arnavon COMMAND
running command...
$ arnavon (-v|--version|version)
@quadrabee/arnavon/0.1.17 darwin-x64 node-v12.18.4
$ arnavon --help [COMMAND]
USAGE
  $ arnavon COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
- [arnavon](#arnavon)
- [Usage](#usage)
- [Commands](#commands)
  - [`arnavon api`](#arnavon-api)
  - [`arnavon consumer CONSUMERNAME`](#arnavon-consumer-consumername)
  - [`arnavon help [COMMAND]`](#arnavon-help-command)

## `arnavon api`

Starts the Arnavon REST API

```
USAGE
  $ arnavon api

OPTIONS
  -c, --config=config  location of config file (default "config.yaml")
  -p, --port=port      Port to use for API (default 3000)

DESCRIPTION
  ...
  The REST API provides ways to push Jobs to queues, with validation
```

## `arnavon consumer CONSUMERNAME`

Starts an Arnavon consumer

```
USAGE
  $ arnavon consumer CONSUMERNAME

ARGUMENTS
  CONSUMERNAME  The name of the consumer to start

OPTIONS
  -c, --config=config  location of config file (default "config.yaml")
  -p, --port=port      Port to use for the API exposing prometheus metrics (default 3000)

DESCRIPTION
  ...
  TO BE DOCUMENTED
```

## `arnavon help [COMMAND]`

display help for arnavon

```
USAGE
  $ arnavon help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.2/src/commands/help.ts)_
<!-- commandsstop -->
