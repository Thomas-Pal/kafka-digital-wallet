import { createKafka, waitForBroker } from './lib/kafka.js';
import { RUN_ID, groupId } from './config.js';

const kafka = createKafka(`coach-api-${RUN_ID}`);
await waitForBroker(kafka);

const consumer = kafka.consumer({ groupId: groupId('coach-view') });
await consumer.connect();
await consumer.subscribe({ topic: 'views.permitted.coach.basic', fromBeginning: true });

await consumer.run({
  eachMessage: async ({ message }) => {
    const evt = JSON.parse(message.value.toString());
    console.log('[coach] support scheduled for', evt.citizenId, evt.payload);
  }
});
