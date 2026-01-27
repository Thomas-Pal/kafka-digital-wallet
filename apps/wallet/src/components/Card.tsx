import { ReactNode } from 'react';
import { IonCard } from '@ionic/react';
import clsx from 'clsx';

export default function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <IonCard className={clsx('wallet-card', className)}>{children}</IonCard>;
}
