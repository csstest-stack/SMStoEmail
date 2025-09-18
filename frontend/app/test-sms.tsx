import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Constants from 'expo-constants';

export default function TestSMSScreen() {
  const [testData, setTestData] = useState({
    sender: '+1234567890',
    content: 'This is a test SMS message to verify that your email forwarding is working correctly.',
  });
  const [loading, setLoading] = useState(false);

  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

  const sendTestSMS = async () => {
    if (!testData.sender.trim() || !testData.content.trim()) {
      Alert.alert('Validation Error', 'Please fill in both sender and content fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/sms/forward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: testData.sender,
          content: testData.content,
          timestamp: new Date().toISOString(),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert(
          'Test Result',
          `SMS processing ${result.status === 'sent' ? 'successful' : 'completed'}!\n\nStatus: ${result.status}\nMessage: ${result.message}`,
          [
            { text: 'View Logs', onPress: () => router.push('/logs') },
            { text: 'OK' },
          ]
        );
      } else {
        throw new Error(result.detail || 'Failed to process test SMS');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send test SMS');
    } finally {
      setLoading(false);
    }
  };

  const usePreset = (preset: { sender: string; content: string }) => {
    setTestData(preset);
  };

  const presets = [
    {
      name: 'Bank Alert',
      sender: 'BANK',
      content: 'Alert: Your account has been credited with $500.00. Balance: $1,234.56. Transaction ID: TX123456789.',
    },
    {
      name: 'OTP Code',
      sender: '+1555123456',
      content: 'Your verification code is 123456. Do not share this code with anyone. Valid for 10 minutes.',
    },
    {
      name: 'Delivery Update',
      sender: 'DELIVERY',
      content: 'Your package is out for delivery and will arrive between 2-4 PM. Track: https://example.com/track/ABC123',
    },
    {
      name: 'Emergency Alert',
      sender: 'EMERGENCY',
      content: 'URGENT: Weather alert in your area. Severe thunderstorm warning until 8 PM. Stay indoors.',
    },
  ];

  const PresetCard = ({ preset }: { preset: typeof presets[0] }) => (
    <TouchableOpacity
      style={styles.presetCard}
      onPress={() => usePreset({ sender: preset.sender, content: preset.content })}
    >
      <View style={styles.presetHeader}>
        <Text style={styles.presetName}>{preset.name}</Text>
        <Ionicons name="chevron-forward" size={16} color="#666" />
      </View>
      <Text style={styles.presetSender}>From: {preset.sender}</Text>
      <Text style={styles.presetContent} numberOfLines={2}>
        {preset.content}
      </Text>
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
        <Text style={styles.title}>Test SMS Forwarding</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView 
        style={styles.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={24} color="#2196F3" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>How Testing Works</Text>
              <Text style={styles.infoText}>
                This will simulate an incoming SMS message and test your complete forwarding setup including filters and email configuration.
              </Text>
            </View>
          </View>

          {/* Test Form */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test SMS Details</Text>
            
            <Text style={styles.label}>Sender (Phone Number or Name)</Text>
            <TextInput
              style={styles.input}
              value={testData.sender}
              onChangeText={(text) => setTestData({ ...testData, sender: text })}
              placeholder="+1234567890 or BANK"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>SMS Content</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={testData.content}
              onChangeText={(text) => setTestData({ ...testData, content: text })}
              placeholder="Enter your test SMS message here..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.button, styles.testButton]}
              onPress={sendTestSMS}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.buttonText}>Testing...</Text>
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={20} color="white" />
                  <Text style={styles.buttonText}>Send Test SMS</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Presets Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Test Presets</Text>
            <Text style={styles.sectionSubtitle}>
              Tap any preset to use it as your test SMS
            </Text>
            
            {presets.map((preset, index) => (
              <PresetCard key={index} preset={preset} />
            ))}
          </View>

          {/* Status Indicators */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What Gets Tested</Text>
            
            <View style={styles.checklistItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
              <Text style={styles.checklistText}>SMS filter matching</Text>
            </View>
            
            <View style={styles.checklistItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
              <Text style={styles.checklistText}>Email configuration validity</Text>
            </View>
            
            <View style={styles.checklistItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
              <Text style={styles.checklistText}>SMTP connection and authentication</Text>
            </View>
            
            <View style={styles.checklistItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
              <Text style={styles.checklistText}>Email delivery to recipient</Text>
            </View>
            
            <View style={styles.checklistItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
              <Text style={styles.checklistText}>Log entry creation</Text>
            </View>
          </View>

          {/* Tips */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>Testing Tips</Text>
            <Text style={styles.tipsText}>
              • Make sure your email configuration is set up first{'\n'}
              • Check your spam/junk folder if emails don't arrive{'\n'}
              • Use different senders to test your filters{'\n'}
              • View the logs after testing to see detailed results{'\n'}
              • Test with both filtered and unfiltered content
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  flex: {
    flex: 1,
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
  infoCard: {
    backgroundColor: '#e3f2fd',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#1565c0',
    lineHeight: 18,
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
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
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  testButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  presetCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  presetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  presetName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  presetSender: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  presetContent: {
    fontSize: 12,
    color: '#555',
    lineHeight: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checklistText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  tipsCard: {
    backgroundColor: '#fff3e0',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    marginBottom: 40,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f57c00',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 12,
    color: '#ef6c00',
    lineHeight: 18,
  },
});