import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DashboardStats {
  totalSMS: number;
  forwardedToday: number;
  activeFilters: number;
  emailConfigured: boolean;
}

export default function HomeScreen() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSMS: 0,
    forwardedToday: 0,
    activeFilters: 0,
    emailConfigured: false,
  });
  const [isServiceRunning, setIsServiceRunning] = useState(false);

  useEffect(() => {
    loadDashboardData();
    checkServiceStatus();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [emailConfig, filters, logs] = await Promise.all([
        AsyncStorage.getItem('email_config'),
        AsyncStorage.getItem('sms_filters'),
        AsyncStorage.getItem('sms_logs'),
      ]);

      const parsedFilters = filters ? JSON.parse(filters) : [];
      const parsedLogs = logs ? JSON.parse(logs) : [];
      
      const today = new Date().toDateString();
      const todayLogs = parsedLogs.filter((log: any) => 
        new Date(log.timestamp).toDateString() === today
      );

      setStats({
        totalSMS: parsedLogs.length,
        forwardedToday: todayLogs.length,
        activeFilters: parsedFilters.length,
        emailConfigured: !!emailConfig,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const checkServiceStatus = async () => {
    try {
      const serviceStatus = await AsyncStorage.getItem('service_status');
      setIsServiceRunning(serviceStatus === 'running');
    } catch (error) {
      console.error('Error checking service status:', error);
    }
  };

  const toggleService = async () => {
    try {
      const newStatus = !isServiceRunning;
      await AsyncStorage.setItem('service_status', newStatus ? 'running' : 'stopped');
      setIsServiceRunning(newStatus);
      
      Alert.alert(
        'Service Status',
        `SMS forwarding service is now ${newStatus ? 'running' : 'stopped'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle service');
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      Alert.alert(
        'Permissions Required',
        'This app needs SMS permissions to monitor and forward messages. Please grant permissions in the next screen.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Grant Permissions', 
            onPress: () => {
              // In a real implementation, you would request SMS permissions here
              Linking.openSettings();
            }
          }
        ]
      );
    }
  };

  const StatCard = ({ title, value, icon, color, onPress }: any) => (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <View style={styles.statContent}>
        <View style={styles.statText}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
        </View>
        <Ionicons name={icon} size={24} color={color} />
      </View>
    </TouchableOpacity>
  );

  const QuickAction = ({ title, icon, color, onPress }: any) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>SMS Mail Forwarder</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: isServiceRunning ? '#4CAF50' : '#FF5722' }]} />
            <Text style={styles.statusText}>
              {isServiceRunning ? 'Service Running' : 'Service Stopped'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Service Toggle */}
        <View style={styles.serviceSection}>
          <TouchableOpacity 
            style={[styles.serviceToggle, { backgroundColor: isServiceRunning ? '#4CAF50' : '#FF5722' }]}
            onPress={toggleService}
          >
            <Ionicons 
              name={isServiceRunning ? 'pause' : 'play'} 
              size={24} 
              color="white" 
            />
            <Text style={styles.serviceToggleText}>
              {isServiceRunning ? 'Stop Service' : 'Start Service'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Total SMS"
            value={stats.totalSMS}
            icon="mail-outline"
            color="#2196F3"
            onPress={() => router.push('/logs')}
          />
          <StatCard
            title="Forwarded Today"
            value={stats.forwardedToday}
            icon="send-outline"
            color="#4CAF50"
            onPress={() => router.push('/logs')}
          />
          <StatCard
            title="Active Filters"
            value={stats.activeFilters}
            icon="filter-outline"
            color="#FF9800"
            onPress={() => router.push('/filters')}
          />
          <StatCard
            title="Email Status"
            value={stats.emailConfigured ? 'Configured' : 'Not Set'}
            icon="mail-outline"
            color={stats.emailConfigured ? '#4CAF50' : '#FF5722'}
            onPress={() => router.push('/email-config')}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        
        <View style={styles.quickActionsGrid}>
          <QuickAction
            title="Email Setup"
            icon="mail-outline"
            color="#2196F3"
            onPress={() => router.push('/email-config')}
          />
          <QuickAction
            title="SMS Filters"
            icon="filter-outline"
            color="#FF9800"
            onPress={() => router.push('/filters')}
          />
          <QuickAction
            title="View Logs"
            icon="list-outline"
            color="#4CAF50"
            onPress={() => router.push('/logs')}
          />
          <QuickAction
            title="Test SMS"
            icon="send-outline"
            color="#9C27B0"
            onPress={() => router.push('/test-sms')}
          />
        </View>

        {/* Permissions Notice */}
        {Platform.OS === 'android' && (
          <View style={styles.permissionsCard}>
            <View style={styles.permissionsHeader}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#FF9800" />
              <Text style={styles.permissionsTitle}>Permissions Required</Text>
            </View>
            <Text style={styles.permissionsText}>
              SMS Mail Forwarder needs SMS permissions to monitor incoming messages. 
              Tap below to grant permissions.
            </Text>
            <TouchableOpacity style={styles.permissionsButton} onPress={requestPermissions}>
              <Text style={styles.permissionsButtonText}>Grant Permissions</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* App Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How It Works</Text>
          <Text style={styles.infoText}>
            1. Configure your email settings{'\n'}
            2. Set up SMS filters (optional){'\n'}
            3. Start the forwarding service{'\n'}
            4. SMS messages will be automatically forwarded to your email
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  settingsButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  serviceSection: {
    padding: 20,
  },
  serviceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  serviceToggleText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsGrid: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statText: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickAction: {
    backgroundColor: 'white',
    width: '48%',
    aspectRatio: 1,
    marginBottom: 12,
    marginRight: '2%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  permissionsCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  permissionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  permissionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  permissionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  permissionsButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  permissionsButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 40,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});