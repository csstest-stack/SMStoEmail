import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-areas-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Constants from 'expo-constants';

interface SMSFilter {
  id: string;
  name: string;
  filter_type: string;
  filter_value?: string;
  enabled: boolean;
  created_at: string;
}

export default function FiltersScreen() {
  const [filters, setFilters] = useState<SMSFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFilter, setEditingFilter] = useState<SMSFilter | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    filter_type: 'all',
    filter_value: '',
  });

  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/filters`);
      const data = await response.json();
      setFilters(data);
    } catch (error) {
      console.error('Failed to load filters:', error);
      Alert.alert('Error', 'Failed to load filters');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingFilter(null);
    setFormData({
      name: '',
      filter_type: 'all',
      filter_value: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (filter: SMSFilter) => {
    setEditingFilter(filter);
    setFormData({
      name: filter.name,
      filter_type: filter.filter_type,
      filter_value: filter.filter_value || '',
    });
    setModalVisible(true);
  };

  const saveFilter = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Please enter a filter name');
      return;
    }

    if (formData.filter_type !== 'all' && !formData.filter_value.trim()) {
      Alert.alert('Validation Error', 'Please enter a filter value');
      return;
    }

    try {
      const filterData = {
        name: formData.name,
        filter_type: formData.filter_type,
        filter_value: formData.filter_type === 'all' ? null : formData.filter_value,
        enabled: true,
      };

      let response;
      if (editingFilter) {
        // Update existing filter
        response = await fetch(`${backendUrl}/api/filters/${editingFilter.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(filterData),
        });
      } else {
        // Create new filter
        response = await fetch(`${backendUrl}/api/filters`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(filterData),
        });
      }

      if (response.ok) {
        setModalVisible(false);
        loadFilters();
        Alert.alert('Success', `Filter ${editingFilter ? 'updated' : 'created'} successfully`);
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save filter');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save filter');
    }
  };

  const toggleFilter = async (filter: SMSFilter) => {
    try {
      const response = await fetch(`${backendUrl}/api/filters/${filter.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: !filter.enabled }),
      });

      if (response.ok) {
        loadFilters();
      } else {
        throw new Error('Failed to toggle filter');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle filter');
    }
  };

  const deleteFilter = async (filter: SMSFilter) => {
    Alert.alert(
      'Delete Filter',
      `Are you sure you want to delete "${filter.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${backendUrl}/api/filters/${filter.id}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                loadFilters();
                Alert.alert('Success', 'Filter deleted successfully');
              } else {
                throw new Error('Failed to delete filter');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete filter');
            }
          },
        },
      ]
    );
  };

  const getFilterTypeIcon = (type: string) => {
    switch (type) {
      case 'all':
        return 'apps-outline';
      case 'sender':
        return 'person-outline';
      case 'keyword':
        return 'search-outline';
      default:
        return 'filter-outline';
    }
  };

  const getFilterTypeLabel = (type: string) => {
    switch (type) {
      case 'all':
        return 'Forward All SMS';
      case 'sender':
        return 'From Sender';
      case 'keyword':
        return 'Contains Keyword';
      default:
        return type;
    }
  };

  const FilterCard = ({ filter }: { filter: SMSFilter }) => (
    <View style={[styles.filterCard, !filter.enabled && styles.disabledCard]}>
      <View style={styles.filterHeader}>
        <View style={styles.filterInfo}>
          <View style={styles.filterTitleRow}>
            <Ionicons 
              name={getFilterTypeIcon(filter.filter_type) as any} 
              size={20} 
              color={filter.enabled ? '#2196F3' : '#999'} 
            />
            <Text style={[styles.filterName, !filter.enabled && styles.disabledText]}>
              {filter.name}
            </Text>
          </View>
          <Text style={[styles.filterType, !filter.enabled && styles.disabledText]}>
            {getFilterTypeLabel(filter.filter_type)}
          </Text>
          {filter.filter_value && (
            <Text style={[styles.filterValue, !filter.enabled && styles.disabledText]}>
              Value: "{filter.filter_value}"
            </Text>
          )}
        </View>
        
        <View style={styles.filterActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleFilter(filter)}
          >
            <Ionicons
              name={filter.enabled ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={filter.enabled ? '#4CAF50' : '#999'}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(filter)}
          >
            <Ionicons name="create-outline" size={20} color="#FF9800" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => deleteFilter(filter)}
          >
            <Ionicons name="trash-outline" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const FilterTypeButton = ({ type, label }: { type: string; label: string }) => (
    <TouchableOpacity
      style={[
        styles.typeButton,
        formData.filter_type === type && styles.activeTypeButton,
      ]}
      onPress={() => setFormData({ ...formData, filter_type: type })}
    >
      <Text
        style={[
          styles.typeButtonText,
          formData.filter_type === type && styles.activeTypeButtonText,
        ]}
      >
        {label}
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
        <Text style={styles.title}>SMS Filters</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color="#2196F3" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>How Filters Work</Text>
            <Text style={styles.infoText}>
              • If no filters are active, all SMS will be forwarded{'\n'}
              • "Forward All SMS" will forward every message{'\n'}
              • "From Sender" will forward SMS from specific phone numbers{'\n'}
              • "Contains Keyword" will forward SMS containing specific words
            </Text>
          </View>
        </View>

        {/* Filters List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading filters...</Text>
          </View>
        ) : filters.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="filter-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Filters Yet</Text>
            <Text style={styles.emptyText}>
              Create your first filter to control which SMS messages get forwarded to your email.
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={openAddModal}>
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.createButtonText}>Create Filter</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filters.map((filter) => <FilterCard key={filter.id} filter={filter} />)
        )}
      </ScrollView>

      {/* Add/Edit Filter Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingFilter ? 'Edit Filter' : 'Add New Filter'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Filter Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Enter filter name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Filter Type</Text>
                <View style={styles.typeButtonContainer}>
                  <FilterTypeButton type="all" label="Forward All SMS" />
                  <FilterTypeButton type="sender" label="From Sender" />
                  <FilterTypeButton type="keyword" label="Contains Keyword" />
                </View>
              </View>

              {formData.filter_type !== 'all' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    {formData.filter_type === 'sender' 
                      ? 'Phone Number or Name' 
                      : 'Keyword or Phrase'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={formData.filter_value}
                    onChangeText={(text) => setFormData({ ...formData, filter_value: text })}
                    placeholder={
                      formData.filter_type === 'sender'
                        ? 'e.g., +1234567890 or John'
                        : 'e.g., urgent, bank, otp'
                    }
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveFilter}
              >
                <Text style={styles.saveButtonText}>
                  {editingFilter ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  addButton: {
    padding: 8,
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
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  filterCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledCard: {
    opacity: 0.6,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  filterInfo: {
    flex: 1,
  },
  filterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  filterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  filterType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  filterValue: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  disabledText: {
    color: '#999',
  },
  filterActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    maxHeight: 400,
  },
  formGroup: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
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
  typeButtonContainer: {
    flexDirection: 'column',
  },
  typeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  activeTypeButton: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  activeTypeButtonText: {
    color: '#2196F3',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#2196F3',
    marginLeft: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  saveButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});