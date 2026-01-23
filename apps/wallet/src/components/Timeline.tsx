import { IonItem, IonLabel, IonBadge, IonList } from '@ionic/react';

type TimelineItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  badge?: string;
};

type TimelineProps = {
  items: TimelineItem[];
};

export default function Timeline({ items }: TimelineProps) {
  return (
    <IonList>
      {items.map((item) => (
        <IonItem key={item.id} lines="full">
          <IonLabel>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <p style={{ fontSize: 12, color: '#6b7280' }}>{item.time}</p>
          </IonLabel>
          {item.badge && <IonBadge color="medium">{item.badge}</IonBadge>}
        </IonItem>
      ))}
    </IonList>
  );
}
