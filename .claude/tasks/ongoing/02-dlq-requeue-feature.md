# Dead Letter Queue Requeue Feature

## Overview
API endpoint to requeue messages from a dead letter queue to a specified destination queue using the RabbitMQ Shovel plugin.

## Requirements
- Support requeue all messages OR a specific count (via query parameter)
- Require explicit destination queue in request body
- Use RabbitMQ Shovel plugin for atomic message transfers
- Self-deleting shovel (no polling, no manual cleanup)
- Fail gracefully if requeue already in progress
- Return estimated message count in response
- Clear error handling when shovel plugin is not enabled

## API Design

### Endpoint
```
POST /queues/:queueName/requeue?count=N
```

**Parameters:**
- `queueName` (path): Name of the dead letter queue to consume from
- `count` (query, optional): Number of messages to requeue. If omitted, requeues all.

**Request Body:**
```json
{
  "destinationQueue": "target-queue"
}
```

**Response:**
```json
{
  "status": "initiated",
  "requeued": 5,
  "failed": 0,
  "errors": []
}
```

- `status`: `"initiated"` (async, shovel created) or `"completed"` (sync, e.g. MemoryQueue)
- `requeued`: Estimated number of messages to be moved (queried before shovel creation)

**Error Responses:**
- `400`: Missing/invalid `destinationQueue` or invalid `count`
- `409`-style error: Requeue already in progress for this queue
- `500`: Shovel plugin not available, auth failure, or connection error

## Implementation

### 1. Types in Queue class
**File:** `src/queue/index.ts`

```typescript
export type RequeueOptions = {
  count?: number;           // Number of messages to requeue (undefined = all)
  destinationQueue: string; // Target queue to move messages to
}

export type RequeueResult = {
  status: 'initiated' | 'completed';
  requeued: number;         // Estimated (initiated) or actual (completed) count
  failed: number;
  errors: Array<{ error: string }>;
}
```

### 2. AmqpQueue implementation via Shovel plugin
**File:** `src/queue/drivers/amqp.ts`

Uses RabbitMQ Management API:

1. **Check for existing shovel** via `GET /api/shovels/{vhost}/{name}`
   - Uses deterministic name: `arnavon-requeue-{sourceQueue}`
   - Fails if shovel already exists (requeue in progress)

2. **Get queue message count** via `GET /api/queues/{vhost}/{queue}`
   - Used to return estimated requeue count

3. **Create self-deleting shovel** via `PUT /api/parameters/shovel/{vhost}/{name}`
   - `src-delete-after`: `count` or `'queue-length'` (auto-deletes when done)
   - `ack-mode`: `'on-confirm'` for safety

4. **Return immediately** with estimated count
   - No polling, no manual deletion
   - Shovel auto-deletes after moving messages

Key shovel configuration:
```json
{
  "value": {
    "src-uri": "amqp://...",
    "src-queue": "dead-letters",
    "dest-uri": "amqp://...",
    "dest-queue": "send-email",
    "src-delete-after": "queue-length",
    "ack-mode": "on-confirm"
  }
}
```

### 3. MemoryQueue implementation
**File:** `src/queue/drivers/memory.ts`

Synchronous implementation moving items between named queues for testing.
Returns `status: 'completed'` with actual count.

### 4. REST API endpoint
**File:** `src/server/rest/index.ts`

```typescript
api.post('/queues/:queueName/requeue', async (req, res, next) => {
  const { queueName } = req.params;
  const count = req.query.count ? parseInt(req.query.count as string, 10) : undefined;
  const { destinationQueue } = req.body || {};
  // Validation and call to Arnavon.queue.requeue()
});
```

## Files Modified

1. `src/queue/index.ts` - Add `requeue` method and types
2. `src/queue/drivers/amqp.ts` - Implement via Shovel API
3. `src/queue/drivers/memory.ts` - Simple queue-to-queue move
4. `src/server/rest/index.ts` - Add `/queues/:queueName/requeue` endpoint

## Configuration

### RabbitMQ Plugins
**File:** `example/rabbitmq/enabled_plugins`
```erlang
[rabbitmq_management,rabbitmq_shovel,rabbitmq_shovel_management].
```

### Docker Compose
**File:** `example/docker-compose.yml`
- RabbitMQ 4.x with management image
- Mount enabled_plugins file
- Healthcheck for service readiness

## Testing

### Unit Tests
- `tests/queue/index.spec.ts` - Base Queue class requeue method
- `tests/queue/drivers/memory.spec.ts` - MemoryQueue requeue
- `tests/server/rest/api.spec.ts` - REST API endpoint tests

### Integration Tests
- `example/webspicy/arnavon/queues/_queueName/requeue/post.yml` - Webspicy tests
- `example/webspicy/schema.fio` - Finitio types for request/response

### Manual Testing
1. Start RabbitMQ with shovel plugins enabled
2. Push jobs to a queue with DLQ configured
3. Force jobs to fail (so they go to DLQ)
4. Call `POST /queues/dead-letters/requeue -d '{"destinationQueue": "send-email"}'`
5. Verify response contains estimated count
6. Verify messages are moved to destination queue
7. Verify shovel auto-deleted after completion
