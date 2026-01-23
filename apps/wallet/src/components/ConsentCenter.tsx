import { IonCard, IonCardContent } from '@ionic/react';
import type { ReactNode } from 'react';

type ConsentCenterProps = {
  title: string;
  children: ReactNode;
};

export default function ConsentCenter({ title, children }: ConsentCenterProps) {
  return (
    <IonCard className="gov-card">
      <IonCardContent>
        <h3>{title}</h3>
        {children}
      </IonCardContent>
    </IonCard>
  );
}
