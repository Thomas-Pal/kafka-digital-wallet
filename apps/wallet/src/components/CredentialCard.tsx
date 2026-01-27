import {
  IonBadge,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
} from '@ionic/react';

export default function CredentialCard({
  type,
  issuer,
  issuedAt,
  claims,
}: {
  type: string;
  issuer: string;
  issuedAt: string;
  claims: Record<string, string>;
}) {
  return (
    <IonCard className="wallet-card">
      <IonCardHeader>
        <IonCardTitle>{type}</IonCardTitle>
        <IonCardSubtitle>
          {issuer} • <IonBadge color="medium">VC</IonBadge>
        </IonCardSubtitle>
      </IonCardHeader>
      <IonCardContent className="wallet-credential-body">
        {Object.entries(claims).map(([key, value]) => (
          <div key={key}>
            <strong>{key}:</strong> {value}
          </div>
        ))}
        <div className="wallet-caption">
          Issued {new Date(issuedAt).toLocaleDateString()}
        </div>
      </IonCardContent>
    </IonCard>
  );
}
