import {
  IonApp,
  IonTabs,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  heart,
  briefcase,
  calculator,
  mailUnread,
  shieldCheckmark,
  time,
} from 'ionicons/icons';
import Health from './pages/Health';
import WorkBenefits from './pages/WorkBenefits';
import HMRC from './pages/HMRC';
import Requests from './pages/Requests';
import Consents from './pages/Consents';
import Activity from './pages/Activity';
import Scenarios from './pages/Scenarios';

export default function App() {
  return (
    <IonApp>
      <BrowserRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Routes>
              <Route path="/" element={<Navigate to="/health" replace />} />
              <Route path="/health" element={<Health />} />
              <Route path="/work" element={<WorkBenefits />} />
              <Route path="/hmrc" element={<HMRC />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/consents" element={<Consents />} />
              <Route path="/activity" element={<Activity />} />
              <Route path="/scenarios" element={<Scenarios />} />
            </Routes>
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="health" href="/health">
              <IonIcon icon={heart} />
              <IonLabel>Health</IonLabel>
            </IonTabButton>
            <IonTabButton tab="work" href="/work">
              <IonIcon icon={briefcase} />
              <IonLabel>Work</IonLabel>
            </IonTabButton>
            <IonTabButton tab="hmrc" href="/hmrc">
              <IonIcon icon={calculator} />
              <IonLabel>HMRC</IonLabel>
            </IonTabButton>
            <IonTabButton tab="requests" href="/requests">
              <IonIcon icon={mailUnread} />
              <IonLabel>Requests</IonLabel>
            </IonTabButton>
            <IonTabButton tab="scenarios" href="/scenarios">
              <IonIcon icon={mailUnread} />
              <IonLabel>Scenarios</IonLabel>
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
