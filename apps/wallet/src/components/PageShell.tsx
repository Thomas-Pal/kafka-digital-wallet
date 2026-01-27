import { ReactNode } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';

export default function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <IonPage>
      <IonHeader className="wallet-header">
        <IonToolbar>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
        {subtitle ? (
          <IonToolbar className="wallet-subheader">
            <IonText className="wallet-subtitle">{subtitle}</IonText>
          </IonToolbar>
        ) : null}
      </IonHeader>
      <IonContent className="wallet-content" fullscreen>
        <div className="wallet-page">{children}</div>
      </IonContent>
    </IonPage>
  );
}
