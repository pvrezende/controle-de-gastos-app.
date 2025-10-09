import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext, AuthProvider } from './context/AuthContext';
import { ThemeProvider, ThemeContext } from './context/ThemeContext'; // Importe ThemeProvider e ThemeContext
import { ActivityIndicator, View, TouchableOpacity } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';

import HomeScreen from './screens/HomeScreen';
import ExpensesScreen from './screens/ExpensesScreen';
import PlanningScreen from './screens/PlanningScreen';
import ReportsScreen from './screens/ReportsScreen';
import LoginScreen from './screens/LoginScreen';
import DividasScreen from './screens/DividasScreen';
import RegisterScreen from './screens/RegisterScreen';

// Importe a nova tela de Conta
import AccountScreen from './screens/AccountScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function AppTabs() {
  const { logout } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext); // Use o contexto do tema

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Despesas') iconName = focused ? 'wallet' : 'wallet-outline';
          else if (route.name === 'Dívidas') iconName = focused ? 'card' : 'card-outline';
          else if (route.name === 'Metas') iconName = focused ? 'star' : 'star-outline';
          else if (route.name === 'Relatórios') iconName = focused ? 'document-text' : 'document-text-outline';
          else if (route.name === 'Conta') iconName = focused ? 'person-circle' : 'person-circle-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'tomato',
        tabBarInactiveTintColor: 'gray',
        headerRight: () => (
          <TouchableOpacity onPress={logout} style={{ marginRight: 15 }}>
            <Ionicons name="log-out-outline" size={24} color="tomato" />
          </TouchableOpacity>
        ),
        tabBarLabelStyle: { fontSize: 10 },
        tabBarStyle: {
            backgroundColor: theme.cardBackground // Define a cor de fundo da barra de navegação
        },
        headerStyle: {
            backgroundColor: theme.cardBackground // Define a cor de fundo do cabeçalho
        },
        headerTintColor: theme.text // Define a cor do texto do cabeçalho
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Despesas" component={ExpensesScreen} />
      <Tab.Screen name="Dívidas" component={DividasScreen} />
      <Tab.Screen name="Metas" component={PlanningScreen} />
      <Tab.Screen name="Conta" component={AccountScreen} />
      <Tab.Screen name="Relatórios" component={ReportsScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  const { theme } = useContext(ThemeContext); // Use o contexto do tema

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppNav() {
  const { userToken, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {userToken !== null ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <PaperProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppNav />
        </AuthProvider>
      </ThemeProvider>
    </PaperProvider>
  );
}