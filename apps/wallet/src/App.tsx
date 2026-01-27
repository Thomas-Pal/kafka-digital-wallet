import { IonApp } from '@ionic/react';
import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppTabs from './components/AppTabs';
import './theme.css';

export default function App() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Ignore service worker errors in demo mode.
      });
    }
  }, []);

  return (
    <IonApp>
      <BrowserRouter>
        <AppTabs />
      </BrowserRouter>
    </IonApp>
  );
}
