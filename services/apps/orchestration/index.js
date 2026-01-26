import express from 'express';
import { allowAll } from '../../shared/utils/cors.js';
import { createIdemCache } from './idemCache.js';
import { createProducer } from './producer.js';
import { createConsentRouter } from './routes/consent.js';
import { createTriggersRouter } from './routes/triggers.js';

const app = express();
app.use(express.json());
app.use(allowAll);

const pending = new Map();
const active = new Map();
const audit = [];
const idemCache = createIdemCache();

const { sendEvent } = await createProducer('api');

app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.use('/consent', createConsentRouter({ pending, active, audit, sendEvent, idemCache }));
app.use('/triggers', createTriggersRouter({ sendEvent, idemCache }));

app.listen(4000, () => {
  console.log('Orchestration API listening on :4000');
});
