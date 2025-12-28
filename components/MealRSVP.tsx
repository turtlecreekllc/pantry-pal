import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useHouseholdContext } from '../context/HouseholdContext';
import { MealRSVP as MealRSVPType, RSVPStatus, MealAssignment, HouseholdMember } from '../lib/types';
import {
  getMealRSVPs,
  getUserRSVP,
  upsertRSVP,
  getMealAssignments,
  assignMealToCook,
  removeAssignment,
} from '../lib/rsvpService';

interface MealRSVPProps {
  /** Meal plan ID */
  mealPlanId: string;
  /** Recipe name for display */
  recipeName?: string;
  /** Default servings for the meal */
  defaultServings?: number;
  /** Callback when RSVP changes */
  onRSVPChange?: (summary: { attending: number; servings: number }) => void;
}

const RSVP_OPTIONS: { status: RSVPStatus; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { status: 'attending', label: "I'm in!", icon: 'checkmark-circle', color: '#4CAF50' },
  { status: 'maybe', label: 'Maybe', icon: 'help-circle', color: '#FF9800' },
  { status: 'not_attending', label: "Can't make it", icon: 'close-circle', color: '#f44336' },
];

/**
 * RSVP component for meal plans - allows members to indicate attendance
 */
export function MealRSVP({ mealPlanId, recipeName, defaultServings = 4, onRSVPChange }: MealRSVPProps) {
  const { user } = useAuth();
  const { activeHousehold, hasPermission } = useHouseholdContext();
  const [rsvps, setRSVPs] = useState<MealRSVPType[]>([]);
  const [assignments, setAssignments] = useState<MealAssignment[]>([]);
  const [userRSVP, setUserRSVP] = useState<MealRSVPType | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const isHousehold = !!activeHousehold;
  const canAssign = hasPermission('canEditMeals');

  const loadData = useCallback(async () => {
    if (!isHousehold) {
      setLoading(false);
      return;
    }
    try {
      const [allRSVPs, myRSVP, allAssignments] = await Promise.all([
        getMealRSVPs(mealPlanId),
        user ? getUserRSVP({ mealPlanId, userId: user.id }) : Promise.resolve(null),
        getMealAssignments(mealPlanId),
      ]);
      setRSVPs(allRSVPs);
      setUserRSVP(myRSVP);
      setAssignments(allAssignments);
      const attending = allRSVPs.filter((r) => r.status === 'attending');
      onRSVPChange?.({
        attending: attending.length,
        servings: attending.reduce((sum, r) => sum + (r.servings || 1), 0),
      });
    } catch (err) {
      console.error('Failed to load RSVP data:', err);
    } finally {
      setLoading(false);
    }
  }, [mealPlanId, isHousehold, user, onRSVPChange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRSVP = async (status: RSVPStatus) => {
    if (!user) return;
    setSubmitting(true);
    try {
      await upsertRSVP({
        mealPlanId,
        userId: user.id,
        status,
        servings: 1,
      });
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update RSVP';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async (member: HouseholdMember) => {
    if (!user) return;
    try {
      await assignMealToCook({
        mealPlanId,
        userId: member.user_id,
        assignedBy: user.id,
      });
      setShowAssignModal(false);
      await loadData();
      Alert.alert('Assigned', `${member.user_email?.split('@')[0] || 'Member'} has been assigned to cook.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to assign';
      Alert.alert('Error', message);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      await removeAssignment(assignmentId);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove assignment';
      Alert.alert('Error', message);
    }
  };

  if (!isHousehold || loading) {
    return null;
  }

  const attending = rsvps.filter((r) => r.status === 'attending');
  const maybe = rsvps.filter((r) => r.status === 'maybe');
  const notAttending = rsvps.filter((r) => r.status === 'not_attending');
  const totalServings = attending.reduce((sum, r) => sum + (r.servings || 1), 0);
  const isAssigned = assignments.some((a) => a.user_id === user?.id);

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Who's eating?</Text>
          <TouchableOpacity onPress={() => setShowDetails(true)} style={styles.detailsButton}>
            <Text style={styles.detailsButtonText}>
              {attending.length} attending • {totalServings} servings
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>
        </View>
        <View style={styles.rsvpButtons}>
          {RSVP_OPTIONS.map((option) => {
            const isSelected = userRSVP?.status === option.status;
            return (
              <TouchableOpacity
                key={option.status}
                style={[
                  styles.rsvpButton,
                  isSelected && { backgroundColor: option.color + '20', borderColor: option.color },
                ]}
                onPress={() => handleRSVP(option.status)}
                disabled={submitting}
              >
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={isSelected ? option.color : '#999'}
                />
                <Text style={[styles.rsvpButtonText, isSelected && { color: option.color }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {assignments.length > 0 && (
          <View style={styles.assignmentBanner}>
            <Ionicons name="restaurant" size={16} color="#9C27B0" />
            <Text style={styles.assignmentText}>
              Cooking: {assignments.map((a) => a.user_email?.split('@')[0] || 'Member').join(', ')}
              {isAssigned && ' (You!)'}
            </Text>
          </View>
        )}
        {canAssign && (
          <TouchableOpacity style={styles.assignButton} onPress={() => setShowAssignModal(true)}>
            <Ionicons name="person-add-outline" size={16} color="#9C27B0" />
            <Text style={styles.assignButtonText}>Assign Cook</Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Details Modal */}
      <Modal
        visible={showDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>RSVP Details</Text>
              <TouchableOpacity onPress={() => setShowDetails(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {attending.length > 0 && (
                <View style={styles.rsvpSection}>
                  <View style={styles.rsvpSectionHeader}>
                    <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                    <Text style={styles.rsvpSectionTitle}>Attending ({attending.length})</Text>
                  </View>
                  {attending.map((r) => (
                    <Text key={r.id} style={styles.rsvpName}>
                      {r.user_email?.split('@')[0] || 'Member'}
                      {r.servings && r.servings > 1 && ` (+${r.servings - 1})`}
                    </Text>
                  ))}
                </View>
              )}
              {maybe.length > 0 && (
                <View style={styles.rsvpSection}>
                  <View style={styles.rsvpSectionHeader}>
                    <Ionicons name="help-circle" size={18} color="#FF9800" />
                    <Text style={styles.rsvpSectionTitle}>Maybe ({maybe.length})</Text>
                  </View>
                  {maybe.map((r) => (
                    <Text key={r.id} style={styles.rsvpName}>
                      {r.user_email?.split('@')[0] || 'Member'}
                    </Text>
                  ))}
                </View>
              )}
              {notAttending.length > 0 && (
                <View style={styles.rsvpSection}>
                  <View style={styles.rsvpSectionHeader}>
                    <Ionicons name="close-circle" size={18} color="#f44336" />
                    <Text style={styles.rsvpSectionTitle}>Not Attending ({notAttending.length})</Text>
                  </View>
                  {notAttending.map((r) => (
                    <Text key={r.id} style={styles.rsvpName}>
                      {r.user_email?.split('@')[0] || 'Member'}
                    </Text>
                  ))}
                </View>
              )}
              {rsvps.length === 0 && (
                <Text style={styles.emptyText}>No RSVPs yet. Be the first!</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* Assign Modal */}
      <Modal
        visible={showAssignModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Cook</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {activeHousehold?.members.map((member) => {
                const isAssignedMember = assignments.some((a) => a.user_id === member.user_id);
                return (
                  <TouchableOpacity
                    key={member.id}
                    style={[styles.memberOption, isAssignedMember && styles.memberOptionAssigned]}
                    onPress={() => {
                      if (isAssignedMember) {
                        const assignment = assignments.find((a) => a.user_id === member.user_id);
                        if (assignment) handleRemoveAssignment(assignment.id);
                      } else {
                        handleAssign(member);
                      }
                    }}
                  >
                    <Text style={styles.memberName}>
                      {member.user_email?.split('@')[0] || 'Member'}
                      {member.user_id === user?.id && ' (You)'}
                    </Text>
                    {isAssignedMember && <Ionicons name="checkmark" size={20} color="#9C27B0" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: 13,
    color: '#666',
  },
  rsvpButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  rsvpButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 4,
  },
  rsvpButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  assignmentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  assignmentText: {
    fontSize: 13,
    color: '#9C27B0',
    flex: 1,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 8,
    gap: 6,
  },
  assignButtonText: {
    fontSize: 14,
    color: '#9C27B0',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalScroll: {
    padding: 16,
  },
  rsvpSection: {
    marginBottom: 20,
  },
  rsvpSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rsvpSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  rsvpName: {
    fontSize: 14,
    color: '#666',
    paddingLeft: 26,
    paddingVertical: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  memberOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberOptionAssigned: {
    backgroundColor: '#f3e5f5',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  memberName: {
    fontSize: 16,
    color: '#333',
  },
});

