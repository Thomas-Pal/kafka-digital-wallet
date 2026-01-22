import React from 'react';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonRouterOutlet,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { wallet, documents, shieldCheckmark } from 'ionicons/icons';

import HomePage from './pages/HomePage';
import ConsentsPage from './pages/ConsentsPage';
import RequestsPage from './pages/RequestsPage';

export default function App() {
  return (
    <>
      <IonHeader className="header-gov">
        <IonToolbar color="dark">
          <IonTitle>GOV.UK Wallet (Demo)</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonTabs>
          <IonRouterOutlet>
            <Routes>
              <Route path="/" element={<Navigate to="/home" />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/consents" element={<ConsentsPage />} />
              <Route path="/requests" element={<RequestsPage />} />
            </Routes>
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="home" href="/home">
              <IonIcon icon={wallet} />
              <IonLabel>Wallet</IonLabel>
            </IonTabButton>
            <IonTabButton tab="requests" href="/requests">
              <IonIcon icon={documents} />
              <IonLabel>Requests</IonLabel>
            </IonTabButton>
            <IonTabButton tab="consents" href="/consents">
              <IonIcon icon={shieldCheckmark} />
              <IonLabel>Consents</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonContent>
    </>
  );
}
