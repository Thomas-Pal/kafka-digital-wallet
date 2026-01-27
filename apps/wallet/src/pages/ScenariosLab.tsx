import { IonButton, IonCardContent } from '@ionic/react';
import PageShell from '../components/PageShell';
import Section from '../components/Section';
import Card from '../components/Card';
import { requestConsent, scenarioPublish } from '../api/client';
import { useWalletStore } from '../store/walletStore';

export default function ScenariosLab() {
  const addActivity = useWalletStore((state) => state.addActivity);
  const pushInbox = useWalletStore((state) => state.pushInbox);

  const publishPrescription = async () => {
    try {
      await scenarioPublish('nhs.prescriptions', {
        citizenId: 'nhs-999',
        drug: 'Sumatriptan 50mg',
        dosage: '50mg',
        frequency: 'Twice daily',
        repeat: false,
        gpOdsCode: 'B83001',
        condition: 'Migraine',
        prescribedAt: new Date().toISOString(),
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
        niNumber: 'QQ 12 34 56 C',
        employerId: 'nl-001',
        employerName: 'Northern Logistics Ltd',
        terminationDate: new Date().toISOString(),
        reasonCode: 'REDUNDANCY',
        weeklyHours: 37.5,
        annualSalary: 32000,
        noticePaid: true,
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

  const requestConsentFromRp = async (rp: string, scopes: string[]) => {
    let request = {
      id: crypto.randomUUID(),
      rp,
      scopes,
      citizenId: 'nhs-999',
    };
    try {
      const response = await requestConsent({
        citizenId: request.citizenId,
        rp: request.rp,
        scopes: request.scopes,
      });
      if (response?.request?.id) {
        request = response.request;
      }
    } catch {
      // Orchestration may be offline in demo mode.
    }
    pushInbox(request);
    addActivity({
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      kind: 'request',
      summary: `Consent requested by ${rp.toUpperCase()}`,
      details: scopes.join(', '),
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

      <Section title="Request consent (relying party)">
        <Card>
          <IonCardContent className="wallet-stack">
            <div>
              <p className="wallet-muted">DWP requests prescription access.</p>
              <IonButton
                fill="outline"
                onClick={() => requestConsentFromRp('dwp', ['nhs.prescriptions'])}
              >
                Request from DWP
              </IonButton>
            </div>
            <div>
              <p className="wallet-muted">HMRC requests employment updates.</p>
              <IonButton
                fill="outline"
                onClick={() => requestConsentFromRp('hmrc', ['employment.termination'])}
              >
                Request from HMRC
              </IonButton>
            </div>
            <div>
              <p className="wallet-muted">DWP requests employment updates.</p>
              <IonButton
                fill="outline"
                onClick={() => requestConsentFromRp('dwp', ['employment.termination'])}
              >
                Request from DWP (employment)
              </IonButton>
            </div>
          </IonCardContent>
        </Card>
      </Section>
    </PageShell>
  );
}
