import React, { useState } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { TextInput, Button, Text, Surface, useTheme, Title } from 'react-native-paper';
import { login } from '../services/authService';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const theme = useTheme();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const data = await login(username, password);
      // Wait a bit to show success? No, just callback
      if (onLogin && data.user) {
        onLogin(data.user);
      } else {
         Alert.alert('Error', 'Login successful but no user data received');
      }
    } catch (error) {
       console.error(error);
      Alert.alert('Login Failed', error.error || error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Surface style={styles.card}>
          <View style={styles.headerContainer}>
             <Text style={{ fontSize: 40, marginBottom: 10 }}>🎆</Text>
            <Title style={styles.title}>Vasantham Crackers</Title>
            <Text style={styles.subtitle}>Chit Scheme Management</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              style={styles.input}
              autoCapitalize="none"
              left={<TextInput.Icon icon="account" />}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={secureTextEntry}
              style={styles.input}
              right={
                <TextInput.Icon 
                  icon={secureTextEntry ? "eye-off" : "eye"} 
                  onPress={() => setSecureTextEntry(!secureTextEntry)} 
                />
              }
              left={<TextInput.Icon icon="lock" />}
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              style={styles.button}
              contentStyle={{ height: 50 }}
              disabled={loading}
            >
              Log In
            </Button>
          </View>

          <View style={styles.footer}>
            <Text variant="bodySmall" style={{ color: '#888' }}>
              MaDuSOFT Solutions © {new Date().getFullYear()}
            </Text>
          </View>
        </Surface>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    padding: 20,
  },
  keyboardView: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    borderRadius: 10,
    elevation: 4,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontWeight: 'bold',
    color: '#1890ff',
    marginTop: 10,
  },
  subtitle: {
    color: '#666',
    marginTop: 5,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 15,
    backgroundColor: 'white',
  },
  button: {
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: '#1890ff',
  },
  footer: {
    marginTop: 30,
  }
});

export default Login;
