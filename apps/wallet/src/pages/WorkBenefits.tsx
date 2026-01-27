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

export default function WorkBenefits() {
  const employment = useCitizenStore((state) => state.employment);
  const citizen = useCitizenStore((state) => state.citizen);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', color: 'success' as 'success' | 'danger' });

  const handleGrant = async (ttlDays: number) => {
    setSubmitting(true);
    const response = await grantConsent({
      citizenId: citizen.nhsId,
      grantedTo: 'dwp',
      scopes: ['employment.termination'],
      ttlDays,
      caseId: 'uc-9001',
    });
    setSubmitting(false);
    setShowModal(false);
    setToast({
      open: true,
      message: response.ok ? 'Consent granted for employment evidence.' : response.error || 'Unable to grant consent.',
      color: response.ok ? 'success' : 'danger',
    });
  };


  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="header-gov">
          <IonTitle>Work & Benefits</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <EvidenceCard title="Employment status" subtitle="Your current employer and work profile.">
          <IonList>
            <IonItem>
              <IonLabel>
                <h4>{employment.employerName}</h4>
                <p>{employment.status}</p>
              </IonLabel>
            </IonItem>
            <IonItem>
              <IonLabel>
                <h4>Salary & hours</h4>
                <p>£{employment.annualSalary.toLocaleString()} · {employment.weeklyHours} hrs</p>
              </IonLabel>
            </IonItem>
          </IonList>
        </EvidenceCard>

        <IonCard className="gov-card">
          <IonCardContent>
            <h3 className="gov-heading">Termination history</h3>
            <IonList>
              {employment.terminationHistory.map((entry) => (
                <IonItem key={`${entry.date}-${entry.reason}`}>
                  <IonLabel>
                    <h4>{entry.reason}</h4>
                    <p>{entry.date}</p>
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          </IonCardContent>
        </IonCard>

        <IonCard className="gov-card">
          <IonCardContent>
            <h3 className="gov-heading">Share employment info with DWP</h3>
            <p className="gov-subtitle">Share termination evidence for Universal Credit (UC).</p>
            <IonButton expand="block" className="gov-button" onClick={() => setShowModal(true)}>
              Share employment info
            </IonButton>
            <IonButton expand="block" fill="clear" routerLink="/scenario-lab">
              Trigger employment termination (demo)
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
              <li>Employment termination</li>
            </ul>
            <IonText color="medium">
              <p>What happens next: DWP receives a permitted view only after consent is granted.</p>
            </IonText>
            <IonButton expand="block" disabled={submitting} onClick={() => handleGrant(90)}>
              Allow 3 months
            </IonButton>
            <IonButton expand="block" fill="outline" disabled={submitting} onClick={() => handleGrant(30)}>
              Allow 1 month
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
