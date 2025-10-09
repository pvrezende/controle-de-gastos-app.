// frontend/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config';

export const AuthContext = createContext();

// Crie e configure a instância do axios aqui, para que seja única e global
const api = axios.create({
  baseURL: API_URL,
});

// Adicione o interceptor de requisição para injetar o token
api.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (username, password) => {
    const response = await api.post('/login', {
      username,
      password,
    });
    const token = response.data.token;
    setUserToken(token);
    await AsyncStorage.setItem('userToken', token);
  };

  const register = async (username, password) => {
    const response = await api.post('/register', {
      username,
      password,
    });
    const token = response.data.token;
    setUserToken(token);
    await AsyncStorage.setItem('userToken', token);
  };

  const logout = async () => {
    setUserToken(null);
    await AsyncStorage.removeItem('userToken');
  };

  const deleteAccount = async () => {
    try {
      await api.delete('/usuario');
      await logout();
    } catch (error) {
      console.error('Erro ao excluir a conta:', error);
      throw error;
    }
  };

  const isLoggedIn = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      setUserToken(token);
      setIsLoading(false);
    } catch (e) {
      console.log(`isLoggedIn error ${e}`);
    }
  };

  useEffect(() => {
    isLoggedIn();
  }, []);

  return (
    <AuthContext.Provider value={{ login, logout, register, deleteAccount, userToken, isLoading, api }}>
      {children}
    </AuthContext.Provider>
  );
};