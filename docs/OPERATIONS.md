# Operations

## Environment configuration

Local defaults live in `infra/env/.env.local.example`:

- `KAFKA_BROKERS` — comma-separated broker list.
- `KAFKA_CLIENT_ID` — Kafka client identifier.
- `DEBUG` — set to `1` for opt-in logs.

## Moving to a hosted PoC

1. **Enable TLS**
   - Set `KAFKA_SSL=1`.
2. **Enable SASL**
   - Set `KAFKA_SASL` to JSON, e.g. `{ "mechanism": "plain", "username": "...", "password": "..." }`.
3. **Update brokers**
   - Point `KAFKA_BROKERS` at hosted brokers.
4. **Group suffix**
   - Use `KAFKA_GROUP_ID_SUFFIX` to isolate environments.

## Topic operations

- Update `infra/kafka/topics.json` for partitions/retention changes.
- Run `npm run topics` to upsert topics and retention.

## Scaling notes

- Gatekeeper is stateless and can be scaled horizontally with a shared group ID.
- DWP API is in-memory for demo; for hosted PoC use a persistence layer.
- To replay events, reset consumer group offsets or use a new `KAFKA_GROUP_ID_SUFFIX`.
