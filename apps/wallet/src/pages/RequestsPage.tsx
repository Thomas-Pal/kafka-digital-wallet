import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
} from '@ionic/react';
import { ConsentAPI } from '../api';

export default function RequestsPage() {
  const [sending, setSending] = useState(false);
  const citizenId = 'nhs-999';

  async function sendDemoRequests() {
    setSending(true);
    await ConsentAPI.request({
      rp: 'dwp',
      caseId: 'CASE-9001',
      citizenId,
      scopes: ['nhs.prescriptions'],
    });
    await ConsentAPI.request({
      rp: 'dwp',
      caseId: 'TERM-1001',
      citizenId,
      scopes: ['employment.status', 'hmrc.p45.summary'],
    });
    await ConsentAPI.request({
      rp: 'coach',
      caseId: 'TERM-1001',
      citizenId,
      scopes: ['contact.basic'],
    });
    setSending(false);
    alert('Consent requests emitted. Use Home to Grant when ready.');
  }

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Incoming Requests (Demo)</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p className="card-note">
              We emit mock requests so you can approve from the Home tab.
            </p>
            <IonButton
              expand="block"
              color="medium"
              disabled={sending}
              onClick={sendDemoRequests}
            >
              Emit Demo Consent Requests
            </IonButton>
            <IonList>
              <IonItem>
                <IonLabel>DWP requests: NHS Prescriptions (CASE-9001)</IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel>
                  DWP requests: Employment Status + P45 (TERM-1001)
                </IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel>Coach requests: Contact Basic (TERM-1001)</IonLabel>
              </IonItem>
            </IonList>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
}
