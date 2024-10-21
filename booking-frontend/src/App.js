import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import HomePage from './pages/HomePage';
import ServiceOptions from './components/ServiceOptions';
import AvailabilityList from './components/AvailabilityList';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/services/:appointmentType" element={<ServiceOptions />} />
          <Route path="/availabilities/:appointmentType/:serviceOption" element={<AvailabilityList />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
