import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import '../styles/AppointmentTypeSelector.css';  // Updated import path

function AppointmentTypeSelector({ appointmentTypes }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">Uzi Cuts</h1>
      <p className="text-xl text-center mb-12">Choose your service and book your appointment today!</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {appointmentTypes.map((type) => (
          <Card key={type.id}>
            <CardHeader>
              <CardTitle>{type.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Duration: {type.duration} min</p>
              <p>Price: ${type.price}</p>
            </CardContent>
            <CardFooter>
              <Link to={`/availabilities/${type.id}`} className="w-full">
                <Button className="w-full">Book Now</Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default AppointmentTypeSelector;
