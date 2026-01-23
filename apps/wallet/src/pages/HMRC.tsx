import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
} from '@ionic/react';
import { useCitizenStore } from '../state/useCitizenStore';

export default function HMRC() {
  const hmrc = useCitizenStore((state) => state.hmrc);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="header-gov">
          <IonTitle>HMRC</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard className="gov-card">
          <IonCardContent>
            <h3>National Insurance</h3>
            <IonList>
              <IonItem>
                <IonLabel>
                  <h4>NI Number</h4>
                  <p>{hmrc.niNumber}</p>
                </IonLabel>
              </IonItem>
            </IonList>
          </IonCardContent>
        </IonCard>

        <IonCard className="gov-card">
          <IonCardContent>
            <h3>P45 / P60</h3>
            <IonList>
              <IonItem>
                <IonLabel>
                  <h4>Latest P45</h4>
                  <p>{hmrc.latestP45}</p>
                </IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel>
                  <h4>Latest P60</h4>
                  <p>{hmrc.latestP60}</p>
                </IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel>
                  <h4>PAYE summary</h4>
                  <p>{hmrc.payeYtd} (YTD)</p>
                </IonLabel>
              </IonItem>
              <IonItem>
                <IonLabel>
                  <h4>Declared income</h4>
                  <p>{hmrc.declaredIncome}</p>
                </IonLabel>
              </IonItem>
            </IonList>
          </IonCardContent>
        </IonCard>

        <IonCard className="gov-card">
          <IonCardContent>
            <h3>HMRC ↔ DWP sharing</h3>
            <IonList>
              <IonItem>
                <IonLabel>Allow HMRC data for UC evidence</IonLabel>
                <IonToggle checked={true} disabled />
              </IonItem>
              <IonItem>
                <IonLabel>Allow HMRC data for audit trail</IonLabel>
                <IonToggle checked={false} disabled />
              </IonItem>
            </IonList>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
}
