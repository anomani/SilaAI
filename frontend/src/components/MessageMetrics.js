import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView, TouchableOpacity } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

const MessageMetrics = ({ metrics, loading }) => {
  const navigation = useNavigation();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#195de6" />
        </View>
      </SafeAreaView>
    );
  }

  if (!metrics) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Failed to load metrics</Text>
      </SafeAreaView>
    );
  }

  const messagesPerDayData = {
    labels: metrics.messagesPerDay.map(item => {
      const label = item.day.slice(5, 10); // This will get "MM-DD" from the date string
      return label;
    }),
    datasets: [{
      data: metrics.messagesPerDay.map(item => item.count)
    }]
  };

  const messageDistributionData = [
    {
      name: 'AI',
      population: metrics.messageDistribution.find(item => item.is_ai).count,
      color: '#195de6',
      legendFontColor: '#9da6b8',
      legendFontSize: 15
    },
    {
      name: 'Human',
      population: metrics.messageDistribution.find(item => !item.is_ai).count,
      color: '#292e38',
      legendFontColor: '#9da6b8',
      legendFontSize: 15
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        
        <View style={styles.metricContainer}>
          <Text style={styles.metricTitle}>Total Messages</Text>
          <Text style={styles.metricValue}>{metrics.totalMessages}</Text>
        </View>

        <View style={styles.metricContainer}>
          <Text style={styles.metricTitle}>Unique Clients</Text>
          <Text style={styles.metricValue}>{metrics.uniqueClients}</Text>
        </View>

        <View style={styles.metricContainer}>
          <Text style={styles.metricTitle}>Avg Messages per Client</Text>
          <Text style={styles.metricValue}>{metrics.avgMessagesPerClient.toFixed(2)}</Text>
        </View>

        <Text style={styles.chartTitle}>Messages per Day (Last 30 Days)</Text>
        <LineChart
          data={messagesPerDayData}
          width={screenWidth - 40}
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
              r: "6",
              strokeWidth: "2",
              stroke: "#195de6"
            },
            propsForLabels: {
              fontSize: 10,
              fontWeight: 'bold'
            }
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16
          }}
          horizontalLabelRotation={0}
          verticalLabelRotation={0}
          xLabelsOffset={-5}
          yLabelsOffset={20}
        />

        <Text style={styles.chartTitle}>Message Distribution</Text>
        <PieChart
          data={messageDistributionData}
          width={screenWidth - 40}
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
            }
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />

        <Text style={styles.sectionTitle}>Most Active Clients</Text>
        {metrics.mostActiveClients.map((client, index) => (
          <View key={index} style={styles.clientItem}>
            <Text style={styles.clientName}>{client.name}</Text>
            <Text style={styles.messageCount}>Messages: {client.message_count}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111318',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#111318',
    borderBottomWidth: 1,
    borderBottomColor: '#292e38',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 20,
    paddingTop: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricContainer: {
    backgroundColor: '#292e38',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  metricTitle: {
    fontSize: 16,
    color: '#9da6b8',
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 30,
    marginBottom: 15,
    color: '#fff',
  },
  clientItem: {
    backgroundColor: '#292e38',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  messageCount: {
    fontSize: 14,
    color: '#9da6b8',
    marginTop: 5,
  },
  errorText: {
    fontSize: 18,
    color: '#ff6b6b',
    textAlign: 'center',
    marginTop: 20,
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default MessageMetrics;