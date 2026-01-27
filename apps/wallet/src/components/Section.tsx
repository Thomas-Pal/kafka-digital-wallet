import { ReactNode } from 'react';
import { IonText } from '@ionic/react';

export default function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="wallet-section">
      <IonText className="wallet-section-title">{title}</IonText>
      <div className="wallet-section-body">{children}</div>
    </section>
  );
}
