import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getAvailabilities } from '../services/api';
import '../styles/AvailabilityList.css';

function AvailabilityList() {
  const [availabilities, setAvailabilities] = useState([]);
  const [error, setError] = useState(null);
  const { appointmentType, serviceOption } = useParams();

  useEffect(() => {
    fetchAvailabilities();
  }, [appointmentType, serviceOption]);

  const fetchAvailabilities = async () => {
    try {
      const nextWeek = new Array(7).fill().map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        return date.toISOString().split('T')[0];
      });

      const allAvailabilities = await Promise.all(
        nextWeek.map(date => 
          getAvailabilities(date, `${appointmentType}-${serviceOption}`)
        )
      );

      console.log("Fetched availabilities:", allAvailabilities);
      setAvailabilities(allAvailabilities);
      setError(null);
    } catch (error) {
      console.error('Error fetching availabilities:', error);
      setError('Failed to fetch availabilities. Please try again later.');
    }
  };

  const getDayName = (date) => {
    return new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getMonthDay = (date) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="availability-list">
      <h2>Available Time Slots</h2>
      <div className="time-zone">TIME ZONE: EASTERN TIME (GMT-04:00)</div>
      <div className="week-grid">
        {availabilities.map((dayAvailabilities, index) => {
          const date = new Date();
          date.setDate(date.getDate() + index);
          const dateString = date.toISOString().split('T')[0];
          return (
            <div key={index} className="day-column">
              <div className="day-header">
                <div className="day-name">{getDayName(dateString)}</div>
                <div className="day-date">{getMonthDay(dateString)}</div>
              </div>
              <div className="time-slots">
                {Array.isArray(dayAvailabilities) ? (
                  dayAvailabilities.map((time, timeIndex) => (
                    <button key={timeIndex} className="time-slot">
                      {time}
                    </button>
                  ))
                ) : (
                  <p>No availabilities</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AvailabilityList;
