import { IonButton, IonCardContent } from '@ionic/react';
import PageShell from '../components/PageShell';
import Section from '../components/Section';
import Card from '../components/Card';
import { scenarioPublish } from '../api/client';
import { useWalletStore } from '../store/walletStore';

export default function ScenariosLab() {
  const addActivity = useWalletStore((state) => state.addActivity);

  const publishPrescription = async () => {
    try {
      await scenarioPublish('nhs.prescriptions', {
        citizenId: 'nhs-999',
      });
    } catch {
      // Orchestration may be offline in demo mode.
    }
    addActivity({
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      kind: 'publish',
      summary: 'Prescription issued',
      details: 'Sumatriptan 50mg published to orchestration',
    });
  };

  const publishTermination = async () => {
    try {
      await scenarioPublish('employment.termination', {
        citizenId: 'nhs-999',
      });
    } catch {
      // Orchestration may be offline in demo mode.
    }
    addActivity({
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      kind: 'publish',
      summary: 'Employment termination published',
      details: 'Termination event sent to orchestration',
    });
  };

  return (
    <PageShell title="Scenarios Lab" subtitle="Trigger demo events without altering the wallet UI">
      <Section title="NHS prescription issued">
        <Card>
          <IonCardContent>
            <p className="wallet-muted">
              Publish a prescription update for Joe to the orchestration service.
            </p>
            <IonButton className="wallet-primary-button" onClick={publishPrescription}>
              Publish for Joe
            </IonButton>
          </IonCardContent>
        </Card>
      </Section>

      <Section title="Employment termination">
        <Card>
          <IonCardContent>
            <p className="wallet-muted">
              Send a termination event for Northern Logistics Ltd.
            </p>
            <IonButton className="wallet-primary-button" onClick={publishTermination}>
              Publish termination
            </IonButton>
          </IonCardContent>
        </Card>
      </Section>

    </PageShell>
  );
}
