import React, { useState } from 'react';
import {
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
  IonChip,
  IonIcon,
  IonButton,
  IonGrid,
  IonRow,
  IonCol,
  IonSpinner,
  IonAlert,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonText
} from '@ionic/react';
import { arrowUp, arrowDown, time, analytics, close } from 'ionicons/icons';
import { usePackets } from '../context/PacketContext';
import { formatDistanceToNow } from 'date-fns';

const PacketList: React.FC = () => {
  const { 
    packets, 
    stats, 
    isCapturing, 
    isConnecting,
    hasVpnPermission,
    error,
    requestVpnPermission,
    startCapture, 
    stopCapture, 
    clearPackets 
  } = usePackets();
  const [selectedPacket, setSelectedPacket] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const getSelectedPacketData = () => {
    return packets.find(packet => packet.id === selectedPacket);
  };

  const handleCaptureToggle = async () => {
    try {
      if (isCapturing) {
        await stopCapture();
      } else {
        await startCapture();
      }
    } catch (error) {
      console.error('Failed to toggle capture:', error);
    }
  };

  const handleRequestPermission = async () => {
    try {
      await requestVpnPermission();
    } catch (error) {
      console.error('Failed to request VPN permission:', error);
    }
  };

  const getProtocolColor = (protocol: string) => {
    switch (protocol.toUpperCase()) {
      case 'TCP': return 'primary';
      case 'UDP': return 'secondary';
      case 'ICMP': return 'warning';
      case 'HTTP': return 'success';
      case 'DNS': return 'tertiary';
      default: return 'medium';
    }
  };

  const openPacketDetails = (packetId: string) => {
    setSelectedPacket(packetId);
    setIsModalOpen(true);
  };

  const closePacketDetails = () => {
    setIsModalOpen(false);
    // We can optionally clear selectedPacket when modal is closed
    // or keep it to remember the last selected packet
  };

  return (
    <IonContent>
      {error && (
        <IonAlert
          isOpen={!!error}
          onDidDismiss={() => clearPackets()}
          header="Error"
          message={error}
          buttons={['OK']}
        />
      )}

      <IonCard>
        <IonCardHeader>
          <IonCardSubtitle>Network Statistics</IonCardSubtitle>
        </IonCardHeader>
        <IonCardContent>
          <IonGrid>
            <IonRow>
              <IonCol>
                <IonChip>
                  <IonIcon icon={analytics} />
                  <IonLabel>Total: {stats.totalPackets}</IonLabel>
                </IonChip>
              </IonCol>
              <IonCol>
                <IonChip color="success">
                  <IonIcon icon={arrowDown} />
                  <IonLabel>In: {stats.incomingPackets}</IonLabel>
                </IonChip>
              </IonCol>
              <IonCol>
                <IonChip color="primary">
                  <IonIcon icon={arrowUp} />
                  <IonLabel>Out: {stats.outgoingPackets}</IonLabel>
                </IonChip>
              </IonCol>
            </IonRow>
            <IonRow>
              <IonCol>
                {!hasVpnPermission ? (
                  <IonButton
                    expand="block"
                    color="primary"
                    onClick={handleRequestPermission}
                    disabled={isConnecting}
                    style={{ minHeight: '46px' }}
                    className="permission-button"
                  >
                    {isConnecting ? (
                      <>
                        <IonSpinner name="dots" />
                        <span style={{ marginLeft: '8px' }}>Requesting...</span>
                      </>
                    ) : (
                      <span style={{ fontWeight: 'bold' }}>Request VPN Permission</span>
                    )}
                  </IonButton>
                ) : (
                  <IonButton
                    expand="block"
                    color={isCapturing ? 'danger' : 'success'}
                    onClick={handleCaptureToggle}
                    disabled={isConnecting}
                    style={{ minHeight: '46px' }}
                    className="capture-button"
                  >
                    {isConnecting ? (
                      <>
                        <IonSpinner name="dots" />
                        <span style={{ marginLeft: '8px' }}>
                          {isCapturing ? 'Stopping...' : 'Starting...'}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontWeight: 'bold' }}>
                        {isCapturing ? 'Stop Capture' : 'Start Capture'}
                      </span>
                    )}
                  </IonButton>
                )}
              </IonCol>
              <IonCol>
                <IonButton
                  expand="block"
                  color="medium"
                  onClick={clearPackets}
                  disabled={isConnecting || isCapturing}
                  style={{ minHeight: '46px' }}
                  className="clear-button"
                >
                  <span style={{ fontWeight: 'bold' }}>Clear</span>
                </IonButton>
              </IonCol>
            </IonRow>
          </IonGrid>
        </IonCardContent>
      </IonCard>

      <IonList>
        {packets.map((packet) => (
          <IonItem
            key={packet.id}
            button
            onClick={() => openPacketDetails(packet.id)}
          >
            <IonLabel>
              <h2>
                <IonBadge color={getProtocolColor(packet.protocol)}>
                  {packet.protocol}
                </IonBadge>
                {' '}
                <IonChip color={packet.direction === 'incoming' ? 'success' : 'primary'}>
                  <IonIcon icon={packet.direction === 'incoming' ? arrowDown : arrowUp} />
                  <IonLabel>{packet.size} bytes</IonLabel>
                </IonChip>
              </h2>
              <p>
                {packet.source} → {packet.destination}
              </p>
              <p>
                <IonIcon icon={time} />
                {' '}
                {formatDistanceToNow(packet.timestamp, { addSuffix: true })}
              </p>
            </IonLabel>
          </IonItem>
        ))}
      </IonList>

      {/* Packet Detail Modal */}
      <IonModal isOpen={isModalOpen} onDidDismiss={closePacketDetails}>
        {getSelectedPacketData() && (
          <>
            <IonHeader>
              <IonToolbar>
                <IonButtons slot="start">
                  <IonButton onClick={closePacketDetails}>
                    <IonIcon icon={close} />
                  </IonButton>
                </IonButtons>
                <IonTitle>Packet Details</IonTitle>
              </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
              <IonGrid>
                <IonRow>
                  <IonCol>
                    <IonText>
                      <h2>
                        <IonBadge color={getProtocolColor(getSelectedPacketData()!.protocol)}>
                          {getSelectedPacketData()!.protocol}
                        </IonBadge>
                      </h2>
                    </IonText>
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol>
                    <IonText>
                      <h3>Direction</h3>
                      <p>{getSelectedPacketData()!.direction}</p>
                    </IonText>
                  </IonCol>
                  <IonCol>
                    <IonText>
                      <h3>Size</h3>
                      <p>{getSelectedPacketData()!.size} bytes</p>
                    </IonText>
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol>
                    <IonText>
                      <h3>Source</h3>
                      <p>{getSelectedPacketData()!.source}</p>
                    </IonText>
                  </IonCol>
                  <IonCol>
                    <IonText>
                      <h3>Destination</h3>
                      <p>{getSelectedPacketData()!.destination}</p>
                    </IonText>
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol>
                    <IonText>
                      <h3>Timestamp</h3>
                      <p>{formatDistanceToNow(getSelectedPacketData()!.timestamp, { addSuffix: true })}</p>
                    </IonText>
                  </IonCol>
                </IonRow>
                <IonRow>
                  <IonCol>
                    <IonText>
                      <h3>Payload</h3>
                    </IonText>
                    <pre style={{ 
                      overflowX: 'auto', 
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      fontSize: '0.9em',
                      backgroundColor: 'var(--ion-color-light)',
                      padding: '8px',
                      borderRadius: '4px'
                    }}>
                      {getSelectedPacketData()!.payload}
                    </pre>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </IonContent>
          </>
        )}
      </IonModal>
    </IonContent>
  );
};

export default PacketList;
