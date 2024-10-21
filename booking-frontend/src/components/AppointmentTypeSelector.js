import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/AppointmentTypeSelector.css';

function AppointmentTypeSelector({ appointmentTypes }) {
  return (
    <div className="category-selector">
      <h2>Select Category</h2>
      {appointmentTypes.map((type) => (
        <div key={type.id} className="appointment-type">
          <span>{type.name}</span>
          <Link to={`/services/${type.id}`}>
            <button>SELECT</button>
          </Link>
        </div>
      ))}
    </div>
  );
}

export default AppointmentTypeSelector;
