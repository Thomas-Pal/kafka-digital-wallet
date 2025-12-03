import cors from 'cors';
export const allowAll = cors({ origin: true, methods: ['GET','POST','OPTIONS'], allowedHeaders: ['content-type'] });
