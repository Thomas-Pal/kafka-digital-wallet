import { useEffect, useRef, useState } from 'react';
import {
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonToast,
} from '@ionic/react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import {
  albumsOutline,
  flaskOutline,
  homeOutline,
  personCircleOutline,
  shieldCheckmarkOutline,
  timeOutline,
} from 'ionicons/icons';
import Dashboard from '../pages/Dashboard';
import Citizen from '../pages/Citizen';
import Credentials from '../pages/Credentials';
import Consents from '../pages/Consents';
import Activity from '../pages/Activity';
import ScenariosLab from '../pages/ScenariosLab';
import { fetchActiveConsents, fetchConsentInbox } from '../api/client';
import { useWalletStore } from '../store/walletStore';
import { startNotifications } from '../lib/notifications';

export default function AppTabs() {
  const navigate = useNavigate();
  const inbox = useWalletStore((state) => state.inbox);
  const pushInbox = useWalletStore((state) => state.pushInbox);
  const setConsents = useWalletStore((state) => state.setConsents);
  const citizenId = useWalletStore((state) => state.citizen.id);
  const addActivity = useWalletStore((state) => state.addActivity);
  const [notificationToast, setNotificationToast] = useState<{
    title: string;
    message: string;
    action?: { label: string; href: string };
  } | null>(null);
  const knownIds = useRef(new Set(inbox.map((item) => item.id)));
  const knownNotifications = useRef(new Set<string>());

  useEffect(() => {
    knownIds.current = new Set(inbox.map((item) => item.id));
  }, [inbox]);

  useEffect(() => {
    const stop = startNotifications(citizenId, (notification) => {
      if (knownNotifications.current.has(notification.id)) {
        return;
      }
      knownNotifications.current.add(notification.id);
      setNotificationToast({
        title: notification.title,
        message: notification.body,
        action: notification.action,
      });
      addActivity({
        id: notification.id,
        ts: notification.createdAt,
        kind: 'request',
        summary: notification.title,
        details: notification.body,
      });
    });
    return () => stop();
  }, [addActivity, citizenId]);

  useEffect(() => {
    let mounted = true;

    const pollInbox = async () => {
      try {
        const response = await fetchConsentInbox();
        if (!mounted) {
          return;
        }
        if (!response.ok) {
          if (response.status === 404) {
            window.clearInterval(interval);
          }
          return;
        }
        const data = response.data as Array<{
          id: string;
          rp: string;
          scopes: string[];
          citizenId: string;
          purpose?: string;
          durationDays?: number;
          caseId?: string;
          requestedAt?: string;
        }>;
        if (!Array.isArray(data)) {
          return;
        }
        const fresh = data.filter((item) => !knownIds.current.has(item.id));
        if (fresh.length > 0) {
          fresh.forEach((item) => pushInbox(item));
        }
      } catch {
        // Silent: orchestration service may be offline in demo mode.
      }
    };

    const pollActive = async () => {
      try {
        const response = await fetchActiveConsents();
        if (!mounted) {
          return;
        }
        if (!response.ok) {
          if (response.status === 404) {
            window.clearInterval(interval);
          }
          return;
        }
        const data = response.data as Array<{
          id: string;
          citizenId: string;
          grantedTo: string;
          scopes: string[];
          ttlDays: number;
          issuedAt: string;
          expiresAt: string;
          caseId?: string;
        }>;
        if (!Array.isArray(data)) {
          return;
        }
        setConsents((current) => {
          const byId = new Map(current.map((consent) => [consent.id, consent]));
          for (const consent of data) {
            byId.set(consent.id, {
              id: consent.id,
              citizenId: consent.citizenId,
              rp: consent.grantedTo,
              scopes: consent.scopes,
              status: 'granted',
              issuedAt: consent.issuedAt,
              expiresAt: consent.expiresAt,
              caseId: consent.caseId,
            });
          }
          return Array.from(byId.values());
        });
      } catch {
        // Silent: orchestration service may be offline in demo mode.
      }
    };

    let interval = 0;
    interval = window.setInterval(() => {
      pollInbox();
      pollActive();
    }, 4000);
    pollInbox();
    pollActive();
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [pushInbox, setConsents]);

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/citizen" element={<Citizen />} />
          <Route path="/credentials" element={<Credentials />} />
          <Route path="/consents" element={<Consents />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/scenarios" element={<ScenariosLab />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </IonRouterOutlet>

      <IonTabBar slot="bottom" className="wallet-tabbar">
        <IonTabButton tab="dashboard" href="/dashboard">
          <IonIcon icon={homeOutline} />
          <IonLabel>Home</IonLabel>
        </IonTabButton>
        <IonTabButton tab="citizen" href="/citizen">
          <IonIcon icon={personCircleOutline} />
          <IonLabel>Citizen</IonLabel>
        </IonTabButton>
        <IonTabButton tab="credentials" href="/credentials">
          <IonIcon icon={albumsOutline} />
          <IonLabel>Credentials</IonLabel>
        </IonTabButton>
        <IonTabButton tab="consents" href="/consents">
          <IonIcon icon={shieldCheckmarkOutline} />
          <IonLabel>Consents</IonLabel>
        </IonTabButton>
        <IonTabButton tab="activity" href="/activity">
          <IonIcon icon={timeOutline} />
          <IonLabel>Activity</IonLabel>
        </IonTabButton>
        <IonTabButton tab="scenarios" href="/scenarios">
          <IonIcon icon={flaskOutline} />
          <IonLabel>Scenarios</IonLabel>
        </IonTabButton>
      </IonTabBar>

      <IonToast
        isOpen={Boolean(notificationToast)}
        header={notificationToast?.title}
        message={notificationToast?.message}
        duration={6000}
        onDidDismiss={() => setNotificationToast(null)}
        position="top"
        color="tertiary"
        buttons={
          notificationToast?.action
            ? [
                {
                  text: notificationToast.action.label,
                  handler: () => {
                    navigate(notificationToast.action?.href ?? '/consents');
                    setNotificationToast(null);
                  },
                },
              ]
            : undefined
        }
      />
    </IonTabs>
  );
}
