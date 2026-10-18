import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color = '#10B981' }) => {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginHorizontal: 4,
  },
  icon: {
    fontSize: 28,
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default StatCard;
