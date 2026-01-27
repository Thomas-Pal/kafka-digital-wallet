import { IonCardContent } from '@ionic/react';
import PageShell from '../components/PageShell';
import Section from '../components/Section';
import Card from '../components/Card';
import { useWalletStore } from '../store/walletStore';

export default function Citizen() {
  const citizen = useWalletStore((state) => state.citizen);

  return (
    <PageShell title="Citizen Profile" subtitle="Verified identity and everyday details">
      <Section title="Identity">
        <Card>
          <IonCardContent className="wallet-grid-two">
            <div>
              <p className="wallet-field-label">Name</p>
              <p className="wallet-field-value">{citizen.name}</p>
            </div>
            <div>
              <p className="wallet-field-label">Date of birth</p>
              <p className="wallet-field-value">{citizen.dob}</p>
            </div>
            <div>
              <p className="wallet-field-label">NI number</p>
              <p className="wallet-field-value">{citizen.niNumber}</p>
            </div>
            <div>
              <p className="wallet-field-label">NHS number</p>
              <p className="wallet-field-value">{citizen.nhsNumber}</p>
            </div>
          </IonCardContent>
        </Card>
      </Section>

      <Section title="Address">
        <Card>
          <IonCardContent>
            <p className="wallet-field-value">{citizen.address}</p>
          </IonCardContent>
        </Card>
      </Section>

      <Section title="Healthcare">
        <Card>
          <IonCardContent>
            <p className="wallet-field-label">GP surgery</p>
            <p className="wallet-field-value">{citizen.gpSurgery}</p>
          </IonCardContent>
        </Card>
      </Section>

      <Section title="Employment & benefits">
        <Card>
          <IonCardContent className="wallet-grid-two">
            <div>
              <p className="wallet-field-label">Employer</p>
              <p className="wallet-field-value">{citizen.employer}</p>
            </div>
            <div>
              <p className="wallet-field-label">Benefit status</p>
              <p className="wallet-field-value">{citizen.benefitStatus}</p>
            </div>
          </IonCardContent>
        </Card>
      </Section>
    </PageShell>
  );
}
