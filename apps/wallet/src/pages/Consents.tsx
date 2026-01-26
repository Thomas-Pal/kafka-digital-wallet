import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonItem,
  IonBadge,
  IonButton,
  IonText,
  IonToast,
} from '@ionic/react';
import { useEffect, useMemo, useState } from 'react';
import ConsentCenter from '../components/ConsentCenter';
import { denyConsent, fetchActiveConsents, fetchAudit, fetchPendingConsents, grantConsent, revokeConsent } from '../services/api';

const segmentOptions = ['pending', 'active', 'audit'] as const;

type PendingConsent = {
  id: string;
  grantedTo: string;
  scopes: string[];
  purpose?: string;
  requestedAt: string;
  citizenId: string;
  caseId?: string;
};

type ActiveConsent = {
  id: string;
  grantedTo: string;
  scopes: string[];
  issuedAt: string;
  expiresAt: string;
  ttlDays: number;
  citizenId: string;
  caseId?: string;
};

type AuditEntry = {
  id: string;
  action: string;
  grantedTo: string;
  scopes: string[];
  at: string;
  detail?: string;
};

export default function Consents() {
  const [segment, setSegment] = useState<typeof segmentOptions[number]>('pending');
  const [pending, setPending] = useState<PendingConsent[]>([]);
  const [active, setActive] = useState<ActiveConsent[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [toast, setToast] = useState({ open: false, message: '', color: 'success' as 'success' | 'danger' });

  const load = async () => {
    const [pendingRes, activeRes, auditRes] = await Promise.all([
      fetchPendingConsents(),
      fetchActiveConsents(),
      fetchAudit(),
    ]);
    if (pendingRes.ok) setPending((pendingRes.data as PendingConsent[]) || []);
    if (activeRes.ok) setActive((activeRes.data as ActiveConsent[]) || []);
    if (auditRes.ok) setAudit((auditRes.data as AuditEntry[]) || []);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (request: PendingConsent, ttlDays: number) => {
    const response = await grantConsent({
      requestId: request.id,
      citizenId: request.citizenId,
      grantedTo: request.grantedTo,
      scopes: request.scopes,
      ttlDays,
      caseId: request.caseId,
    });
    setToast({
      open: true,
      message: response.ok ? 'Consent granted.' : response.error || 'Grant failed.',
      color: response.ok ? 'success' : 'danger',
    });
    load();
  };

  const handleDeny = async (request: PendingConsent) => {
    const response = await denyConsent({ requestId: request.id });
    setToast({
      open: true,
      message: response.ok ? 'Request denied.' : response.error || 'Deny failed.',
      color: response.ok ? 'success' : 'danger',
    });
    load();
  };

  const handleRevoke = async (consentId: string) => {
    const response = await revokeConsent({ consentId });
    setToast({
      open: true,
      message: response.ok ? 'Consent revoked.' : response.error || 'Revoke failed.',
      color: response.ok ? 'success' : 'danger',
    });
    load();
  };

  const pendingBody = useMemo(
    () => (
      <ConsentCenter title="Pending requests">
          <IonText color="medium">
            <p>Share data with DWP</p>
            <p>
              DWP needs read-only access to the items below to help prefill your claim. You can revoke at any time.
            </p>
            <p>What happens next: DWP receives a permitted view only after consent is granted.</p>
          </IonText>
          {pending.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No pending requests.</p>
          ) : (
            <IonList>
              {pending.map((request) => (
                <IonItem key={request.id} lines="full">
                  <IonLabel>
                    <h4>{request.grantedTo.toUpperCase()} request</h4>
                    <p>{request.purpose || 'Access requested for claim evidence.'}</p>
                    <p>Scopes: {request.scopes.join(', ')}</p>
                  </IonLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <IonButton size="small" onClick={() => handleApprove(request, 90)}>Allow 3 months</IonButton>
                    <IonButton size="small" fill="outline" onClick={() => handleApprove(request, 30)}>Allow 1 month</IonButton>
                    <IonButton size="small" fill="outline" onClick={() => handleApprove(request, 7)}>Allow 1 week</IonButton>
                    <IonButton size="small" color="medium" fill="clear" onClick={() => handleDeny(request)}>
                      Deny
                    </IonButton>
                  </div>
                </IonItem>
              ))}
            </IonList>
          )}
      </ConsentCenter>
    ),
    [pending]
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="header-gov">
          <IonTitle>Consents</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonSegment value={segment} onIonChange={(e) => setSegment(e.detail.value as typeof segmentOptions[number])}>
          {segmentOptions.map((value) => (
            <IonSegmentButton key={value} value={value}>
              <IonLabel>{value.charAt(0).toUpperCase() + value.slice(1)}</IonLabel>
            </IonSegmentButton>
          ))}
        </IonSegment>

        {segment === 'pending' && pendingBody}

        {segment === 'active' && (
          <ConsentCenter title="Active grants">
            {active.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No active consents yet.</p>
            ) : (
              <IonList>
                {active.map((consent) => (
                  <IonItem key={consent.id}>
                    <IonLabel>
                      <h4>{consent.grantedTo.toUpperCase()}</h4>
                      <p>Scopes: {consent.scopes.join(', ')}</p>
                      <p>Expires {new Date(consent.expiresAt).toLocaleDateString()}</p>
                    </IonLabel>
                    <IonButton size="small" color="danger" onClick={() => handleRevoke(consent.id)}>
                      Revoke
                    </IonButton>
                  </IonItem>
                ))}
              </IonList>
            )}
          </ConsentCenter>
        )}

        {segment === 'audit' && (
          <ConsentCenter title="Audit trail">
            {audit.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No audit events yet.</p>
            ) : (
              <IonList>
                {audit.map((entry) => (
                  <IonItem key={entry.id}>
                    <IonLabel>
                      <h4>{entry.action}</h4>
                      <p>{entry.detail || `${entry.grantedTo.toUpperCase()} accessed ${entry.scopes.join(', ')}`}</p>
                      <p>{new Date(entry.at).toLocaleString()}</p>
                    </IonLabel>
                    <IonBadge color="medium">{entry.grantedTo.toUpperCase()}</IonBadge>
                  </IonItem>
                ))}
              </IonList>
            )}
          </ConsentCenter>
        )}

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
