import React from 'react';
import { Link, useParams } from 'react-router-dom';

function ServiceOptions() {
  const { appointmentType } = useParams();

  const serviceOptions = [
    { id: 'adult', name: 'Adult - (Full Service)' },
    { id: 'emergency', name: 'OFF DAY/EMERGENCY - (Full Service)' },
  ];

  return (
    <div className="service-options">
      <h2>Select Service Option</h2>
      {serviceOptions.map((option) => (
        <div key={option.id} className="service-option">
          <span>{option.name}</span>
          <Link to={`/availabilities/${appointmentType}/${option.id}`}>
            <button>SELECT</button>
          </Link>
        </div>
      ))}
    </div>
  );
}

export default ServiceOptions;
