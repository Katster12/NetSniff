import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonGrid,
  IonRow,
  IonCol,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonCardContent,
  IonIcon
} from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { usePackets } from '../context/PacketContext';
import './PacketDetailPage.css';

const PacketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { packets } = usePackets();
  const history = useHistory();
  const [selectedSegment, setSelectedSegment] = useState('info');

  const packet = packets.find(p => p.id === id);

  if (!packet) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Packet Not Found</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <p>Packet with ID {id} not found.</p>
          <IonButton onClick={() => history.goBack()}>Back to Home</IonButton>
        </IonContent>
      </IonPage>
    );
  }

  const handleSegmentChange = (event: any) => {
    setSelectedSegment(event.detail.value);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButton slot="start" onClick={() => history.goBack()}>
            <IonIcon icon="arrow-back" />
          </IonButton>
          <IonTitle>Packet Details</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonSegment value={selectedSegment} onIonChange={handleSegmentChange}>
          <IonSegmentButton value="info">
            <IonLabel>Packet Info</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="data">
            <IonLabel>Data</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        {selectedSegment === 'info' && (
          <IonCard>
            <IonCardContent>
              <IonGrid>
                <IonRow>
                  <IonCol size="4"><strong>Timestamp:</strong></IonCol>
                  <IonCol size="8">{new Date(packet.timestamp).toLocaleString()}</IonCol>
                </IonRow>
                <IonRow>
                  <IonCol size="4"><strong>Source:</strong></IonCol>
                  <IonCol size="8">{packet.source}</IonCol>
                </IonRow>
                <IonRow>
                  <IonCol size="4"><strong>Destination:</strong></IonCol>
                  <IonCol size="8">{packet.destination}</IonCol>
                </IonRow>
                <IonRow>
                  <IonCol size="4"><strong>Protocol:</strong></IonCol>
                  <IonCol size="8">{packet.protocol}</IonCol>
                </IonRow>
                <IonRow>
                  <IonCol size="4"><strong>Direction:</strong></IonCol>
                  <IonCol size="8">{packet.direction}</IonCol>
                </IonRow>
                <IonRow>
                  <IonCol size="4"><strong>Size:</strong></IonCol>
                  <IonCol size="8">{packet.size} bytes</IonCol>
                </IonRow>
              </IonGrid>
            </IonCardContent>
          </IonCard>
        )}

        {selectedSegment === 'data' && (
          <IonCard>
            <IonCardContent>
              <pre className="packet-data">{packet.payload}</pre>
            </IonCardContent>
          </IonCard>
        )}
      </IonContent>
    </IonPage>
  );
};

export default PacketDetailPage;