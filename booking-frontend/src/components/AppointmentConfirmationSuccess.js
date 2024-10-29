import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import '../styles/AppointmentConfirmationSuccess.css';

function AppointmentConfirmationSuccess() {
  const location = useLocation();
  const appointmentDetails = location.state?.appointmentDetails;

  if (!appointmentDetails) {
    return <div>No appointment details found. Please try booking again.</div>;
  }

  const formatDate = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  return (
    <div className="appointment-confirmation-success">
      <FaCheckCircle className="success-icon" />
      <h1>Appointment Booked Successfully!</h1>
      <div className="appointment-details">
        <h2>Appointment Details</h2>
        <p><strong>Type:</strong> {appointmentDetails.appointmentType}</p>
        <p><strong>Date:</strong> {formatDate(appointmentDetails.date)}</p>
        <p><strong>Time:</strong> {appointmentDetails.startTime} - {appointmentDetails.endTime}</p>
        {appointmentDetails.addOns && appointmentDetails.addOns.length > 0 && (
          <div>
            <p><strong>Add-ons:</strong></p>
            <ul>
              {appointmentDetails.addOns.map((addOn, index) => (
                <li key={index}>{addOn}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <Link to="/" className="home-button">Return to Home</Link>
    </div>
  );
}

export default AppointmentConfirmationSuccess;
