import { IonCardContent, IonItem, IonLabel, IonList } from '@ionic/react';
import { formatDistanceToNow } from 'date-fns';
import PageShell from '../components/PageShell';
import Section from '../components/Section';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { useWalletStore } from '../store/walletStore';

export default function Activity() {
  const activity = useWalletStore((state) => state.activity);

  return (
    <PageShell title="Activity" subtitle="Audit trail of requests and sharing">
      <Section title="Recent events">
        <Card>
          <IonCardContent>
            {activity.length === 0 ? (
              <EmptyState
                title="No activity yet"
                body="Consent requests, approvals, and shares will appear here."
              />
            ) : (
              <IonList lines="none">
                {activity.map((item) => (
                  <IonItem key={item.id}>
                    <IonLabel>
                      <strong>{item.summary}</strong>
                      <p className="wallet-muted">{item.details}</p>
                      <p className="wallet-caption">
                        {formatDistanceToNow(new Date(item.ts), { addSuffix: true })}
                      </p>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonCardContent>
        </Card>
      </Section>
    </PageShell>
  );
}
