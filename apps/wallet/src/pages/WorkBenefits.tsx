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
import { issueAdHocGrant, getDwpCaseView } from '../services/api';
import { useState } from 'react';

export default function WorkBenefits() {
  const [rows, setRows] = useState<any[]>([]);
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Work & Benefits</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Termination of Employment</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            Grant DWP access to employment termination evidence for Case TERM-1001.
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <IonButton
                onClick={() =>
                  issueAdHocGrant({
                    rp: 'dwp',
                    citizenId: 'emp-999',
                    caseId: 'TERM-1001',
                    scopes: ['employment.termination'],
                    ttlMinutes: 180,
                  })
                }
              >
                Grant to DWP (TERM-1001)
              </IonButton>
              <IonButton
                fill="outline"
                onClick={async () => {
                  const v = await getDwpCaseView('TERM-1001');
                  setRows(v || []);
                }}
              >
                Load Case View
              </IonButton>
            </div>
            {rows.length > 0 && (
              <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(rows, null, 2)}
              </pre>
            )}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
}
