# Architectural Issues and Bug Fixes

## Overview

This document tracks architectural weaknesses and bugs identified in the Arnavon codebase during a comprehensive code review.

## Critical Issues

### 1. AMQP Bindings Never Established
- **File:** `src/queue/drivers/amqp.ts:108`
- **Issue:** `Array.concat()` returns a new array but doesn't mutate the original. Binding promises are never added to the array.
- **Impact:** Queue bindings silently fail, making queues non-functional.
- **Fix:** Use `promises.push(...bindingPromises)` instead of `promises.concat()`.
- **Status:** [x] Fixed

### 2. Lost Promise in Server.start()
- **File:** `src/server/index.ts:57`
- **Issue:** `_startApi(port)` promise isn't returned from `.then()` handler.
- **Impact:** Callers think server started when it hasn't.
- **Fix:** Return the promise from the `.then()` handler.
- **Status:** [x] Fixed

### 3. Unhandled Sync Throw in AMQP Consume
- **File:** `src/queue/drivers/amqp.ts:225`
- **Issue:** If `processor()` throws synchronously, the exception crashes the consumer.
- **Impact:** Single job error can crash entire consumer.
- **Fix:** Wrap processor call in Promise.resolve() to catch sync throws.
- **Status:** [x] Fixed

### 4. Race Condition in AMQP Disconnect
- **File:** `src/queue/drivers/amqp.ts:178-184`
- **Issue:** `#disconnecting` flag set after starting close operation.
- **Impact:** Reconnection attempts can race with shutdown.
- **Fix:** Set flag before calling close.
- **Status:** [x] Fixed

## High Severity Issues

### 5. Memory Leak in Singleton Reset
- **File:** `src/index.ts:20-41`
- **Issue:** `reset()` doesn't disconnect old queue before replacing.
- **Impact:** Each test leaks a connection.
- **Fix:** Disconnect old queue in reset().
- **Status:** [x] Fixed

### 6. No Timeout on Binary Runner
- **File:** `src/jobs/runners/binary.ts:38-77`
- **Issue:** No timeout, unbounded stdout accumulation, no spawn error handler.
- **Impact:** Hung processes block consumer forever; memory exhaustion possible.
- **Fix:** Add timeout (default 5min), limit stdout buffer (10MB), handle spawn errors.
- **Status:** [x] Fixed

### 7. MemoryQueue Swallows Errors
- **File:** `src/queue/drivers/memory.ts:22-28`
- **Issue:** Processor promise not awaited, wrong argument order.
- **Impact:** Job failures invisible in tests.
- **Fix:** Await processor, fix argument order to match QueueInternalProcessor interface.
- **Status:** [x] Fixed

### 8. Invalid Job Push Not Awaited
- **File:** `src/jobs/dispatcher.ts:128`
- **Issue:** Push to invalidJobExchange not awaited before rejecting.
- **Impact:** Invalid jobs may not be queued before request completes.
- **Fix:** Await the push before rejecting.
- **Status:** [x] Fixed

## Medium Severity Issues

### 9. Incomplete Shutdown in Consumer
- **File:** `src/consumer/index.ts:104-109`
- **Issue:** `stop()` doesn't await async cleanup operations.
- **Impact:** Process may exit before cleanup completes.
- **Fix:** Make stop() async and await operations.
- **Status:** [x] Fixed

### 10. Wrong Error Message in AMQP Consume
- **File:** `src/queue/drivers/amqp.ts:206`
- **Issue:** Error says "Cannot push" but function is `_consume()`.
- **Impact:** Misleading error messages.
- **Fix:** Correct the error message to "Cannot consume".
- **Status:** [x] Fixed

### 11. CLI Doesn't Await Server Start
- **File:** `src/cli/commands/start/api.ts:31`
- **Issue:** `server.start(port)` not awaited.
- **Impact:** Startup errors silently ignored.
- **Fix:** Await the start call.
- **Status:** [x] Fixed

### 12. CLI Consumer Doesn't Await Start
- **File:** `src/cli/commands/start/consumer.ts`
- **Issue:** `consumer.start(port)` not awaited.
- **Impact:** Startup errors silently ignored.
- **Fix:** Await the start call.
- **Status:** [x] Fixed

## Low Severity Issues

### 13. Inconsistent Logger Usage
- **File:** `src/server/rest/index.ts:86`
- **Issue:** Uses `console.error` instead of logger.
- **Fix:** Use logger.error() for consistency.
- **Status:** [x] Fixed

### 14. Options Object Mutation
- **File:** `src/jobs/dispatcher.ts:99`
- **Issue:** `delete options['strict']` mutates caller's object.
- **Fix:** Clone options before modifying.
- **Status:** [x] Fixed

## Pre-existing Test Issue (Not Fixed)

### Consumer Test with Proxyquire
- **File:** `tests/consumer/consumer.spec.ts:21`
- **Issue:** Proxyquire cannot read properties of undefined (reading 'require')
- **Impact:** Consumer tests fail
- **Note:** This is a pre-existing issue unrelated to these fixes, likely a compatibility issue with the module system.

## Summary

| Category | Fixed | Total |
|----------|-------|-------|
| Critical | 4 | 4 |
| High | 4 | 4 |
| Medium | 4 | 4 |
| Low | 2 | 2 |
| **Total** | **14** | **14** |

## Testing Results

- Lint: Pass (4 warnings, 0 errors)
- Tests: 192 passing, 3 pending, 1 failing (pre-existing)
