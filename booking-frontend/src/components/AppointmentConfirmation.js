import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { getAppointmentDetails, confirmAppointment } from '../services/api';
import '../styles/AppointmentConfirmation.css';

function AppointmentConfirmation() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [agreeToPolicy, setAgreeToPolicy] = useState(false);
  const [error, setError] = useState(null);
  const [appointmentDetails, setAppointmentDetails] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { appointmentTypeId } = useParams();
  const selectedTime = location.state?.appointmentDetails;

  useEffect(() => {
    const fetchAppointmentDetails = async () => {
      try {
        console.log('Fetching appointment details with addOnIds:', selectedTime);
        const details = await getAppointmentDetails(appointmentTypeId, selectedTime.addOnIds);
        setAppointmentDetails({
          ...details,
          date: selectedTime.date,
          time: selectedTime.time,
          addOnIds: selectedTime.addOnIds,
          price: selectedTime.price // Use the price passed from AvailabilityList
        });
        console.log('Fetched appointment details:', appointmentDetails);
      } catch (error) {
        console.error('Error fetching appointment details:', error);
        setError('Failed to fetch appointment details. Please try again.');
      }
    };

    fetchAppointmentDetails();
  }, [appointmentTypeId, selectedTime]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreeToPolicy) {
      setError('You must agree to the cancellation policy');
      return;
    }
    
    try {
      const appointmentData = {
        firstName,
        lastName,
        phoneNumber,
        appointmentTypeId,
        date: appointmentDetails.date,
        time: appointmentDetails.time,
        addOnIds: appointmentDetails.addOnIds,
        price: selectedTime.price // Use the price from selectedTime
      };
      console.log('Appointment data:', appointmentData);
      const result = await confirmAppointment(appointmentData);
      console.log('Appointment confirmed:', result);
      navigate('/confirmation-success', { state: { appointmentDetails: result.appointmentDetails } });
    } catch (error) {
      console.error('Error confirming appointment:', error);
      setError('Failed to confirm appointment. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const formatPrice = (price) => {
    return typeof price === 'number' ? price.toFixed(2) : 'N/A';
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!appointmentDetails) {
    return <div>Loading appointment details...</div>;
  }

  return (
    <div className="appointment-confirmation">
      <h2>Confirm Your Appointment</h2>
      <div className="appointment-summary">
        <h3>Appointment Details</h3>
        <p><strong>Type:</strong> {appointmentDetails.appointmentType.name}</p>
        {appointmentDetails.addOns && appointmentDetails.addOns.length > 0 && (
          <div className="add-ons">
            <p><strong>Add-ons:</strong></p>
            <ul>
              {appointmentDetails.addOns.map(addOn => (
                <li key={addOn.id}>{addOn.name}</li>
              ))}
            </ul>
          </div>
        )}
        <p><strong>Total Price:</strong> ${formatPrice(appointmentDetails.price)}</p>
        <p><strong>Date:</strong> {formatDate(appointmentDetails.date)}</p>
        <p><strong>Time:</strong> {appointmentDetails.time}</p>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="firstName">First Name:</label>
          <input
            type="text"
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="lastName">Last Name:</label>
          <input
            type="text"
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="phoneNumber">Phone Number:</label>
          <input
            type="tel"
            id="phoneNumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />
        </div>
        <div className="form-group checkbox">
          <input
            type="checkbox"
            id="agreeToPolicy"
            checked={agreeToPolicy}
            onChange={(e) => setAgreeToPolicy(e.target.checked)}
            required
          />
          <label htmlFor="agreeToPolicy">
            I understand a "No Show Fee" will be charged for a missed appointment without a 24 hour notice to Cancel or Reschedule. (No Show Fee = Full Value of the service charged on my next appointment) *
          </label>
        </div>
        <button type="submit">Confirm Appointment</button>
      </form>
    </div>
  );
}

export default AppointmentConfirmation;
