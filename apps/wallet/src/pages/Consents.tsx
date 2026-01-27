import { useMemo, useState } from 'react';
import {
  IonAccordion,
  IonAccordionGroup,
  IonButton,
  IonCardContent,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/react';
import { addDays, format } from 'date-fns';
import PageShell from '../components/PageShell';
import Section from '../components/Section';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import ConsentRequestModal from '../components/ConsentRequestModal';
import { approveConsent, revokeConsent } from '../api/client';
import { useWalletStore } from '../store/walletStore';

export default function Consents() {
  const consents = useWalletStore((state) => state.consents);
  const inbox = useWalletStore((state) => state.inbox);
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
  const historyConsents = useMemo(
    () => consents.filter((item) => item.status !== 'granted'),
    [consents]
  );

  const handleApprove = async (durationDays: number) => {
    if (!selectedRequest) {
      return;
    }
    try {
      await approveConsent(selectedRequest.id, durationDays);
    } catch {
      // Orchestration may be offline in demo mode.
    }
    const issuedAt = new Date().toISOString();
    const expiresAt = addDays(new Date(), durationDays).toISOString();
    setConsents((current) => [
      {
        ...selectedRequest,
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

  const handleRevoke = async (id: string) => {
    try {
      await revokeConsent(id);
    } catch {
      // Orchestration may be offline in demo mode.
    }
    setConsents((current) =>
      current.map((consent) =>
        consent.id === id ? { ...consent, status: 'revoked' } : consent
      )
    );
    addActivity({
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      kind: 'revoke',
      summary: 'Consent revoked',
      details: `Consent ${id} revoked by citizen`,
    });
  };

  return (
    <PageShell title="Consents" subtitle="Manage who can access your data">
      <Section title="Inbox">
        <Card>
          <IonCardContent>
            {inbox.length === 0 ? (
              <EmptyState
                title="No new requests"
                body="When an organisation requests data, it will appear here."
              />
            ) : (
              <IonList lines="none">
                {inbox.map((item) => (
                  <IonItem key={item.id}>
                    <IonLabel>
                      <strong>{item.rp.toUpperCase()}</strong>
                      <p className="wallet-muted">{item.scopes.join(', ')}</p>
                    </IonLabel>
                    <IonButton
                      fill="outline"
                      size="small"
                      onClick={() => setSelectedRequest(item)}
                    >
                      Review
                    </IonButton>
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonCardContent>
        </Card>
      </Section>

      <Section title="Active consents">
        <Card>
          <IonCardContent>
            {activeConsents.length === 0 ? (
              <EmptyState
                title="No active consents"
                body="Approvals will show here with their expiry date."
              />
            ) : (
              <IonList lines="none">
                {activeConsents.map((consent) => (
                  <IonItem key={consent.id}>
                    <IonLabel>
                      <strong>{consent.rp.toUpperCase()}</strong>
                      <p className="wallet-muted">{consent.scopes.join(', ')}</p>
                      {consent.expiresAt ? (
                        <p className="wallet-caption">
                          Expires {format(new Date(consent.expiresAt), 'dd MMM yyyy')}
                        </p>
                      ) : null}
                    </IonLabel>
                    <IonButton
                      fill="outline"
                      size="small"
                      onClick={() => handleRevoke(consent.id)}
                    >
                      Revoke
                    </IonButton>
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonCardContent>
        </Card>
      </Section>

      <Section title="History">
        <Card>
          <IonCardContent>
            <IonAccordionGroup>
              <IonAccordion value="history">
                <IonItem slot="header">
                  <IonLabel>View revoked & expired</IonLabel>
                </IonItem>
                <div className="wallet-accordion" slot="content">
                  {historyConsents.length === 0 ? (
                    <EmptyState
                      title="No history yet"
                      body="Revoked or expired consents will be listed here."
                    />
                  ) : (
                    <IonList lines="none">
                      {historyConsents.map((consent) => (
                        <IonItem key={consent.id}>
                          <IonLabel>
                            <strong>{consent.rp.toUpperCase()}</strong>
                            <p className="wallet-muted">{consent.scopes.join(', ')}</p>
                            <p className="wallet-caption">Status: {consent.status}</p>
                          </IonLabel>
                        </IonItem>
                      ))}
                    </IonList>
                  )}
                </div>
              </IonAccordion>
            </IonAccordionGroup>
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
