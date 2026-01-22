import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonButton,
  IonSkeletonText,
} from '@ionic/react';
import { useEffect, useState } from 'react';
import { listRequests, approveRequest } from '../services/api';
import type { ConsentRequest } from '../types';

export default function Requests() {
  const [loading, setLoading] = useState(true);
  const [recs, setRecs] = useState<ConsentRequest[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setRecs(await listRequests());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grouped = recs.reduce<Record<string, ConsentRequest[]>>((acc, r) => {
    const key = r.scopes.includes('share:nhs:prescriptions')
      ? 'Health'
      : r.scopes.includes('share:dwp:uc')
        ? 'Work & Benefits'
        : 'Other';
    (acc[key] ||= []).push(r);
    return acc;
  }, {});

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Requests</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {loading ? (
          <IonList>
            {[...Array(4)].map((_, i) => (
              <IonItem key={i}>
                <IonSkeletonText animated style={{ width: '80%' }} />
              </IonItem>
            ))}
          </IonList>
        ) : (
          Object.entries(grouped).map(([group, items]) => (
            <div key={group} style={{ margin: '12px 0' }}>
              <IonToolbar>
                <IonTitle size="small">
                  {group} <IonBadge color="medium">{items.length}</IonBadge>
                </IonTitle>
              </IonToolbar>
              <IonList>
                {items.map((r) => (
                  <IonItem key={r.id} lines="full">
                    <IonLabel>
                      <h2>{r.rp.toUpperCase()} requests: {r.scopes.join(', ')}</h2>
                      <p>
                        Citizen: {r.citizenId} • Case: {r.caseId ?? '—'} •{' '}
                        {new Date(r.issuedAt).toLocaleString()}
                      </p>
                    </IonLabel>
                    <IonButton
                      onClick={async () => {
                        await approveRequest(r.id, 180);
                        setRecs(recs.filter((x) => x.id !== r.id));
                      }}
                    >
                      Approve
                    </IonButton>
                  </IonItem>
                ))}
              </IonList>
            </div>
          ))
        )}
      </IonContent>
    </IonPage>
  );
}
