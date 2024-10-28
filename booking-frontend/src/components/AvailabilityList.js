import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAvailabilities, getCompatibleAddOns, getAppointmentTypeById } from '../services/api';
import '../styles/AvailabilityList.css';

function AvailabilityList() {
  const [availabilities, setAvailabilities] = useState([]);
  const [compatibleAddOns, setCompatibleAddOns] = useState([]);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [appointmentType, setAppointmentType] = useState(null);
  const { appointmentTypeId } = useParams();
  const navigate = useNavigate();

  const fetchAvailabilities = useCallback(async (page) => {
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + page * 5);
      const formattedDate = startDate.toISOString().split('T')[0];
      console.log('Fetching availabilities for date:', formattedDate);
      
      const data = await getAvailabilities(formattedDate, parseInt(appointmentTypeId), selectedAddOns);
      console.log('Fetched availabilities:', data);
      
      setAvailabilities(prevAvailabilities => {
        const newAvailabilities = [...prevAvailabilities];
        data.availableDays.forEach((day, index) => {
          newAvailabilities[page * 5 + index] = day;
        });
        return newAvailabilities;
      });
      setError(null);
    } catch (error) {
      console.error('Error fetching availabilities:', error);
      setError('Failed to fetch availabilities. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [appointmentTypeId, selectedAddOns]);

  useEffect(() => {
    fetchAppointmentType();
    fetchCompatibleAddOns();
    fetchAvailabilities(0);
  }, [appointmentTypeId]);

  useEffect(() => {
    fetchAvailabilities(currentPage);
  }, [currentPage, selectedAddOns]);

  const fetchAppointmentType = async () => {
    try {
      const data = await getAppointmentTypeById(parseInt(appointmentTypeId));
      console.log('Fetched appointment type:', data);
      setAppointmentType(data);
    } catch (error) {
      console.error('Error fetching appointment type:', error);
      setError('Failed to fetch appointment type. Please try again later.');
    }
  };

  const fetchCompatibleAddOns = async () => {
    try {
      const addOns = await getCompatibleAddOns(appointmentTypeId);
      setCompatibleAddOns(addOns);
    } catch (error) {
      console.error('Error fetching compatible add-ons:', error);
      setError('Failed to fetch compatible add-ons. Please try again later.');
    }
  };

  const handleAddOnChange = (addOnId) => {
    setSelectedAddOns(prev => 
      prev.includes(addOnId) 
        ? prev.filter(id => id !== addOnId)
        : [...prev, addOnId]
    );
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    setCurrentPage(currentPage + 1);
  };

  const handleReturnHome = () => {
    navigate('/');
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
  };

  const handleTimeSlotSelect = (date, time) => {
    const totalPrice = calculateTotalPrice();
    console.log('Total price:', totalPrice);
    navigate(`/confirm/${appointmentTypeId}`, { 
      state: { 
        appointmentDetails: {
          date,
          time,
          appointmentType: appointmentType?.name,
          price: totalPrice,
          addOnIds: selectedAddOns
        }
      }
    });
  };

  const calculateTotalPrice = () => {
    const basePrice = parseInt(appointmentType?.price || '0', 10);
    const addOnsPrice = compatibleAddOns
      .filter(addOn => selectedAddOns.includes(addOn.id))
      .reduce((total, addOn) => total + parseInt(addOn.price, 10), 0);
    return basePrice + addOnsPrice;
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  const visibleDays = availabilities.slice(currentPage * 5, (currentPage + 1) * 5);

  return (
    <div className="availability-list">
      <button onClick={handleReturnHome} className="return-home-button">Return to Home</button>
      <h2>Available Time Slots</h2>
      <div className="time-zone">TIME ZONE: EASTERN TIME (GMT-04:00)</div>
      
      {compatibleAddOns.length > 0 && (
        <div className="add-ons-section">
          <h3>Add-ons</h3>
          {compatibleAddOns.map(addOn => (
            <label key={addOn.id} className="add-on-option">
              <input
                type="checkbox"
                checked={selectedAddOns.includes(addOn.id)}
                onChange={() => handleAddOnChange(addOn.id)}
              />
              {addOn.name} (${addOn.price}, {addOn.duration} min)
            </label>
          ))}
        </div>
      )}

      <div className="navigation">
        <button onClick={handlePrevious} disabled={currentPage === 0 || loading}>
          Previous
        </button>
        <button onClick={handleNext} disabled={loading}>
          {loading ? 'Loading...' : 'Next'}
        </button>
      </div>
      
      {loading ? (
        <div className="loading">Loading availabilities...</div>
      ) : (
        <div className="week-grid">
          {visibleDays.map((day, index) => (
            <div key={index} className="day-column">
              <div className="day-header">
                <div className="day-name">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}</div>
                <div className="day-date">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              </div>
              <div className="time-slots">
                {day.timeSlots.map((slot, timeIndex) => (
                  <button 
                    key={timeIndex} 
                    className="time-slot"
                    onClick={() => handleTimeSlotSelect(day.date, `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`)}
                  >
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Debug info */}
      <div>
        <h3>Debug Info:</h3>
        <p>Current Page: {currentPage}</p>
        <p>Total Availabilities: {availabilities.length}</p>
        <p>Visible Days: {visibleDays.length}</p>
        <p>Loading: {loading ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
}

export default AvailabilityList;
