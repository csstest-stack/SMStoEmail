import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Constants from 'expo-constants';

interface SMSLog {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  forwarded: boolean;
  forwarded_at?: string;
  email_status: string;
  error_message?: string;
}

interface SMSStats {
  total_messages: number;
  forwarded_messages: number;
  failed_messages: number;
  today_messages: number;
  today_forwarded: number;
  forwarding_rate: number;
}

export default function LogsScreen() {
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [stats, setStats] = useState<SMSStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, forwarded, failed

  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [logsResponse, statsResponse] = await Promise.all([
        fetch(`${backendUrl}/api/sms/messages`),
        fetch(`${backendUrl}/api/sms/stats`),
      ]);

      const logsData = await logsResponse.json();
      const statsData = await statsResponse.json();

      setLogs(logsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load SMS logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const clearLogs = () => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all SMS logs? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // In a real implementation, you would call an API to clear logs
            Alert.alert('Info', 'Clear logs functionality will be implemented in the backend');
          },
        },
      ]
    );
  };

  const getFilteredLogs = () => {
    switch (filterStatus) {
      case 'forwarded':
        return logs.filter(log => log.forwarded);
      case 'failed':
        return logs.filter(log => log.email_status === 'failed');
      default:
        return logs;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getStatusIcon = (log: SMSLog) => {
    if (log.forwarded) {
      return { name: 'checkmark-circle', color: '#4CAF50' };
    } else if (log.email_status === 'failed') {
      return { name: 'close-circle', color: '#F44336' };
    } else if (log.email_status === 'filtered') {
      return { name: 'filter-circle', color: '#FF9800' };
    } else if (log.email_status === 'no_config') {
      return { name: 'settings', color: '#FF5722' };
    } else {
      return { name: 'time', color: '#999' };
    }
  };

  const getStatusLabel = (log: SMSLog) => {
    if (log.forwarded) {
      return 'Forwarded';
    } else if (log.email_status === 'failed') {
      return 'Failed';
    } else if (log.email_status === 'filtered') {
      return 'Filtered';
    } else if (log.email_status === 'no_config') {
      return 'No Config';
    } else {
      return 'Pending';
    }
  };

  const FilterButton = ({ status, label, count }: { status: string; label: string; count: number }) => (
    <TouchableOpacity
      style={[styles.filterButton, filterStatus === status && styles.activeFilterButton]}
      onPress={() => setFilterStatus(status)}
    >
      <Text style={[styles.filterButtonText, filterStatus === status && styles.activeFilterButtonText]}>
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  const LogCard = ({ log }: { log: SMSLog }) => {
    const statusIcon = getStatusIcon(log);
    
    return (
      <View style={styles.logCard}>
        <View style={styles.logHeader}>
          <View style={styles.senderInfo}>
            <Ionicons name="person-outline" size={16} color="#666" />
            <Text style={styles.sender}>{log.sender}</Text>
          </View>
          <View style={styles.statusInfo}>
            <Ionicons name={statusIcon.name as any} size={16} color={statusIcon.color} />
            <Text style={[styles.status, { color: statusIcon.color }]}>
              {getStatusLabel(log)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.content} numberOfLines={3}>
          {log.content}
        </Text>
        
        <View style={styles.logFooter}>
          <Text style={styles.timestamp}>
            <Ionicons name="time-outline" size={12} color="#999" />
            {' '}{formatDate(log.timestamp)}
          </Text>
          {log.forwarded_at && (
            <Text style={styles.forwardedTime}>
              Forwarded: {formatDate(log.forwarded_at)}
            </Text>
          )}
        </View>
        
        {log.error_message && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={14} color="#F44336" />
            <Text style={styles.errorText}>{log.error_message}</Text>
          </View>
        )}
      </View>
    );
  };

  const StatsCard = ({ title, value, color, icon }: any) => (
    <View style={[styles.statsCard, { borderLeftColor: color }]}>
      <View style={styles.statsContent}>
        <View style={styles.statsText}>
          <Text style={styles.statsValue}>{value}</Text>
          <Text style={styles.statsTitle}>{title}</Text>
        </View>
        <Ionicons name={icon} size={24} color={color} />
      </View>
    </View>
  );

  const filteredLogs = getFilteredLogs();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>SMS Logs</Text>
        <TouchableOpacity style={styles.clearButton} onPress={clearLogs}>
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Section */}
        {stats && (
          <View style={styles.statsSection}>
            <View style={styles.statsRow}>
              <StatsCard
                title="Total SMS"
                value={stats.total_messages}
                color="#2196F3"
                icon="mail-outline"
              />
              <StatsCard
                title="Forwarded"
                value={stats.forwarded_messages}
                color="#4CAF50"
                icon="send-outline"
              />
            </View>
            <View style={styles.statsRow}>
              <StatsCard
                title="Failed"
                value={stats.failed_messages}
                color="#F44336"
                icon="close-circle-outline"
              />
              <StatsCard
                title="Success Rate"
                value={`${Math.round(stats.forwarding_rate)}%`}
                color="#FF9800"
                icon="analytics-outline"
              />
            </View>
          </View>
        )}

        {/* Filter Buttons */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <FilterButton status="all" label="All" count={logs.length} />
            <FilterButton 
              status="forwarded" 
              label="Forwarded" 
              count={logs.filter(log => log.forwarded).length} 
            />
            <FilterButton 
              status="failed" 
              label="Failed" 
              count={logs.filter(log => log.email_status === 'failed').length} 
            />
          </ScrollView>
        </View>

        {/* Logs List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading logs...</Text>
          </View>
        ) : filteredLogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No SMS Logs</Text>
            <Text style={styles.emptyText}>
              {filterStatus === 'all' 
                ? 'No SMS messages have been processed yet. Once messages are received, they will appear here.'
                : `No SMS logs match the "${filterStatus}" filter.`
              }
            </Text>
          </View>
        ) : (
          <View style={styles.logsContainer}>
            {filteredLogs.map((log) => (
              <LogCard key={log.id} log={log} />
            ))}
          </View>
        )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  clearButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  statsSection: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statsCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsText: {
    flex: 1,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statsTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  filterSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeFilterButton: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  logsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  logCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sender: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  content: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    alignItems: 'center',
  },
  forwardedTime: {
    fontSize: 10,
    color: '#4CAF50',
    fontStyle: 'italic',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#ffebee',
    borderRadius: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginLeft: 4,
    flex: 1,
  },
});