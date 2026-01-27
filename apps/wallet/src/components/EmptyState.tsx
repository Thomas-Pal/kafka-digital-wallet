import { ReactNode } from 'react';
import { IonText } from '@ionic/react';

export default function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="wallet-empty">
      <IonText className="wallet-empty-title">{title}</IonText>
      <IonText className="wallet-empty-body">{body}</IonText>
      {action ? <div className="wallet-empty-action">{action}</div> : null}
    </div>
  );
}
