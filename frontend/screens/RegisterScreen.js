// frontend/screens/RegisterScreen.js

import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext'; // Importado o ThemeContext

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext); // Obtém o objeto 'theme' do contexto

  const handleRegister = async () => {
    if (!username || !password || !confirmPassword) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }
    
    setIsLoading(true);
    try {
      await register(username, password);
      // O AuthContext cuidará da navegação após o login automático
    } catch (error) {
      const errorMessage = error.response?.data || 'Não foi possível completar o cadastro.';
      Alert.alert('Erro no Cadastro', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Os estilos agora são criados dentro do componente para acessar o 'theme'
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
      backgroundColor: theme.background, // ATUALIZADO
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 40,
      color: theme.text, // ATUALIZADO
    },
    input: {
      height: 50,
      borderColor: theme.subText, // ATUALIZADO
      borderWidth: 1,
      borderRadius: 8,
      marginBottom: 15,
      paddingHorizontal: 15,
      backgroundColor: theme.cardBackground, // ATUALIZADO
      color: theme.text, // ATUALIZADO
    },
    linkButton: {
      marginTop: 20,
    },
    linkText: {
      color: theme.primary, // ATUALIZADO
      textAlign: 'center',
    }
  });

  if (isLoading) {
    return (
      // O ActivityIndicator também precisa usar a cor do tema
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Criar Nova Conta</Text>
      <TextInput
        style={styles.input}
        placeholder="Nome de Usuário"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        placeholderTextColor={theme.subText} // ATUALIZADO
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor={theme.subText} // ATUALIZADO
      />
       <TextInput
        style={styles.input}
        placeholder="Confirmar Senha"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        placeholderTextColor={theme.subText} // ATUALIZADO
      />
      <Button title="Cadastrar e Entrar" onPress={handleRegister} color={theme.primary} />
      <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
        <Text style={styles.linkText}>Já tem uma conta? Faça login</Text>
      </TouchableOpacity>
    </View>
  );
}
