import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
} from '@ionic/react';
import { issueAdHocGrant } from '../services/api';

export default function Health() {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Health</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>NHS Prescriptions</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            Share 12-month prescription history with DWP for Case 9001 (demo).
            <div style={{ marginTop: 12 }}>
              <IonButton
                onClick={() =>
                  issueAdHocGrant({
                    rp: 'dwp',
                    citizenId: 'nhs-999',
                    caseId: '9001',
                    scopes: ['nhs.prescriptions'],
                    ttlMinutes: 180,
                  })
                }
              >
                Grant to DWP (Case 9001)
              </IonButton>
            </div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
}
