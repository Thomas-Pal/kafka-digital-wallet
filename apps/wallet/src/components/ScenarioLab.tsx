import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonItem,
  IonInput,
  IonLabel,
  IonButton,
  IonToast,
  IonText,
} from '@ionic/react';
import { useMemo, useState } from 'react';
import { useCitizenStore } from '../state/useCitizenStore';
import { triggerEmploymentTermination, triggerPrescription } from '../services/api';

export default function ScenarioLab() {
  const citizen = useCitizenStore((state) => state.citizen);
  const employment = useCitizenStore((state) => state.employment);
  const prescriptions = useCitizenStore((state) => state.prescriptions);
  const initialPrescription = prescriptions[0];

  const [employmentPayload, setEmploymentPayload] = useState({
    citizenId: citizen.nhsId,
    niNumber: citizen.niNumber,
    employerId: employment.employerId,
    employerName: employment.employerName,
    terminationDate: new Date().toISOString(),
    reasonCode: 'redundancy',
    weeklyHours: employment.weeklyHours,
    annualSalary: employment.annualSalary,
    noticePaid: true,
    metadata: { source: 'employer', contact: 'hr@nrl.co.uk' },
  });

  const [prescriptionPayload, setPrescriptionPayload] = useState({
    citizenId: citizen.nhsId,
    drug: initialPrescription?.drug || 'Sumatriptan',
    dosage: initialPrescription?.dosage || '50mg',
    frequency: initialPrescription?.frequency || 'PRN',
    repeat: initialPrescription?.repeat ?? true,
    gpOdsCode: 'A12345',
    condition: initialPrescription?.condition || 'Chronic migraine',
    prescribedAt: new Date().toISOString(),
  });

  const [isPublishingTermination, setIsPublishingTermination] = useState(false);
  const [isPublishingPrescription, setIsPublishingPrescription] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', color: 'success' as 'success' | 'danger' });

  const handleTermination = async () => {
    if (isPublishingTermination) return;
    setIsPublishingTermination(true);
    const response = await triggerEmploymentTermination(employmentPayload);
    setIsPublishingTermination(false);
    setToast({
      open: true,
      message: response.ok ? 'Employment termination event published.' : response.error || 'Publish failed.',
      color: response.ok ? 'success' : 'danger',
    });
  };

  const handlePrescription = async () => {
    if (isPublishingPrescription) return;
    setIsPublishingPrescription(true);
    const response = await triggerPrescription(prescriptionPayload);
    setIsPublishingPrescription(false);
    setToast({
      open: true,
      message: response.ok ? 'Prescription event published.' : response.error || 'Publish failed.',
      color: response.ok ? 'success' : 'danger',
    });
  };

  const employmentPreview = useMemo(() => JSON.stringify(employmentPayload, null, 2), [employmentPayload]);
  const prescriptionPreview = useMemo(() => JSON.stringify(prescriptionPayload, null, 2), [prescriptionPayload]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="header-gov">
          <IonTitle>Scenario Lab (internal)</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonText color="medium">
          <p>Use these controls to publish mock real-world events. Buttons are idempotent and disable while publishing.</p>
        </IonText>

        <IonCard className="gov-card">
          <IonCardContent>
            <IonText color="primary">
              <h3>Publish Employment Termination</h3>
            </IonText>
            <IonItem>
              <IonLabel position="stacked">Reason code</IonLabel>
              <IonInput
                value={employmentPayload.reasonCode}
                onIonChange={(e) => setEmploymentPayload((prev) => ({ ...prev, reasonCode: e.detail.value || '' }))}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Termination date</IonLabel>
              <IonInput
                value={employmentPayload.terminationDate}
                onIonChange={(e) => setEmploymentPayload((prev) => ({ ...prev, terminationDate: e.detail.value || '' }))}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Annual salary</IonLabel>
              <IonInput
                type="number"
                value={employmentPayload.annualSalary}
                onIonChange={(e) =>
                  setEmploymentPayload((prev) => ({ ...prev, annualSalary: Number(e.detail.value) }))
                }
              />
            </IonItem>
            <IonButton
              expand="block"
              className="gov-button"
              disabled={isPublishingTermination}
              onClick={handleTermination}
            >
              {isPublishingTermination ? 'Publishing…' : 'Publish Employment Termination'}
            </IonButton>
            <details style={{ marginTop: 12 }}>
              <summary>Payload preview</summary>
              <pre style={{ background: '#f3f4f6', padding: 12, borderRadius: 8 }}>{employmentPreview}</pre>
            </details>
          </IonCardContent>
        </IonCard>

        <IonCard className="gov-card">
          <IonCardContent>
            <IonText color="primary">
              <h3>Publish Prescription Issued/Changed</h3>
            </IonText>
            <IonItem>
              <IonLabel position="stacked">Drug</IonLabel>
              <IonInput
                value={prescriptionPayload.drug}
                onIonChange={(e) => setPrescriptionPayload((prev) => ({ ...prev, drug: e.detail.value || '' }))}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Dosage</IonLabel>
              <IonInput
                value={prescriptionPayload.dosage}
                onIonChange={(e) => setPrescriptionPayload((prev) => ({ ...prev, dosage: e.detail.value || '' }))}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Condition</IonLabel>
              <IonInput
                value={prescriptionPayload.condition}
                onIonChange={(e) => setPrescriptionPayload((prev) => ({ ...prev, condition: e.detail.value || '' }))}
              />
            </IonItem>
            <IonButton
              expand="block"
              className="gov-button"
              disabled={isPublishingPrescription}
              onClick={handlePrescription}
            >
              {isPublishingPrescription ? 'Publishing…' : 'Publish Prescription Event'}
            </IonButton>
            <details style={{ marginTop: 12 }}>
              <summary>Payload preview</summary>
              <pre style={{ background: '#f3f4f6', padding: 12, borderRadius: 8 }}>{prescriptionPreview}</pre>
            </details>
          </IonCardContent>
        </IonCard>

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
