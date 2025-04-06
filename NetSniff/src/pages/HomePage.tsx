"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
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
  IonSpinner,
  IonList,
  IonItem,
  IonLabel,
} from "@ionic/react"
import { useHistory } from "react-router-dom"
import { usePackets } from "../context/PacketContext"
import "./HomePage.css" // Import the CSS file

const HomePage: React.FC = () => {
  const { packets, clearPackets, isCapturing, startCapture, stopCapture } = usePackets()
  const history = useHistory()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contentRef = useRef<HTMLIonContentElement>(null)

  useEffect(() => {
    console.log("HomePage: Component mounted");
    return () => {
      console.log("HomePage: Component unmounting");
    }
  }, [])

  const handleStartCapture = async () => {
    console.log("HomePage: Start capture button clicked");
    setLoading(true)
    setError(null)
    
    try {
      console.log("HomePage: Attempting to start packet capture");
      await startCapture();
      console.log("HomePage: Packet capture started successfully");
    } catch (error) {
      console.error("HomePage: Error starting packet capture:", error);
      const errorMessage = error instanceof Error ? 
        `${error.name}: ${error.message}\n${error.stack}` : 
        String(error);
      console.error("HomePage: Detailed error:", errorMessage);
      setError("Failed to start packet capture. Please check logs for details.");
    } finally {
      setLoading(false)
    }
  }

  const handleStopCapture = async () => {
    console.log("HomePage: Stop capture button clicked");
    setLoading(true)
    try {
      console.log("HomePage: Attempting to stop packet capture");
      await stopCapture();
      console.log("HomePage: Packet capture stopped successfully");
    } catch (error) {
      console.error("HomePage: Error stopping packet capture:", error);
      const errorMessage = error instanceof Error ? 
        `${error.name}: ${error.message}\n${error.stack}` : 
        String(error);
      console.error("HomePage: Detailed error:", errorMessage);
      setError("Failed to stop packet capture. Please check logs for details.");
    } finally {
      setLoading(false)
    }
  }

  const handleClearPackets = () => {
    console.log("HomePage: Clear packets button clicked");
    clearPackets();
  }

  const handlePacketClick = (packet: any) => {
    console.log("HomePage: Packet clicked:", packet);
    history.push(`/packet/${packet.id}`)
  }

  // Function to determine row color based on protocol or index
  const getRowColor = (index: number, protocol: string) => {
    if (protocol === "TCP" || protocol === "HTTP") {
      return "var(--ion-color-success-shade)" // Green
    } else if (protocol === "UDP" || protocol === "DNS") {
      return "var(--ion-color-primary-shade)" // Blue
    } else {
      return "var(--ion-color-danger-shade)" // Red
    }
  }

  // Scroll to bottom when new packets arrive
  useEffect(() => {
    if (isCapturing && packets.length > 0 && contentRef.current) {
      contentRef.current.scrollToBottom(300)
    }
  }, [packets.length, isCapturing])

  // Render a packet row (for virtual scroll)
  const renderPacketItem = (packet: any, index: number) => {
    try {
      // Safety check for packet
      if (!packet || !packet.id) {
        console.error("Invalid packet data:", packet);
        return null;
      }
      
      return (
        <IonItem
          key={packet.id}
          button
          onClick={() => handlePacketClick(packet)}
          style={{ backgroundColor: getRowColor(index, packet.protocol) }}
        >
          <IonLabel>
            <h2>Packet {packet.number}</h2>
            <p>Source: {packet.source}</p>
            <p>Destination: {packet.destination}</p>
            <p>Protocol: {packet.protocol}</p>
          </IonLabel>
        </IonItem>
      )
    } catch (error) {
      console.error("Error rendering packet item:", error);
      return null;
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>NetSniff</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding" ref={contentRef}>
        {error && (
          <div style={{ padding: '16px', backgroundColor: '#ffebee', color: '#c62828' }}>
            <p>{error}</p>
          </div>
        )}
        
        <IonButton expand="full" onClick={isCapturing ? handleStopCapture : handleStartCapture} disabled={loading}>
          {isCapturing ? "Stop Capture" : "Start Capture"}
          {loading && <IonSpinner name="crescent" />}
        </IonButton>

        <IonButton expand="full" color="secondary" onClick={handleClearPackets} disabled={packets.length === 0}>
          Clear Packets
        </IonButton>

        <IonGrid className="packet-table">
          <IonRow className="packet-header">
            <IonCol size="1">Number</IonCol>
            <IonCol size="3">Source</IonCol>
            <IonCol size="3">Destination</IonCol>
            <IonCol size="2">Protocol</IonCol>
            <IonCol size="3">Info</IonCol>
          </IonRow>

          {/* Use a virtualized list for better performance with large datasets */}
          {Array.isArray(packets) && packets.length > 0 ? (
            <IonList>
              {packets.map((packet, index) => renderPacketItem(packet, index))}
            </IonList>
          ) : (
            <>
              {!isCapturing && (
                <p className="empty-message">No packets captured yet. Start capturing to see network traffic.</p>
              )}
              {isCapturing && <p className="empty-message">Capturing Packets... Please wait</p>}
            </>
          )}
        </IonGrid>
      </IonContent>
    </IonPage>
  )
}

export default HomePage