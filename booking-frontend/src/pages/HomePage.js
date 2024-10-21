import React from 'react';
import Logo from '../components/Logo';
import AppointmentTypeSelector from '../components/AppointmentTypeSelector';

function HomePage() {
  const appointmentTypes = [
    { id: 'full-service-vip', name: 'Full Service VIP' },
    { id: 'haircuts', name: 'Haircuts' },
    { id: 'other-services', name: 'Other Services' },
  ];

  return (
    <div className="home-page">
      <Logo />
      <AppointmentTypeSelector appointmentTypes={appointmentTypes} />
    </div>
  );
}

export default HomePage;
