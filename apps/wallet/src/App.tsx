import { IonApp } from '@ionic/react';
import { BrowserRouter } from 'react-router-dom';
import AppTabs from './components/AppTabs';
import './theme.css';

export default function App() {
  return (
    <IonApp>
      <BrowserRouter>
        <AppTabs />
      </BrowserRouter>
    </IonApp>
  );
}
