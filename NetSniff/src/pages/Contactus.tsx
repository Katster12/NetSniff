import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonMenuButton,
} from '@ionic/react';
import './Contactus.css';

const ContactPage: React.FC = () => (
  <IonPage id="main-content">
    <IonHeader>
      <IonToolbar className="contact-toolbar">
        <IonButtons slot="start">
          <IonMenuButton />
        </IonButtons>
        <IonTitle className="contact-title">Contact Us</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent className="contact-content">
      <div className="contact-container">
        <img
          src="/assets/logo.jpg"
          alt="NetSniff Logo"
          className="contact-logo"
        />

        <h2 className="contact-heading">Our Team</h2>
        <p className="contact-description">
          We are a passionate group of developers working to make network analysis simple, efficient, and accessible.
          Our mission is to bring real-time traffic insights to mobile.
        </p>

        <div className="contact-team-grid">
          <div className="contact-member-card">
            <h3 className="member-name">Krina Rane</h3>
            <p className="member-role">Developer</p>
          </div>
          <div className="contact-member-card">
            <h3 className="member-name">Jay Shah</h3>
            <p className="member-role">Developer</p>
          </div>
          <div className="contact-member-card">
            <h3 className="member-name">Parisha</h3>
            <p className="member-role">Developer</p>
          </div>
        </div>
      </div>
    </IonContent>
  </IonPage>
);

export default ContactPage;
