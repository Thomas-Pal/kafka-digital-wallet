import { useMemo, useState } from 'react';
import {
  IonButton,
  IonCardContent,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/react';
import { addDays } from 'date-fns';
import PageShell from '../components/PageShell';
import Section from '../components/Section';
import Card from '../components/Card';
import ConsentRequestModal from '../components/ConsentRequestModal';
import EmptyState from '../components/EmptyState';
import { approveConsent } from '../api/client';
import { useWalletStore } from '../store/walletStore';

export default function Dashboard() {
  const credentials = useWalletStore((state) => state.credentials);
  const consents = useWalletStore((state) => state.consents);
  const inbox = useWalletStore((state) => state.inbox);
  const activity = useWalletStore((state) => state.activity);
  const setConsents = useWalletStore((state) => state.setConsents);
  const addActivity = useWalletStore((state) => state.addActivity);
  const removeInbox = useWalletStore((state) => state.removeInbox);

  const [selectedRequest, setSelectedRequest] = useState(
    inbox.length > 0 ? inbox[0] : null
  );

  const activeConsents = useMemo(
    () => consents.filter((item) => item.status === 'granted'),
    [consents]
  );

  const recentActivity = activity.slice(0, 3);

  const handleApprove = async (durationDays: number) => {
    if (!selectedRequest) {
      return;
    }
    let consentId = selectedRequest.id;
    try {
      const response = await approveConsent({
        citizenId: selectedRequest.citizenId,
        grantedTo: selectedRequest.rp,
        scopes: selectedRequest.scopes,
        ttlDays: durationDays,
        pendingId: selectedRequest.id,
      });
      if (response?.consent?.id) {
        consentId = response.consent.id;
      }
    } catch {
      // Orchestration may be offline in demo mode.
    }
    const issuedAt = new Date().toISOString();
    const expiresAt = addDays(new Date(), durationDays).toISOString();
    setConsents((current) => [
      {
        ...selectedRequest,
        id: consentId,
        status: 'granted',
        issuedAt,
        expiresAt,
      },
      ...current,
    ]);
    addActivity({
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      kind: 'grant',
      summary: `Consent granted to ${selectedRequest.rp.toUpperCase()}`,
      details: selectedRequest.scopes.join(', '),
    });
    removeInbox(selectedRequest.id);
    setSelectedRequest(null);
  };

  const handleDeny = async () => {
    if (!selectedRequest) {
      return;
    }
    addActivity({
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      kind: 'revoke',
      summary: `Consent denied for ${selectedRequest.rp.toUpperCase()}`,
      details: selectedRequest.scopes.join(', '),
    });
    removeInbox(selectedRequest.id);
    setSelectedRequest(null);
  };

  return (
    <PageShell
      title="Dashboard"
      subtitle="You control what to share. Requests appear in your inbox."
    >
      {inbox.length > 0 ? (
        <Card className="wallet-inbox">
          <IonCardContent>
            <h3 className="wallet-card-title">Inbox</h3>
            <p className="wallet-muted">
              {inbox.length} consent request{inbox.length === 1 ? '' : 's'} waiting
              for your decision.
            </p>
            <IonButton
              className="wallet-primary-button"
              onClick={() => setSelectedRequest(inbox[0])}
            >
              Review request
            </IonButton>
          </IonCardContent>
        </Card>
      ) : null}

      <Section title="Overview">
        <div className="wallet-grid">
          <Card>
            <IonCardContent>
              <p className="wallet-stat-label">Your credentials</p>
              <p className="wallet-stat-value">{credentials.length}</p>
              <IonButton size="small" fill="clear" routerLink="/credentials">
                View credentials
              </IonButton>
            </IonCardContent>
          </Card>
          <Card>
            <IonCardContent>
              <p className="wallet-stat-label">Active consents</p>
              <p className="wallet-stat-value">{activeConsents.length}</p>
              <IonButton size="small" fill="clear" routerLink="/consents">
                Manage consents
              </IonButton>
            </IonCardContent>
          </Card>
          <Card>
            <IonCardContent>
              <p className="wallet-stat-label">Recent activity</p>
              <p className="wallet-stat-value">{recentActivity.length}</p>
              <IonButton size="small" fill="clear" routerLink="/activity">
                View activity
              </IonButton>
            </IonCardContent>
          </Card>
        </div>
      </Section>

      <Section title="Your credentials">
        <Card>
          <IonCardContent>
            {credentials.length === 0 ? (
              <EmptyState
                title="No credentials yet"
                body="Your verified credentials will show here once issued."
              />
            ) : (
              <IonList lines="none">
                {credentials.slice(0, 3).map((credential) => (
                  <IonItem key={credential.id}>
                    <IonLabel>
                      <strong>{credential.type}</strong>
                      <p className="wallet-muted">{credential.issuer}</p>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            )}
            <IonButton fill="clear" routerLink="/credentials">
              See all credentials
            </IonButton>
          </IonCardContent>
        </Card>
      </Section>

      <Section title="Active consents">
        <Card>
          <IonCardContent>
            {activeConsents.length === 0 ? (
              <EmptyState
                title="No active consents"
                body="When you approve a request, it will appear here."
              />
            ) : (
              <IonList lines="none">
                {activeConsents.slice(0, 3).map((consent) => (
                  <IonItem key={consent.id}>
                    <IonLabel>
                      <strong>{consent.rp.toUpperCase()}</strong>
                      <p className="wallet-muted">{consent.scopes.join(', ')}</p>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            )}
            <IonButton fill="clear" routerLink="/consents">
              View all consents
            </IonButton>
          </IonCardContent>
        </Card>
      </Section>

      <Section title="Recent activity">
        <Card>
          <IonCardContent>
            {recentActivity.length === 0 ? (
              <EmptyState
                title="No activity yet"
                body="Actions like approvals and shares will be logged here."
              />
            ) : (
              <IonList lines="none">
                {recentActivity.map((item) => (
                  <IonItem key={item.id}>
                    <IonLabel>
                      <strong>{item.summary}</strong>
                      <p className="wallet-muted">{item.details}</p>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            )}
            <IonButton fill="clear" routerLink="/activity">
              See full activity
            </IonButton>
          </IonCardContent>
        </Card>
      </Section>

      <ConsentRequestModal
        isOpen={Boolean(selectedRequest)}
        request={selectedRequest}
        onDismiss={() => setSelectedRequest(null)}
        onApprove={handleApprove}
        onDeny={handleDeny}
      />
    </PageShell>
  );
}
