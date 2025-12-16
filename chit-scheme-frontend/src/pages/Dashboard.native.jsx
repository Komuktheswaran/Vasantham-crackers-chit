import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Appbar, Card, Text, Button, Title, Paragraph } from 'react-native-paper';
import './css/Dashboard.native.css';

const Dashboard = ({ onLogout, user }) => {
  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.Content title="Dashboard" subtitle={`Welcome, ${user?.username || 'User'}`} />
        <Appbar.Action icon="logout" onPress={onLogout} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>Summary</Title>
            <Paragraph>This is a native dashboard placeholder.</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
            <Card.Content>
                <Title>Active Schemes</Title>
                <Paragraph>Chart placeholders will go here.</Paragraph>
            </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#ffffff',
    elevation: 4,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  }
});

export default Dashboard;
