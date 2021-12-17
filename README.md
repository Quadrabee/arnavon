arnavon
===========

![ArnavonLogo](assets/arnavon-full@1.5x.png)

Opinionated producer/consumer framework on top of RabbitMQ.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@quadrabee/arnavon.svg)](https://npmjs.org/package/@quadrabee/arnavon)
[![Build Status](https://travis-ci.com/Quadrabee/arnavon.svg?branch=master)](https://travis-ci.com/Quadrabee/arnavon)
[![Downloads/week](https://img.shields.io/npm/dw/@quadrabee/arnavon.svg)](https://npmjs.org/package/@quadrabee/arnavon)
[![License](https://img.shields.io/npm/l/@quadrabee/arnavon.svg)](https://github.com/quadrabee/arnavon/blob/master/package.json)

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
@quadrabee/arnavon/0.2.12 darwin-x64 node-v16.13.1
$ arnavon --help [COMMAND]
USAGE
  $ arnavon COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`arnavon help [COMMAND]`](#arnavon-help-command)
* [`arnavon start`](#arnavon-start)
* [`arnavon start:api`](#arnavon-startapi)
* [`arnavon start:consumer [NAME]`](#arnavon-startconsumer-name)

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.10/src/commands/help.ts)_

## `arnavon start`

Starts an arnavon component

```
USAGE
  $ arnavon start

OPTIONS
  -c, --config=config  location of config file (default "config.yaml")
```

## `arnavon start:api`

Starts the Arnavon REST API

```
USAGE
  $ arnavon start:api

OPTIONS
  -c, --config=config  location of config file (default "config.yaml")
  -p, --port=port      Port to use for API (default 3000)

DESCRIPTION
  ...
  The REST API provides ways to push Jobs to queues, with validation
```

## `arnavon start:consumer [NAME]`

Starts an Arnavon consumer

```
USAGE
  $ arnavon start:consumer [NAME]

ARGUMENTS
  NAME  The name of the consumer to start

OPTIONS
  -a, --all            Start all consumers instead of just one (not recommended, but can be useful in dev)
  -c, --config=config  location of config file (default "config.yaml")
  -p, --port=port      Port to use for API (default 3000)
  -x, --except=except  Specify a consumer that should not be started. (Requires -a/--all. Can be used multiple times)

DESCRIPTION
  ...
  This command can be used to start one of the consumer defined in your config file.

  Please note that the --all flag can be used to start all consumers at once, but this is not recommended in production.
```
<!-- commandsstop -->
