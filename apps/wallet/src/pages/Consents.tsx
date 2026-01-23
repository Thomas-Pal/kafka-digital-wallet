import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
} from '@ionic/react';
import { useEffect, useState } from 'react';
import { listConsents } from '../services/api';
import type { ConsentGrant } from '../types';

export default function Consents() {
  const [rows, setRows] = useState<ConsentGrant[]>([]);

  useEffect(() => {
    const t = setInterval(async () => {
      const data = await listConsents().catch(() => []);
      setRows(Array.isArray(data) ? data : []);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Consents</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Active Consents</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p style={{ marginTop: 0 }}>
              Citizens stay in control with scoped, time-limited permissions.
            </p>
          </IonCardContent>
        </IonCard>
        <IonList>
          {rows.length === 0 && (
            <IonItem>
              <IonLabel>No active consents yet. Approve requests to start sharing.</IonLabel>
            </IonItem>
          )}
          {rows.map((c) => (
            <IonItem key={c.id} lines="full">
              <IonLabel>
                <h2>{c.rp.toUpperCase()} · {c.scopes.join(', ')}</h2>
                <p>
                  Citizen: {c.citizenId} · Case: {c.caseId ?? '—'} · Expires: {new Date(c.expiresAt).toLocaleString()}
                </p>
              </IonLabel>
              <IonBadge color="success">Active</IonBadge>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
}
