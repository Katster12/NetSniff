import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonMenuButton,
  IonIcon,
  IonAvatar,
} from '@ionic/react';
import { personCircle } from 'ionicons/icons';
import './About.css';

const AboutUs: React.FC = () => (
  <IonPage id="main-content" className='main-content'>
    <IonHeader>
      <IonToolbar className="contact-toolbar">
        <IonButtons slot="start">
          <IonMenuButton />
        </IonButtons>
        <IonTitle className="contact-title">About Us & Contact</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent className="contact-content">
      <div className="contact-container">
        <img
          src="/assets/logo.jpg"
          alt="NetSniff Logo"
          className="contact-logo"
        />

        <h2 className="contact-heading">Meet Our Team</h2>
        <p className="contact-description">
          We are a passionate group of Computer Science students dedicated to making network analysis simple and efficient.
          This app allows real-time packet sniffing and visualizations on mobile devices.
        </p>

        <div className="contact-team-grid">
          {[1, 2, 3].map((num) => (
            <div key={num} className="contact-member-card">
              <div className="avatar-container">
                <IonAvatar className="member-avatar">
                  <IonIcon icon={personCircle} className="member-icon" />
                </IonAvatar>
              </div>
              <h3 className="member-name">Team Member {num}</h3>
              <p className="member-role">Studying Computer Science</p>
            </div>
          ))}
        </div>

        <h2 className="contact-heading contact-heading-spaced">Contact Us</h2>
        <p className="contact-description">
          
        </p>
      </div>
    </IonContent>
  </IonPage>
);

export default AboutUs;
