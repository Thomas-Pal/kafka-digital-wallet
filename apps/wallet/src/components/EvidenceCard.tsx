import { IonCard, IonCardContent, IonText } from '@ionic/react';
import type { ReactNode } from 'react';

type EvidenceCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function EvidenceCard({ title, subtitle, children }: EvidenceCardProps) {
  return (
    <IonCard className="gov-card">
      <IonCardContent>
        <IonText color="primary">
          <h3 style={{ marginTop: 0 }}>{title}</h3>
        </IonText>
        {subtitle && (
          <IonText color="medium">
            <p style={{ marginTop: 4 }}>{subtitle}</p>
          </IonText>
        )}
        <div style={{ marginTop: 12 }}>{children}</div>
      </IonCardContent>
    </IonCard>
  );
}
