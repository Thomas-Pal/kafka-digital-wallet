import { IonCard, IonCardContent, IonChip, IonGrid, IonRow, IonCol, IonText } from '@ionic/react';
import { useCitizenStore } from '../state/useCitizenStore';

export default function CitizenBanner() {
  const citizen = useCitizenStore((state) => state.citizen);

  return (
    <IonCard className="gov-card">
      <IonCardContent>
        <IonText color="primary">
          <h2 className="gov-heading" style={{ margin: '0 0 6px' }}>{citizen.name}</h2>
        </IonText>
        <IonText color="medium">
          <p className="gov-subtitle" style={{ margin: 0 }}>{citizen.address}</p>
        </IonText>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <IonChip color="primary">DOB {citizen.dob}</IonChip>
          <IonChip color="tertiary">NI {citizen.niNumber}</IonChip>
          <IonChip color="success">NHS {citizen.nhsId}</IonChip>
        </div>
        <IonGrid style={{ marginTop: 12 }}>
          <IonRow>
            <IonCol size="12" sizeMd="6">
              <div className="stat-callout">
                You&apos;re in control. Nothing is shared without your consent.
              </div>
            </IonCol>
            <IonCol size="12" sizeMd="6">
              <div className="stat-callout">
                Your data is encrypted in transit. Services see only what you allow.
              </div>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonCardContent>
    </IonCard>
  );
}
