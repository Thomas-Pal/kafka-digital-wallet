import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonBadge,
} from '@ionic/react';
import { useEffect, useState } from 'react';
import CitizenBanner from '../components/CitizenBanner';
import StatPill from '../components/StatPill';
import Timeline from '../components/Timeline';
import { useCitizenStore } from '../state/useCitizenStore';
import { fetchPendingConsents } from '../services/api';

type PendingConsent = {
  id: string;
  grantedTo: string;
  scopes: string[];
  purpose?: string;
  requestedAt: string;
};

export default function Dashboard() {
  const activity = useCitizenStore((state) => state.activity);
  const [pending, setPending] = useState<PendingConsent[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const response = await fetchPendingConsents();
      if (mounted && response.ok) {
        setPending((response.data as PendingConsent[]) || []);
      }
    };
    load();
    const interval = setInterval(load, 4000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="header-gov">
          <IonTitle>Digital Wallet Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <CitizenBanner />

        <IonGrid>
          <IonRow>
            <IonCol size="12" sizeMd="4">
              <StatPill label="Pending consent requests" value={`${pending.length}`} tone="warning" />
            </IonCol>
            <IonCol size="12" sizeMd="4">
              <StatPill label="Active grants" value="2" tone="success" />
            </IonCol>
            <IonCol size="12" sizeMd="4">
              <StatPill label="Last activity" value="10:33" tone="tertiary" />
            </IonCol>
          </IonRow>
        </IonGrid>

        <IonCard className="gov-card">
          <IonCardContent>
            <h3>Quick actions</h3>
            <IonList>
              <IonItem routerLink="/consents">
                <IonLabel>Grant DWP access</IonLabel>
              </IonItem>
              <IonItem routerLink="/health">
                <IonLabel>Share health evidence</IonLabel>
              </IonItem>
              <IonItem routerLink="/activity">
                <IonLabel>View audit trail</IonLabel>
              </IonItem>
            </IonList>
          </IonCardContent>
        </IonCard>

        <IonCard className="gov-card">
          <IonCardContent>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ marginBottom: 0 }}>Pending consent requests</h3>
              <IonBadge color="warning">{pending.length}</IonBadge>
            </div>
            {pending.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No pending requests right now.</p>
            ) : (
              <IonList>
                {pending.map((request) => (
                  <IonItem key={request.id} routerLink="/consents">
                    <IonLabel>
                      <h4>Share data with {request.grantedTo?.toUpperCase()}</h4>
                      <p>{request.purpose || 'Access requested to help prefill your claim.'}</p>
                    </IonLabel>
                    <IonBadge color="medium">{request.scopes.length} scopes</IonBadge>
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>

        <IonCard className="gov-card">
          <IonCardContent>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ marginBottom: 0 }}>Latest activity</h3>
              <IonButton size="small" fill="clear" routerLink="/activity">
                View all
              </IonButton>
            </div>
            <Timeline items={activity.slice(0, 5)} />
          </IonCardContent>
        </IonCard>

        <IonCard className="gov-card">
          <IonCardContent>
            <h3>Scenario Lab (internal)</h3>
            <p>Publish mock events without leaving the Wallet.</p>
            <IonButton routerLink="/scenario-lab" className="gov-button" expand="block">
              Open Scenario Lab
            </IonButton>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
}
