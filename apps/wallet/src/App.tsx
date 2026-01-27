import { IonApp } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import AppTabs from './components/AppTabs';
import './theme.css';

export default function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <AppTabs />
      </IonReactRouter>
    </IonApp>
  );
}
