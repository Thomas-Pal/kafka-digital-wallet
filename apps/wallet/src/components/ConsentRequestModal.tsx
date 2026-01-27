import { useEffect, useMemo, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import type { ConsentRequest } from '../store/walletStore';

const durationOptions = [
  { label: '1 day', value: 1 },
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '3 months', value: 90 },
];

function formatScope(scope: string) {
  return scope
    .split('.')
    .map((part) => part.replace(/-/g, ' '))
    .join(' · ');
}

export default function ConsentRequestModal({
  isOpen,
  onDismiss,
  request,
  onApprove,
  onDeny,
}: {
  isOpen: boolean;
  onDismiss: () => void;
  request: ConsentRequest | null;
  onApprove: (durationDays: number) => void | Promise<void>;
  onDeny: () => void | Promise<void>;
}) {
  const [duration, setDuration] = useState(7);
  const scopeList = useMemo(() => request?.scopes ?? [], [request]);
  const purpose = request?.purpose;

  useEffect(() => {
    if (request?.durationDays) {
      setDuration(request.durationDays);
    }
  }, [request]);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Consent request</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDismiss}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="wallet-modal">
        {request ? (
          <IonList inset>
            <IonItem lines="none">
              <IonLabel>
                <strong>Requester</strong>
                <p className="wallet-muted">{request.rp.toUpperCase()}</p>
              </IonLabel>
            </IonItem>
            {purpose ? (
              <IonItem lines="none">
                <IonLabel>
                  <strong>Purpose</strong>
                  <p className="wallet-muted">{purpose}</p>
                </IonLabel>
              </IonItem>
            ) : null}
            <IonItem lines="none">
              <IonLabel>
                <strong>Scopes</strong>
                <div className="wallet-scope-list">
                  {scopeList.map((scope) => (
                    <span key={scope} className="wallet-scope-chip">
                      {formatScope(scope)}
                    </span>
                  ))}
                </div>
              </IonLabel>
            </IonItem>
            <IonItem lines="none">
              <IonLabel>
                <strong>Duration</strong>
              </IonLabel>
              <IonSelect
                value={duration}
                interface="popover"
                onIonChange={(event) => setDuration(Number(event.detail.value))}
              >
                {durationOptions.map((option) => (
                  <IonSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
          </IonList>
        ) : null}
        <div className="wallet-modal-actions">
          <IonButton
            expand="block"
            className="wallet-primary-button"
            onClick={() => onApprove(duration)}
            disabled={!request}
          >
            Approve
          </IonButton>
          <IonButton
            expand="block"
            fill="outline"
            color="medium"
            onClick={onDeny}
            disabled={!request}
          >
            Deny
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
}
