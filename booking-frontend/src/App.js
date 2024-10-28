import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import HomePage from './pages/HomePage';
import AvailabilityList from './components/AvailabilityList';
import AppointmentConfirmation from './components/AppointmentConfirmation';
import AppointmentConfirmationSuccess from './components/AppointmentConfirmationSuccess';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/availabilities/:appointmentTypeId" element={<AvailabilityList />} />
          <Route path="/confirm/:appointmentTypeId" element={<AppointmentConfirmation />} />
          <Route path="/confirmation-success" element={<AppointmentConfirmationSuccess />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
