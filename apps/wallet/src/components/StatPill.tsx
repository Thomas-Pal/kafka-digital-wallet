import { IonCard, IonCardContent, IonText } from '@ionic/react';

type StatPillProps = {
  label: string;
  value: string;
  tone?: 'primary' | 'success' | 'warning' | 'tertiary';
};

export default function StatPill({ label, value, tone = 'primary' }: StatPillProps) {
  return (
    <IonCard className={`stat-pill ${tone}`}>
      <IonCardContent>
        <IonText color="medium">
          <p style={{ margin: 0 }}>{label}</p>
        </IonText>
        <IonText color="dark">
          <h3 style={{ margin: '6px 0 0' }}>{value}</h3>
        </IonText>
      </IonCardContent>
    </IonCard>
  );
}
