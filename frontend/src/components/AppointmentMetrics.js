import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const AppointmentMetrics = ({ metrics, loading }) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#195de6" />
      </View>
    );
  }

  if (!metrics) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Failed to load appointment metrics</Text>
      </View>
    );
  }

  const appointmentsPerDayData = metrics.appointmentsPerDay ? {
    labels: metrics.appointmentsPerDay.map(item => item.date.slice(5)),
    datasets: [
      {
        data: metrics.appointmentsPerDay.map(item => item.count),
        color: (opacity = 1) => `rgba(25, 93, 230, ${opacity})`,
        strokeWidth: 2
      }
    ]
  } : { labels: [], datasets: [{ data: [] }] };

  const appointmentTypeData = {
    labels: metrics.appointmentTypeDistribution.map(item => item.appointmenttype),
    datasets: [
      {
        data: metrics.appointmentTypeDistribution.map(item => item.count)
      }
    ]
  };

  const paymentMethodData = {
    labels: metrics.paymentMethodDistribution.map(item => item.paymentmethod),
    datasets: [
      {
        data: metrics.paymentMethodDistribution.map(item => item.count)
      }
    ]
  };

  const paidVsUnpaidData = {
    labels: ['Paid', 'Unpaid'],
    datasets: [
      {
        data: [
          metrics.paidVsUnpaid.find(item => item.paid).count,
          metrics.paidVsUnpaid.find(item => !item.paid).count
        ]
      }
    ]
  };

  return (
    <ScrollView style={styles.scrollView}>
      <Text style={styles.title}>Appointment Metrics</Text>

      <View style={styles.metricContainer}>
        <Text style={styles.metricTitle}>Total Appointments</Text>
        <Text style={styles.metricValue}>{metrics.totalAppointments}</Text>
      </View>

      <View style={styles.metricContainer}>
        <Text style={styles.metricTitle}>Unique Clients</Text>
        <Text style={styles.metricValue}>{metrics.uniqueClients}</Text>
      </View>

      <View style={styles.metricContainer}>
        <Text style={styles.metricTitle}>Average Appointments per Client</Text>
        <Text style={styles.metricValue}>{metrics.avgAppointmentsPerClient.toFixed(2)}</Text>
      </View>

      <View style={styles.metricContainer}>
        <Text style={styles.metricTitle}>Total Revenue</Text>
        <Text style={styles.metricValue}>${metrics.totalRevenue.toFixed(2)}</Text>
      </View>

      <View style={styles.metricContainer}>
        <Text style={styles.metricTitle}>Average Appointment Price</Text>
        <Text style={styles.metricValue}>${metrics.avgAppointmentPrice.toFixed(2)}</Text>
      </View>

      <View style={styles.metricContainer}>
        <Text style={styles.metricTitle}>Total Tips</Text>
        <Text style={styles.metricValue}>${metrics.totalTips.toFixed(2)}</Text>
      </View>

      <View style={styles.metricContainer}>
        <Text style={styles.metricTitle}>Average Tip Amount</Text>
        <Text style={styles.metricValue}>${metrics.avgTipAmount.toFixed(2)}</Text>
      </View>

      <Text style={styles.chartTitle}>Appointments per Day (Last 30 Days)</Text>
      <LineChart
        data={appointmentsPerDayData}
        width={screenWidth - 32}
        height={220}
        chartConfig={{
          backgroundColor: '#111318',
          backgroundGradientFrom: '#111318',
          backgroundGradientTo: '#111318',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          style: {
            borderRadius: 16
          },
          propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: '#195de6'
          }
        }}
        bezier
        style={styles.chart}
      />

      <Text style={styles.chartTitle}>Appointment Type Distribution</Text>
      <PieChart
        data={appointmentTypeData.datasets[0].data.map((value, index) => ({
          name: appointmentTypeData.labels[index],
          population: value,
          color: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 1)`,
          legendFontColor: '#fff',
          legendFontSize: 12
        }))}
        width={screenWidth - 32}
        height={220}
        chartConfig={{
          backgroundColor: '#111318',
          backgroundGradientFrom: '#111318',
          backgroundGradientTo: '#111318',
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        style={styles.chart}
      />

      <Text style={styles.chartTitle}>Payment Method Distribution</Text>
      <BarChart
        data={paymentMethodData}
        width={screenWidth - 32}
        height={220}
        yAxisLabel=""
        chartConfig={{
          backgroundColor: '#111318',
          backgroundGradientFrom: '#111318',
          backgroundGradientTo: '#111318',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          style: {
            borderRadius: 16
          },
          barPercentage: 0.5,
        }}
        style={styles.chart}
      />

      <Text style={styles.chartTitle}>Paid vs Unpaid Appointments</Text>
      <PieChart
        data={paidVsUnpaidData.datasets[0].data.map((value, index) => ({
          name: paidVsUnpaidData.labels[index],
          population: value,
          color: index === 0 ? '#4CAF50' : '#F44336',
          legendFontColor: '#fff',
          legendFontSize: 12
        }))}
        width={screenWidth - 32}
        height={220}
        chartConfig={{
          backgroundColor: '#111318',
          backgroundGradientFrom: '#111318',
          backgroundGradientTo: '#111318',
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        style={styles.chart}
      />

      <Text style={styles.sectionTitle}>Most Frequent Clients</Text>
      {metrics.mostFrequentClients.map((client, index) => (
        <View key={index} style={styles.clientItem}>
          <Text style={styles.clientText}>Client ID: {client.clientid}</Text>
          <Text style={styles.clientText}>Appointments: {client.appointment_count}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#111318',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111318',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111318',
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  metricContainer: {
    marginBottom: 16,
  },
  metricTitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#195de6',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 24,
    marginBottom: 16,
  },
  clientItem: {
    backgroundColor: '#1E2128',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  clientText: {
    color: '#fff',
    fontSize: 14,
  },
});

export default AppointmentMetrics;