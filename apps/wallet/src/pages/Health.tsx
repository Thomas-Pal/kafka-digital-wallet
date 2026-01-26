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
  IonButton,
  IonModal,
  IonText,
  IonToast,
} from '@ionic/react';
import { useState } from 'react';
import EvidenceCard from '../components/EvidenceCard';
import { useCitizenStore } from '../state/useCitizenStore';
import { grantConsent } from '../services/api';

export default function Health() {
  const prescriptions = useCitizenStore((state) => state.prescriptions);
  const citizen = useCitizenStore((state) => state.citizen);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', color: 'success' as 'success' | 'danger' });
  const [submitting, setSubmitting] = useState(false);

  const handleGrant = async (ttlDays: number) => {
    setSubmitting(true);
    const response = await grantConsent({
      citizenId: citizen.nhsId,
      grantedTo: 'dwp',
      scopes: ['nhs.prescriptions'],
      ttlDays,
      caseId: 'pip-9001',
      purpose: 'DWP requests access to NHS prescriptions to support PIP evidence.',
    });
    setSubmitting(false);
    setShowModal(false);
    setToast({
      open: true,
      message: response.ok ? 'Consent granted for NHS prescriptions.' : response.error || 'Unable to grant consent.',
      color: response.ok ? 'success' : 'danger',
    });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="header-gov">
          <IonTitle>Health</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <EvidenceCard title="NHS Card" subtitle="Conditions, prescriptions, and recent GP activity.">
          <IonList>
            <IonItem>
              <IonLabel>
                <h4>Condition</h4>
                <p>Chronic migraine, sleep disturbance</p>
              </IonLabel>
            </IonItem>
            <IonItem>
              <IonLabel>
                <h4>Recent GP event</h4>
                <p>Neurology review completed on 10 Jan 2026</p>
              </IonLabel>
            </IonItem>
          </IonList>
        </EvidenceCard>

        <IonCard className="gov-card">
          <IonCardContent>
            <h3 className="gov-heading">Prescriptions</h3>
            <IonList>
              {prescriptions.map((rx) => (
                <IonItem key={`${rx.drug}-${rx.prescribedAt}`}>
                  <IonLabel>
                    <h4>{rx.drug}</h4>
                    <p>{rx.dosage} · {rx.frequency} · {rx.repeat ? 'Repeat' : 'One-off'}</p>
                    <p>Last prescribed {rx.prescribedAt}</p>
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          </IonCardContent>
        </IonCard>

        <IonCard className="gov-card">
          <IonCardContent>
            <h3 className="gov-heading">Share health evidence</h3>
            <p className="gov-subtitle">Share your NHS prescriptions with DWP for PIP evidence.</p>
            <IonButton className="gov-button" expand="block" onClick={() => setShowModal(true)}>
              Share health evidence
            </IonButton>
          </IonCardContent>
        </IonCard>

        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar className="header-gov">
              <IonTitle>Share data with DWP</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonText>
              <p>
                DWP needs read-only access to the items below to help prefill your claim. You can revoke at any time.
              </p>
            </IonText>
            <ul>
              <li>NHS prescriptions</li>
            </ul>
            <IonText color="medium">
              <p>What happens next: DWP receives a permitted view only after consent is granted.</p>
            </IonText>
            <IonButton expand="block" disabled={submitting} onClick={() => handleGrant(90)}>
              Allow 3 months
            </IonButton>
            <IonButton expand="block" fill="outline" disabled={submitting} onClick={() => handleGrant(7)}>
              Allow 1 week
            </IonButton>
            <IonButton expand="block" color="medium" fill="clear" onClick={() => setShowModal(false)}>
              Cancel
            </IonButton>
          </IonContent>
        </IonModal>

        <IonToast
          isOpen={toast.open}
          message={toast.message}
          color={toast.color}
          duration={2200}
          onDidDismiss={() => setToast((prev) => ({ ...prev, open: false }))}
        />
      </IonContent>
    </IonPage>
  );
}
