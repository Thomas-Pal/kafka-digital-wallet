const ORCH_BASE =
  import.meta.env.VITE_ORCH_BASE_URL ??
  import.meta.env.VITE_ORCH_URL ??
  import.meta.env.VITE_ORCH_API ??
  'http://localhost:4000';

export type NotificationPayload = {
  id: string;
  citizenId: string;
  title: string;
  body: string;
  action?: { label: string; href: string };
  createdAt: string;
};

export function startNotifications(
  citizenId: string,
  onMessage: (notification: NotificationPayload) => void
) {
  const url = `${ORCH_BASE}/notifications/stream?citizenId=${encodeURIComponent(citizenId)}`;
  let eventSource: EventSource | null = null;
  let stopped = false;

  try {
    eventSource = new EventSource(url);
    eventSource.onmessage = (event) => {
      try {
        onMessage(JSON.parse(event.data));
      } catch {
        // Ignore malformed payloads.
      }
    };
    eventSource.onerror = () => {
      eventSource?.close();
      eventSource = null;
    };
  } catch {
    eventSource = null;
  }

  const poll = async () => {
    if (stopped || eventSource) {
      return;
    }
    try {
      const response = await fetch(
        `${ORCH_BASE}/notifications?citizenId=${encodeURIComponent(citizenId)}`
      );
      if (response.ok) {
        const items: NotificationPayload[] = await response.json();
        if (items?.[0]) {
          onMessage(items[0]);
        }
      }
    } catch {
      // Ignore polling failures in demo mode.
    }
    window.setTimeout(poll, 3000);
  };

  window.setTimeout(poll, 2000);

  return () => {
    stopped = true;
    eventSource?.close();
  };
}
