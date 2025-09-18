import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppSettings {
  notificationsEnabled: boolean;
  runInBackground: boolean;
  autoStart: boolean;
  encryptMessages: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>({
    notificationsEnabled: true,
    runInBackground: true,
    autoStart: false,
    encryptMessages: false,
    soundEnabled: true,
    vibrationEnabled: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('app_settings');
      if (savedSettings) {
        setSettings({ ...settings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const updateSetting = async (key: keyof AppSettings, value: boolean) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save setting:', error);
      Alert.alert('Error', 'Failed to save setting');
    }
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will remove all SMS logs, filters, and email configuration. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'email_config',
                'sms_filters',
                'sms_logs',
                'app_settings',
                'service_status'
              ]);
              Alert.alert('Success', 'All data has been cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const exportData = () => {
    Alert.alert(
      'Export Data',
      'Data export functionality will be available in a future update. This will allow you to backup your SMS logs and settings.',
      [{ text: 'OK' }]
    );
  };

  const openAppPermissions = () => {
    Alert.alert(
      'App Permissions',
      'Open device settings to manage app permissions including SMS access, notifications, and background processing.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  };

  const SettingRow = ({ 
    title, 
    subtitle, 
    value, 
    onValueChange, 
    icon, 
    disabled = false 
  }: {
    title: string;
    subtitle?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    icon: string;
    disabled?: boolean;
  }) => (
    <View style={[styles.settingRow, disabled && styles.disabledRow]}>
      <View style={styles.settingInfo}>
        <View style={styles.settingHeader}>
          <Ionicons name={icon as any} size={20} color={disabled ? '#ccc' : '#666'} />
          <Text style={[styles.settingTitle, disabled && styles.disabledText]}>{title}</Text>
        </View>
        {subtitle && (
          <Text style={[styles.settingSubtitle, disabled && styles.disabledText]}>
            {subtitle}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#f0f0f0', true: '#2196F3' }}
        thumbColor={value ? '#ffffff' : '#ffffff'}
      />
    </View>
  );

  const ActionRow = ({ title, subtitle, icon, onPress, color = '#333' }: {
    title: string;
    subtitle?: string;
    icon: string;
    onPress: () => void;
    color?: string;
  }) => (
    <TouchableOpacity style={styles.actionRow} onPress={onPress}>
      <View style={styles.actionInfo}>
        <View style={styles.actionHeader}>
          <Ionicons name={icon as any} size={20} color={color} />
          <Text style={[styles.actionTitle, { color }]}>{title}</Text>
        </View>
        {subtitle && (
          <Text style={styles.actionSubtitle}>{subtitle}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* General Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          
          <SettingRow
            title="Enable Notifications"
            subtitle="Show notifications when SMS are forwarded"
            value={settings.notificationsEnabled}
            onValueChange={(value) => updateSetting('notificationsEnabled', value)}
            icon="notifications-outline"
          />
          
          <SettingRow
            title="Run in Background"
            subtitle="Keep the app running to monitor SMS"
            value={settings.runInBackground}
            onValueChange={(value) => updateSetting('runInBackground', value)}
            icon="sync-outline"
          />
          
          <SettingRow
            title="Auto Start Service"
            subtitle="Automatically start SMS monitoring on app launch"
            value={settings.autoStart}
            onValueChange={(value) => updateSetting('autoStart', value)}
            icon="play-circle-outline"
          />
        </View>

        {/* Security Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <SettingRow
            title="Encrypt Messages"
            subtitle="Encrypt SMS content before sending (Coming Soon)"
            value={settings.encryptMessages}
            onValueChange={(value) => updateSetting('encryptMessages', value)}
            icon="shield-checkmark-outline"
            disabled={true}
          />
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <SettingRow
            title="Sound"
            subtitle="Play sound for notifications"
            value={settings.soundEnabled}
            onValueChange={(value) => updateSetting('soundEnabled', value)}
            icon="volume-high-outline"
          />
          
          <SettingRow
            title="Vibration"
            subtitle="Vibrate for notifications"
            value={settings.vibrationEnabled}
            onValueChange={(value) => updateSetting('vibrationEnabled', value)}
            icon="phone-portrait-outline"
          />
        </View>

        {/* Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration</Text>
          
          <ActionRow
            title="Email Settings"
            subtitle="Configure email accounts and SMTP settings"
            icon="mail-outline"
            onPress={() => router.push('/email-config')}
          />
          
          <ActionRow
            title="SMS Filters"
            subtitle="Manage which SMS messages to forward"
            icon="filter-outline"
            onPress={() => router.push('/filters')}
          />
          
          <ActionRow
            title="App Permissions"
            subtitle="Manage SMS, notification, and background permissions"
            icon="shield-outline"
            onPress={openAppPermissions}
          />
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <ActionRow
            title="View SMS Logs"
            subtitle="See all processed SMS messages"
            icon="list-outline"
            onPress={() => router.push('/logs')}
          />
          
          <ActionRow
            title="Export Data"
            subtitle="Backup your SMS logs and settings"
            icon="download-outline"
            onPress={exportData}
          />
          
          <ActionRow
            title="Clear All Data"
            subtitle="Remove all logs, filters, and settings"
            icon="trash-outline"
            onPress={clearAllData}
            color="#F44336"
          />
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>SMS Mail Forwarder</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            <Text style={styles.aboutDescription}>
              Automatically forward SMS messages to your email with advanced filtering and multiple email integration options.
            </Text>
            
            <View style={styles.aboutFeatures}>
              <Text style={styles.featuresTitle}>Features:</Text>
              <Text style={styles.featureItem}>• Real-time SMS monitoring</Text>
              <Text style={styles.featureItem}>• Advanced filtering system</Text>
              <Text style={styles.featureItem}>• Multiple email providers</Text>
              <Text style={styles.featureItem}>• Detailed logging and statistics</Text>
              <Text style={styles.featureItem}>• Background processing</Text>
            </View>
          </View>
        </View>

        {/* Footer spacing */}
        <View style={styles.footer} />
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  disabledRow: {
    opacity: 0.5,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginLeft: 28,
  },
  disabledText: {
    color: '#ccc',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionInfo: {
    flex: 1,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginLeft: 28,
  },
  aboutCard: {
    padding: 20,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  aboutVersion: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  aboutDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  aboutFeatures: {
    marginTop: 8,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  featureItem: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    marginBottom: 2,
  },
  footer: {
    height: 40,
  },
});