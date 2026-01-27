# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Arnavon (`@quadrabee/arnavon`) is an opinionated producer/consumer framework built on RabbitMQ. It provides TypeScript-based distributed job processing with YAML configuration, Finitio schema validation, and Prometheus metrics.

## Common Commands

```bash
# Build
yarn build              # Compile TypeScript to dist/

# Test
yarn test               # Run all tests with mocha
yarn test:watch         # Run tests in watch mode
npx mocha tests/path/to/file.spec.ts  # Run single test file

# Lint
yarn lint               # Type check + eslint
yarn lint:fix           # Auto-fix lint issues

# Development
yarn build:watch        # Watch mode with Babel

# Package
yarn package            # Create standalone binaries with pkg
```

## Architecture

### Core Singleton (`src/index.ts`)
The `Arnavon` class is the central hub holding global state:
- `Arnavon.registry` - Prometheus metrics registry
- `Arnavon.queue` - Active queue instance
- `Arnavon.config` - Loaded configuration
- `Arnavon.init(config)` - Initialize from config
- `Arnavon.reset()` - Clear state (used in tests)

### Queue System (`src/queue/`)
Abstract `Queue` class (EventEmitter) with pluggable drivers:
- `AmqpQueue` - Full RabbitMQ support with topology management
- `MemoryQueue` - In-memory queue for testing

Interface: `connect()`, `disconnect()`, `push()`, `consume()`

### Job System (`src/jobs/`)
- **Job** - Immutable entity with payload and metadata (id, jobName, timestamps)
- **JobDispatcher** - Routes jobs to queue with Finitio validation, supports single and batch dispatch
- **JobValidator** - Schema validation using Finitio
- **JobRunner** - Abstract executor with two modes (ARNAVON with metrics, RAW without)
  - `NodejsRunner` - Loads and executes Node.js modules
  - `BinaryRunner` - Spawns external executables

### Consumer (`src/consumer/`)
Orchestrates job consumption: connects queue, starts API, runs multiple job runners in parallel.

### REST API (`src/server/rest/`)
Express-based API for job submission:
- `POST /jobs/:id` - Submit single or batch jobs
- `GET /version` - Version info

Headers control behavior:
- `X-Arnavon-Push-Mode`: SINGLE (default) or BATCH
- `X-Arnavon-Batch-Input-Validation`: ALL-OR-NOTHING or BEST-EFFORT
- `X-Arnavon-Meta-*`: Custom metadata

### Configuration (`src/config/`)
YAML configuration with Finitio schema validation. Projects can extend schemas via `schema.fio` and `schema.world.js` files in project root.

### CLI (`src/cli/commands/`)
Built with oclif:
- `arnavon start:api` - Start REST API server
- `arnavon start:consumer [NAME]` - Start consumer

### Error Classes (`src/robust.ts`)
- `ArnavonError` - Base error with JSON serialization
- `UnknownJobError` - Job name not in config
- `DataValidationError` - Schema validation failure
- `InvalidBatch` - Batch validation with split valid/invalid items
- `InvalidRunError` - Runner didn't return Promise

## Testing

Tests mirror the src structure. Each spec file uses:
- Mocha + Chai + chai-as-promised + chai-http
- Sinon for mocking with sinon-chai matchers
- Babel runtime transpilation via `tests/babel-register.js`

Test output goes to `tests/test-results.xml` (JUnit format).

## Key Patterns

- **Singleton**: Arnavon class holds global state
- **Factory**: Queue drivers and job runners created via factory methods
- **Strategy**: Pluggable queue drivers and runner implementations
- **Event-Driven**: Queue and process lifecycle events
- **Validation Pipeline**: Finitio schemas for jobs with custom schema inheritance

## Important Notes

- TypeScript strict mode is disabled
- Queue errors exit process with code 10 (designed for auto-restart)
- All job throughput tracked by job name for per-job observability
- Requires Node.js >= 18.0.0 and RabbitMQ 4.x
