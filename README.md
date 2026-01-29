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
$ arnavon (--version)
@quadrabee/arnavon/1.3.0 darwin-x64 node-v22.18.0
$ arnavon --help [COMMAND]
USAGE
  $ arnavon COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`arnavon help [COMMANDS]`](#arnavon-help-commands)
* [`arnavon queues`](#arnavon-queues)
* [`arnavon queues:requeue QUEUENAME`](#arnavon-queuesrequeue-queuename)
* [`arnavon start`](#arnavon-start)
* [`arnavon start:api`](#arnavon-startapi)
* [`arnavon start:consumer [NAME]`](#arnavon-startconsumer-name)

## `arnavon help [COMMANDS]`

Display help for arnavon.

```
USAGE
  $ arnavon help [COMMANDS] [-n]

ARGUMENTS
  COMMANDS  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for arnavon.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.20/src/commands/help.ts)_

## `arnavon queues`

Queue management commands

```
USAGE
  $ arnavon queues
```

## `arnavon queues:requeue QUEUENAME`

Requeue messages from a dead letter queue back to the original queue

```
USAGE
  $ arnavon queues:requeue QUEUENAME [-c <value>] [-n <value>]

ARGUMENTS
  QUEUENAME  The name of the dead letter queue to requeue from

FLAGS
  -c, --config=<value>  [default: config.yaml] location of config file (defaults to 'config.yaml').
  -n, --count=<value>   Number of messages to requeue (default: all messages)

DESCRIPTION
  Requeue messages from a dead letter queue back to the original queue

  Moves messages from a dead letter queue back to the original queue for reprocessing.

  This command uses the RabbitMQ Shovel plugin to efficiently move messages.
  Messages are republished to the exchange with their original routing key.

  Examples:
  $ arnavon queue requeue my-queue
  $ arnavon queue requeue my-queue --count 10
  $ arnavon queue requeue my-queue -n 100 -c config.yaml
```

## `arnavon start`

Starts an arnavon component

```
USAGE
  $ arnavon start
```

## `arnavon start:api`

The REST API provides ways to push Jobs to queues, with validation

```
USAGE
  $ arnavon start:api [-c <value>] [-p <value>]

FLAGS
  -c, --config=<value>  [default: config.yaml] location of config file (defaults to 'config.yaml').
  -p, --port=<value>    Port to use for API (default 3000)
```

## `arnavon start:consumer [NAME]`

Starts an Arnavon consumer

```
USAGE
  $ arnavon start:consumer [NAME] [-c <value>] [-x <value> -a] [-p <value>]

ARGUMENTS
  NAME  The name of the consumer to start

FLAGS
  -a, --all                Start all consumers instead of just one (not recommended, but can be useful in dev)
  -c, --config=<value>     [default: config.yaml] location of config file (defaults to 'config.yaml').
  -p, --port=<value>       Port to use for API (default 3000)
  -x, --except=<value>...  Specify a consumer that should not be started. (Requires -a/--all. Can be used multiple
                           times)
```
<!-- commandsstop -->
