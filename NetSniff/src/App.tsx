import { IonApp, IonRouterOutlet, IonHeader, IonToolbar, IonTitle, IonContent, IonPage, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect } from 'react-router-dom';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';

import { PacketProvider } from './context/PacketContext';
import PacketList from './components/PacketList';
import PacketDetailPage from './pages/PacketDetailPage';

setupIonicReact();

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <PacketProvider>
        <IonRouterOutlet>
          <Route exact path="/home">
            <IonPage>
              <IonHeader>
                <IonToolbar>
                  <IonTitle>NetSniff</IonTitle>
                </IonToolbar>
              </IonHeader>
              <IonContent>
                <PacketList />
              </IonContent>
            </IonPage>
          </Route>
          <Route exact path="/packet/:id" component={PacketDetailPage} />
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
        </IonRouterOutlet>
      </PacketProvider>
    </IonReactRouter>
  </IonApp>
);

export default App;
