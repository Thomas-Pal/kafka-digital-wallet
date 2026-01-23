import { createKafka, waitForBroker } from '../lib/kafka.js';
import { RUN_ID } from '../config.js';

export async function createProducer(clientIdSuffix) {
  const kafka = createKafka(`orchestration-${clientIdSuffix}-${RUN_ID}`);
  await waitForBroker(kafka);
  const producer = kafka.producer({
    idempotent: true,
    maxInFlightRequests: 1,
    retry: { retries: 8 },
  });
  await producer.connect();

  const sendEvent = async ({ topic, key, value, eventId }) => {
    await producer.send({
      topic,
      acks: -1,
      messages: [
        {
          key,
          value: JSON.stringify(value),
          headers: {
            'x-event-id': eventId,
          },
        },
      ],
    });
  };

  return { producer, sendEvent };
}
