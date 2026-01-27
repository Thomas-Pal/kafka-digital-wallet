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
import { Navigate, Route } from 'react-router-dom';
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
import { fetchConsentInbox } from '../api/client';
import { useWalletStore } from '../store/walletStore';

export default function AppTabs() {
  const inbox = useWalletStore((state) => state.inbox);
  const pushInbox = useWalletStore((state) => state.pushInbox);
  const [toastMessage, setToastMessage] = useState('');
  const knownIds = useRef(new Set(inbox.map((item) => item.id)));

  useEffect(() => {
    knownIds.current = new Set(inbox.map((item) => item.id));
  }, [inbox]);

  useEffect(() => {
    let mounted = true;

    const pollInbox = async () => {
      try {
        const data: Array<{ id: string; rp: string; scopes: string[]; citizenId: string }> =
          await fetchConsentInbox();
        if (!mounted || !Array.isArray(data)) {
          return;
        }
        const fresh = data.filter((item) => !knownIds.current.has(item.id));
        if (fresh.length > 0) {
          fresh.forEach((item) => pushInbox(item));
          setToastMessage(
            `${fresh.length} new consent request${fresh.length === 1 ? '' : 's'}`
          );
        }
      } catch {
        // Silent: orchestration service may be offline in demo mode.
      }
    };

    pollInbox();
    const interval = window.setInterval(pollInbox, 4000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [pushInbox]);

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route path="/dashboard" component={Dashboard} exact />
        <Route path="/citizen" component={Citizen} exact />
        <Route path="/credentials" component={Credentials} exact />
        <Route path="/consents" component={Consents} exact />
        <Route path="/activity" component={Activity} exact />
        <Route path="/scenarios" component={ScenariosLab} exact />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
        isOpen={Boolean(toastMessage)}
        message={toastMessage}
        duration={2000}
        onDidDismiss={() => setToastMessage('')}
        position="top"
        color="primary"
      />
    </IonTabs>
  );
}
