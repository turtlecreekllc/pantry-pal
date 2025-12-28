import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHouseholdContext } from '../context/HouseholdContext';

interface HouseholdSwitcherProps {
  visible: boolean;
  onClose: () => void;
  onCreateNew: () => void;
}

export function HouseholdSwitcher({ visible, onClose, onCreateNew }: HouseholdSwitcherProps) {
  const { households, activeHousehold, switchHousehold } = useHouseholdContext();

  const handleSwitch = async (id: string) => {
    await switchHousehold(id);
    onClose();
  };

  const handleCreateNew = () => {
    onClose();
    onCreateNew();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modal}>
              <View style={styles.header}>
                <Text style={styles.title}>Switch Household</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.list}>
                {households.map((household) => (
                  <TouchableOpacity
                    key={household.id}
                    style={[
                      styles.item,
                      activeHousehold?.id === household.id && styles.activeItem,
                    ]}
                    onPress={() => handleSwitch(household.id)}
                  >
                    <View style={styles.itemInfo}>
                      <Text
                        style={[
                          styles.itemName,
                          activeHousehold?.id === household.id && styles.activeItemText,
                        ]}
                      >
                        {household.name}
                      </Text>
                      <Text style={styles.itemRole}>
                        {household.current_user_role} • {household.member_count} members
                      </Text>
                    </View>
                    {activeHousehold?.id === household.id && (
                      <Ionicons name="checkmark" size={24} color="#4CAF50" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.createButton} onPress={handleCreateNew}>
                <Ionicons name="add" size={24} color="#4CAF50" />
                <Text style={styles.createButtonText}>Create New Household</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '60%',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  list: {
    padding: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
  },
  activeItem: {
    backgroundColor: '#e8f5e9',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  activeItemText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  itemRole: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
});
