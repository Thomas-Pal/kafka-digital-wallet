import React from 'react';
import { createRoot } from 'react-dom/client';
import { setupIonicReact, IonApp } from '@ionic/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional utilities */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

import './theme.css';

setupIonicReact();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <IonApp>
        <App />
      </IonApp>
    </BrowserRouter>
  </React.StrictMode>
);
