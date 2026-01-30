import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Trocado para ícones mais modernos
import { AuthContext, AuthProvider } from './context/AuthContext';
import { ThemeProvider, ThemeContext } from './context/ThemeContext';
import { ActivityIndicator, View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';

import HomeScreen from './screens/HomeScreen';
import ExpensesScreen from './screens/ExpensesScreen';
import PlanningScreen from './screens/PlanningScreen';
import ReportsScreen from './screens/ReportsScreen';
import LoginScreen from './screens/LoginScreen';
import DividasScreen from './screens/DividasScreen';
import RegisterScreen from './screens/RegisterScreen';
import AccountScreen from './screens/AccountScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

/**
 * AppTabs: Configuração da barra de navegação inferior (Bottom Tab)
 * Estilo Premium: Ícones dinâmicos, sombras projetadas e integração total com tema Dark.
 */
function AppTabs() {
  const { logout } = useContext(AuthContext);
  const { theme, isDarkTheme } = useContext(ThemeContext);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Estilização da Barra Inferior
        tabBarStyle: {
          backgroundColor: isDarkTheme ? '#121212' : '#ffffff', // Fundo escuro real para o Modo Black
          borderTopWidth: 0,
          height: Platform.OS === 'android' ? 75 : 85, // Mais altura para respiro visual
          paddingBottom: Platform.OS === 'android' ? 12 : 30,
          paddingTop: 10,
          elevation: 25, // Sombra forte no Android
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
        },
        // Configuração de cores dos ícones e textos
        tabBarActiveTintColor: theme.primary, // Cor roxa/laranja conforme o tema
        tabBarInactiveTintColor: theme.subText,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: 'bold',
          marginBottom: 5,
        },
        headerShown: false, // Usamos os cabeçalhos personalizados de cada tela

        // Ícones Dinâmicos (Preenchidos quando focados)
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          const iconSize = focused ? 30 : 26; // Efeito de zoom no ícone ativo

          if (route.name === 'Home') {
            iconName = focused ? 'home-variant' : 'home-variant-outline';
          } else if (route.name === 'Despesas') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Dívidas') {
            iconName = focused ? 'credit-card-remove' : 'credit-card-remove-outline';
          } else if (route.name === 'Metas') {
            iconName = focused ? 'star' : 'star-outline';
          } else if (route.name === 'Relatórios') {
            iconName = focused ? 'chart-box' : 'chart-box-outline';
          } else if (route.name === 'Conta') {
            iconName = focused ? 'account-circle' : 'account-circle-outline';
          }
          
          return <MaterialCommunityIcons name={iconName} size={iconSize} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Despesas" component={ExpensesScreen} />
      <Tab.Screen name="Dívidas" component={DividasScreen} />
      <Tab.Screen name="Metas" component={PlanningScreen} />
      <Tab.Screen name="Relatórios" component={ReportsScreen} />
      <Tab.Screen name="Conta" component={AccountScreen} />
    </Tab.Navigator>
  );
}

// --- Função AuthStack (Estilizada para Login/Registro) ---
function AuthStack() {
  const { theme } = useContext(ThemeContext);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// --- Navegador Raiz ---
function AppNav() {
  const { userToken, isLoading } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {userToken !== null ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

// Estilos de Container Principal
const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...Platform.select({
      web: {
        height: '100%',
      },
    }),
  },
});

// Componente Principal
export default function App() {
  return (
    <PaperProvider>
      <ThemeProvider>
        <AuthProvider>
          <View style={styles.container}>
            <AppNav />
          </View>
        </AuthProvider>
      </ThemeProvider>
    </PaperProvider>
  );
}
