import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonChip,
} from '@ionic/react';
import { getConsents, removeConsent } from '../store';
import { ConsentAPI } from '../api';

export default function ConsentsPage() {
  const [consents, setConsents] = useState(getConsents());

  useEffect(() => {
    const i = setInterval(() => setConsents(getConsents()), 1000);
    return () => clearInterval(i);
  }, []);

  async function revoke(rp: string, caseId: string, citizenId: string) {
    await ConsentAPI.revoke({ rp, caseId, citizenId });
    removeConsent(rp, caseId, citizenId);
    setConsents(getConsents());
  }

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <h2>Active Consents</h2>
        <IonList>
          {consents.length === 0 && (
            <IonItem>
              <IonLabel>No active consents.</IonLabel>
            </IonItem>
          )}
          {consents.map((c) => (
            <IonItem key={`${c.rp}-${c.caseId}-${c.citizenId}`}>
              <IonLabel>
                <div>
                  <strong>{c.rp.toUpperCase()}</strong> — Case{' '}
                  <strong>{c.caseId}</strong>
                </div>
                <div>Citizen: {c.citizenId}</div>
                <div>Scopes: {c.scopes.join(', ')}</div>
                <div className="card-note">
                  Expires: {c.expiresAt || 'unset'}
                </div>
              </IonLabel>
              <IonChip className="badge badge-green">Granted</IonChip>
              <IonButton
                color="danger"
                onClick={() => revoke(c.rp, c.caseId, c.citizenId)}
              >
                Revoke
              </IonButton>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
}
