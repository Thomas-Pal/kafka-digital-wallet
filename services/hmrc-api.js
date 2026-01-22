import { createKafka, waitForBroker } from './lib/kafka.js';
import { P45SummaryEvent } from './schemas.js';
import { RUN_ID, groupId } from './config.js';

const kafka = createKafka(`hmrc-api-${RUN_ID}`);
await waitForBroker(kafka);
const producer = kafka.producer();
await producer.connect();

const consumer = kafka.consumer({ groupId: groupId('hmrc-termination') });
await consumer.connect();
await consumer.subscribe({ topic: 'employment.termination', fromBeginning: true });

await consumer.run({
  eachMessage: async ({ message }) => {
    const evt = JSON.parse(message.value.toString());
    const p45 = P45SummaryEvent({ citizenId: evt.citizenId });
    await producer.send({ topic: 'hmrc.p45.summary', messages: [{ key: p45.citizenId, value: JSON.stringify(p45) }] });
    console.log('[hmrc] emitted p45 for', p45.citizenId);
  }
});
