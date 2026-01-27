import type { Request, Response } from 'express';

export type Notification = {
  id: string;
  citizenId: string;
  title: string;
  body: string;
  action?: { label: string; href: string };
  createdAt: string;
};

const subscribers = new Map<string, Set<Response>>();
const queue = new Map<string, Notification[]>();
const MAX_QUEUE = 50;

export function pushNotification(notification: Notification) {
  const list = queue.get(notification.citizenId) ?? [];
  list.unshift(notification);
  queue.set(notification.citizenId, list.slice(0, MAX_QUEUE));

  const conns = subscribers.get(notification.citizenId);
  if (conns) {
    const payload = `data: ${JSON.stringify(notification)}\n\n`;
    for (const res of conns) {
      res.write(payload);
    }
  }
}

export function sseHandler(req: Request, res: Response) {
  const citizenId = String(req.query.citizenId || '');
  if (!citizenId) {
    res.status(400).send('citizenId required');
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write('retry: 3000\n\n');

  let set = subscribers.get(citizenId);
  if (!set) {
    set = new Set();
    subscribers.set(citizenId, set);
  }
  set.add(res);

  req.on('close', () => {
    set?.delete(res);
  });
}

export function listHandler(req: Request, res: Response) {
  const citizenId = String(req.query.citizenId || '');
  if (!citizenId) {
    res.status(400).send('citizenId required');
    return;
  }
  res.json(queue.get(citizenId) ?? []);
}
