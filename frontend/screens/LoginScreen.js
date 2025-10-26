// frontend/screens/LoginScreen.js

import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const { theme, isDarkTheme, toggleTheme } = useContext(ThemeContext);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Erro', 'Por favor, preencha o usuário e a senha.');
      return;
    }
    setIsLoading(true);
    try {
      await login(username, password);
    } catch (error) {
      Alert.alert('Erro no Login', 'Usuário ou senha inválidos.');
      console.error('Falha no login:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
      backgroundColor: theme.background,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 40,
      color: theme.text,
    },
    input: {
      height: 50,
      borderColor: theme.subText,
      borderWidth: 1,
      borderRadius: 8,
      marginBottom: 15,
      paddingHorizontal: 15,
      backgroundColor: theme.cardBackground,
      color: theme.text,
    },
    linkButton: {
      marginTop: 20,
    },
    linkText: {
      color: theme.secondary,
      textAlign: 'center',
    },
    toggleButton: {
      position: 'absolute',
      top: 50,
      right: 20,
      zIndex: 1,
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggleTheme} style={styles.toggleButton}>
        <Ionicons name={isDarkTheme ? "sunny-outline" : "moon-outline"} size={24} color={isDarkTheme ? "yellow" : "black"} />
      </TouchableOpacity>

      <Text style={styles.title}>Controle de Gastos</Text>
      <TextInput
        style={styles.input}
        placeholder="Usuário"
        placeholderTextColor={theme.subText}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor={theme.subText}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Entrar" onPress={handleLogin} />

      <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Register')}>
        <Text style={styles.linkText}>Não tem uma conta? Cadastre-se</Text>
      </TouchableOpacity>
    </View>
  );
}