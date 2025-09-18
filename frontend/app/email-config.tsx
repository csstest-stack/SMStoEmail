import React, { useState, useEffect } from 'react';
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

interface EmailConfig {
  email_type: string;
  smtp_server?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string;
  use_tls: boolean;
  recipient_email: string;
  sender_name: string;
}

export default function EmailConfigScreen() {
  const [activeTab, setActiveTab] = useState('smtp');
  const [config, setConfig] = useState<EmailConfig>({
    email_type: 'smtp',
    smtp_server: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    use_tls: true,
    recipient_email: '',
    sender_name: 'SMS Forwarder',
  });
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    loadEmailConfig();
  }, []);

  const loadEmailConfig = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/email/config`);
      const data = await response.json();
      
      if (data.status === 'configured' && data.config) {
        setConfig({
          ...data.config,
          smtp_password: '', // Don't prefill password for security
        });
        setActiveTab(data.config.email_type || 'smtp');
      }
    } catch (error) {
      console.error('Failed to load email config:', error);
    }
  };

  const saveEmailConfig = async () => {
    if (!config.recipient_email) {
      Alert.alert('Validation Error', 'Please enter a recipient email address');
      return;
    }

    if (activeTab === 'smtp') {
      if (!config.smtp_server || !config.smtp_username || !config.smtp_password) {
        Alert.alert('Validation Error', 'Please fill in all SMTP fields');
        return;
      }
    }

    setLoading(true);
    try {
      const configToSave = {
        ...config,
        email_type: activeTab,
      };

      const response = await fetch(`${backendUrl}/api/email/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configToSave),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Email configuration saved successfully');
      } else {
        throw new Error(result.detail || 'Failed to save configuration');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const testEmailConfig = async () => {
    if (!config.recipient_email) {
      Alert.alert('Validation Error', 'Please enter a recipient email address first');
      return;
    }

    setTestLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/email/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient_email: config.recipient_email,
          test_message: 'This is a test message from SMS Mail Forwarder to verify your email configuration is working correctly.',
        }),
      });

      const result = await response.json();

      if (result.status === 'sent') {
        Alert.alert('Test Successful', 'Test email sent successfully! Check your inbox.');
      } else {
        Alert.alert('Test Failed', result.message || 'Failed to send test email');
      }
    } catch (error) {
      Alert.alert('Test Error', error instanceof Error ? error.message : 'Failed to test email configuration');
    } finally {
      setTestLoading(false);
    }
  };

  const getProviderPresets = (provider: string) => {
    const presets: { [key: string]: Partial<EmailConfig> } = {
      gmail: {
        smtp_server: 'smtp.gmail.com',
        smtp_port: 587,
        use_tls: true,
      },
      outlook: {
        smtp_server: 'smtp-mail.outlook.com',
        smtp_port: 587,
        use_tls: true,
      },
      yahoo: {
        smtp_server: 'smtp.mail.yahoo.com',
        smtp_port: 587,
        use_tls: true,
      },
    };

    if (presets[provider]) {
      setConfig({ ...config, ...presets[provider] });
      Alert.alert('Preset Applied', `${provider.charAt(0).toUpperCase() + provider.slice(1)} settings have been applied`);
    }
  };

  const TabButton = ({ id, title, icon }: { id: string; title: string; icon: string }) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === id && styles.activeTabButton]}
      onPress={() => setActiveTab(id)}
    >
      <Ionicons name={icon as any} size={20} color={activeTab === id ? '#2196F3' : '#666'} />
      <Text style={[styles.tabText, activeTab === id && styles.activeTabText]}>{title}</Text>
    </TouchableOpacity>
  );

  const PresetButton = ({ provider, title }: { provider: string; title: string }) => (
    <TouchableOpacity
      style={styles.presetButton}
      onPress={() => getProviderPresets(provider)}
    >
      <Text style={styles.presetButtonText}>{title}</Text>
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
        <Text style={styles.title}>Email Configuration</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView 
        style={styles.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Email Type Tabs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Email Integration Method</Text>
            <View style={styles.tabContainer}>
              <TabButton id="smtp" title="SMTP" icon="mail-outline" />
              <TabButton id="emergent" title="Emergent LLM" icon="cloud-outline" />
              <TabButton id="device" title="Device Email" icon="phone-portrait-outline" />
            </View>
          </View>

          {/* Recipient Email (common field) */}
          <View style={styles.section}>
            <Text style={styles.label}>Recipient Email</Text>
            <TextInput
              style={styles.input}
              value={config.recipient_email}
              onChangeText={(text) => setConfig({ ...config, recipient_email: text })}
              placeholder="your-email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* SMTP Configuration */}
          {activeTab === 'smtp' && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>SMTP Settings</Text>
                
                {/* Quick Presets */}
                <Text style={styles.subLabel}>Quick Setup</Text>
                <View style={styles.presetContainer}>
                  <PresetButton provider="gmail" title="Gmail" />
                  <PresetButton provider="outlook" title="Outlook" />
                  <PresetButton provider="yahoo" title="Yahoo" />
                </View>

                <Text style={styles.label}>SMTP Server</Text>
                <TextInput
                  style={styles.input}
                  value={config.smtp_server}
                  onChangeText={(text) => setConfig({ ...config, smtp_server: text })}
                  placeholder="smtp.gmail.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.label}>SMTP Port</Text>
                <TextInput
                  style={styles.input}
                  value={config.smtp_port?.toString()}
                  onChangeText={(text) => setConfig({ ...config, smtp_port: parseInt(text) || 587 })}
                  placeholder="587"
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Username/Email</Text>
                <TextInput
                  style={styles.input}
                  value={config.smtp_username}
                  onChangeText={(text) => setConfig({ ...config, smtp_username: text })}
                  placeholder="your-email@gmail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.label}>Password/App Password</Text>
                <TextInput
                  style={styles.input}
                  value={config.smtp_password}
                  onChangeText={(text) => setConfig({ ...config, smtp_password: text })}
                  placeholder="your-app-password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.label}>Sender Name</Text>
                <TextInput
                  style={styles.input}
                  value={config.sender_name}
                  onChangeText={(text) => setConfig({ ...config, sender_name: text })}
                  placeholder="SMS Forwarder"
                />

                <View style={styles.checkboxContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setConfig({ ...config, use_tls: !config.use_tls })}
                  >
                    <Ionicons
                      name={config.use_tls ? 'checkbox' : 'checkbox-outline'}
                      size={24}
                      color="#2196F3"
                    />
                    <Text style={styles.checkboxText}>Use TLS Encryption</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* SMTP Help */}
              <View style={styles.helpCard}>
                <Text style={styles.helpTitle}>SMTP Setup Tips</Text>
                <Text style={styles.helpText}>
                  • For Gmail: Enable 2-factor authentication and use an App Password{'\n'}
                  • For Outlook: Use your Microsoft account password or App Password{'\n'}
                  • Port 587 is recommended for TLS encryption{'\n'}
                  • Make sure "Less secure app access" is enabled if required
                </Text>
              </View>
            </>
          )}

          {/* Emergent LLM Integration */}
          {activeTab === 'emergent' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Emergent LLM Integration</Text>
              <View style={styles.comingSoonCard}>
                <Ionicons name="construct-outline" size={48} color="#FF9800" />
                <Text style={styles.comingSoonTitle}>Coming Soon</Text>
                <Text style={styles.comingSoonText}>
                  Emergent LLM integration for email sending will be available in a future update.
                </Text>
              </View>
            </View>
          )}

          {/* Device Email Integration */}
          {activeTab === 'device' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Device Email Integration</Text>
              <View style={styles.comingSoonCard}>
                <Ionicons name="construct-outline" size={48} color="#FF9800" />
                <Text style={styles.comingSoonTitle}>Coming Soon</Text>
                <Text style={styles.comingSoonText}>
                  Integration with your device's default email app will be available in a future update.
                </Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.button, styles.testButton]}
              onPress={testEmailConfig}
              disabled={testLoading}
            >
              {testLoading ? (
                <Text style={styles.buttonText}>Testing...</Text>
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={20} color="white" />
                  <Text style={styles.buttonText}>Test Email</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={saveEmailConfig}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.buttonText}>Saving...</Text>
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="white" />
                  <Text style={styles.buttonText}>Save Configuration</Text>
                </>
              )}
            </TouchableOpacity>
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
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2196F3',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
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
  presetContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  presetButton: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  presetButtonText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '500',
  },
  checkboxContainer: {
    marginTop: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  helpCard: {
    backgroundColor: '#fff3e0',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f57c00',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#ef6c00',
    lineHeight: 18,
  },
  comingSoonCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionSection: {
    padding: 16,
    paddingBottom: 40,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  testButton: {
    backgroundColor: '#FF9800',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});