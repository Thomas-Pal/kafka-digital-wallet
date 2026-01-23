import {
  IonApp,
  IonTabs,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/react';
import { BrowserRouter } from 'react-router-dom';
import {
  home,
  heart,
  briefcase,
  calculator,
  shieldCheckmark,
  time,
} from 'ionicons/icons';
import AppRoutes from './app.routes';

export default function App() {
  return (
    <IonApp>
      <BrowserRouter>
        <IonTabs>
          <IonRouterOutlet>
            <AppRoutes />
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="dashboard" href="/dashboard">
              <IonIcon icon={home} />
              <IonLabel>Dashboard</IonLabel>
            </IonTabButton>
            <IonTabButton tab="health" href="/health">
              <IonIcon icon={heart} />
              <IonLabel>Health</IonLabel>
            </IonTabButton>
            <IonTabButton tab="work" href="/work">
              <IonIcon icon={briefcase} />
              <IonLabel>Work & Benefits</IonLabel>
            </IonTabButton>
            <IonTabButton tab="hmrc" href="/hmrc">
              <IonIcon icon={calculator} />
              <IonLabel>HMRC</IonLabel>
            </IonTabButton>
            <IonTabButton tab="consents" href="/consents">
              <IonIcon icon={shieldCheckmark} />
              <IonLabel>Consents</IonLabel>
            </IonTabButton>
            <IonTabButton tab="activity" href="/activity">
              <IonIcon icon={time} />
              <IonLabel>Activity</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </BrowserRouter>
    </IonApp>
  );
}
