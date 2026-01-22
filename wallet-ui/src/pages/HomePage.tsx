import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import { ConsentAPI } from '../api';
import { addConsent } from '../store';

export default function HomePage() {
  const [busy, setBusy] = useState(false);
  const citizenId = 'nhs-999';

  async function grantNhsDwp() {
    setBusy(true);
    const body = {
      rp: 'dwp',
      caseId: 'CASE-9001',
      citizenId,
      scopes: ['nhs.prescriptions'],
      ttlDays: 90,
    };
    const { evt } = await ConsentAPI.grant(body);
    addConsent({
      rp: body.rp,
      caseId: body.caseId,
      citizenId,
      scopes: body.scopes,
      expiresAt: evt.expiresAt,
    });
    setBusy(false);
    alert('Granted: NHS → DWP (prescriptions)');
  }

  async function grantTerminationDwpCoach() {
    setBusy(true);
    const dwp = {
      rp: 'dwp',
      caseId: 'TERM-1001',
      citizenId,
      scopes: ['employment.status', 'hmrc.p45.summary'],
      ttlDays: 90,
    };
    const coach = {
      rp: 'coach',
      caseId: 'TERM-1001',
      citizenId,
      scopes: ['contact.basic'],
      ttlDays: 30,
    };
    const r1 = await ConsentAPI.grant(dwp);
    const r2 = await ConsentAPI.grant(coach);
    addConsent({
      rp: dwp.rp,
      caseId: dwp.caseId,
      citizenId,
      scopes: dwp.scopes,
      expiresAt: r1.evt.expiresAt,
    });
    addConsent({
      rp: coach.rp,
      caseId: coach.caseId,
      citizenId,
      scopes: coach.scopes,
      expiresAt: r2.evt.expiresAt,
    });
    setBusy(false);
    alert('Granted: Termination → DWP + Coach');
  }

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Quick Actions</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonGrid>
              <IonRow>
                <IonCol size="12">
                  <IonButton
                    expand="block"
                    color="primary"
                    disabled={busy}
                    onClick={grantNhsDwp}
                  >
                    Grant NHS → DWP (CASE-9001)
                  </IonButton>
                </IonCol>
                <IonCol size="12">
                  <IonButton
                    expand="block"
                    color="success"
                    disabled={busy}
                    onClick={grantTerminationDwpCoach}
                  >
                    Grant Termination → DWP + Life Coach (TERM-1001)
                  </IonButton>
                </IonCol>
              </IonRow>
            </IonGrid>
            <p className="card-note">
              In production: OIDC, JWT-bound tokens, and scoped selective
              disclosure. This demo shows the user flow and consent events only.
            </p>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>About</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList>
              <IonItem>
                <IonLabel>
                  GOV.UK One Login style, consent-first wallet. Data flows via
                  Kafka, filtered by Gatekeeper.
                </IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel>
                  Citizen: <strong>nhs-999</strong>
                </IonLabel>
              </IonItem>
            </IonList>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
}
