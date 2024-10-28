import React, { useState, useEffect } from 'react';
import Logo from '../components/Logo';
import AppointmentTypeSelector from '../components/AppointmentTypeSelector';
import { getAppointmentTypes } from '../services/api';
import { Container } from "@/components/ui/container";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

function HomePage() {
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAppointmentTypes();
  }, []);

  const fetchAppointmentTypes = async () => {
    try {
      setLoading(true);
      const types = await getAppointmentTypes();
      setAppointmentTypes(types);
      setError(null);
    } catch (err) {
      console.error('Error fetching appointment types:', err);
      setError('Failed to load appointment types. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-10">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <Skeleton className="h-12 w-[200px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-10">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <Logo />
        </CardHeader>
        <CardContent>
          <AppointmentTypeSelector appointmentTypes={appointmentTypes} />
        </CardContent>
      </Card>
    </Container>
  );
}

export default HomePage;
