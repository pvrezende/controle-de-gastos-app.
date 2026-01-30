// frontend/screens/LoginScreen.js

import React, { useState, useContext, useRef } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    StyleSheet, 
    Alert, 
    TouchableOpacity, 
    ActivityIndicator, 
    Dimensions,
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { 
    Button, 
    Surface, 
    Avatar, 
    IconButton, 
    Title, 
    Paragraph 
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * TELA: LoginScreen
 * Objetivo: Autenticação de usuários no sistema Controle de Gastos.
 * Design Premium: Bordas coloridas, suporte a Modo Black/Light e inputs estilizados.
 */
export default function LoginScreen({ navigation }) {
    // Estados de Formulário
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Estados de Foco (Para bordas dinâmicas)
    const [isUserFocused, setIsUserFocused] = useState(false);
    const [isPassFocused, setIsPassFocused] = useState(false);

    // Contextos Globais
    const { login } = useContext(AuthContext);
    const { theme, isDarkTheme, toggleTheme } = useContext(ThemeContext);

    // Animação de Entrada
    const fadeAnim = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    /**
     * handleLogin: Valida e processa a autenticação com o backend.
     */
    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) {
            Alert.alert('Atenção', 'Por favor, preencha o nome de usuário e a senha para entrar.');
            return;
        }

        setIsLoading(true);
        try {
            // Comunicação com o servidor RDS via Contexto
            await login(username.trim(), password);
        } catch (error) {
            Alert.alert('Falha no Login', 'Usuário ou senha incorretos. Tente novamente.');
            console.error('Erro de autenticação:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Estilos Dinâmicos que respeitam o Tema e evitam fundos brancos
    const styles = StyleSheet.create({
        mainContainer: { 
            flex: 1, 
            backgroundColor: theme.background 
        },
        scrollContent: { 
            flexGrow: 1, 
            justifyContent: 'center', 
            padding: 25 
        },
        toggleArea: { 
            position: 'absolute', 
            top: 50, 
            right: 20, 
            zIndex: 10 
        },
        headerSection: { 
            alignItems: 'center', 
            marginBottom: 40 
        },
        logoAvatar: { 
            backgroundColor: theme.primary, 
            elevation: 8,
            marginBottom: 20
        },
        appTitle: { 
            fontSize: 32, 
            fontWeight: '900', 
            color: theme.text,
            textAlign: 'center'
        },
        appSubtitle: { 
            color: theme.subText, 
            fontSize: 14, 
            textAlign: 'center',
            letterSpacing: 1
        },
        formCard: {
            padding: 30,
            borderRadius: 35,
            backgroundColor: theme.cardBackground,
            elevation: 10,
            borderLeftWidth: 10,
            borderLeftColor: theme.primary
        },
        inputLabel: {
            fontSize: 12,
            fontWeight: 'bold',
            color: theme.subText,
            marginBottom: 8,
            marginLeft: 5
        },
        inputWrapper: {
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 2,
            borderRadius: 18,
            paddingHorizontal: 15,
            height: 60,
            marginBottom: 20,
            backgroundColor: isDarkTheme ? '#1e1e1e' : '#f9f9f9',
            borderColor: theme.subText + '30'
        },
        inputFocused: {
            borderColor: theme.primary
        },
        textInput: {
            flex: 1,
            color: theme.text,
            fontSize: 16,
            marginLeft: 10
        },
        loginButton: {
            height: 55,
            borderRadius: 18,
            justifyContent: 'center',
            marginTop: 10,
            elevation: 4
        },
        registerLink: {
            marginTop: 25,
            alignItems: 'center'
        },
        linkText: {
            color: theme.secondary,
            fontWeight: 'bold',
            fontSize: 15
        },
        loadingOverlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100
        }
    });

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.mainContainer}
        >
            {/* BOTÃO DE TEMA (MODO BLACK / LIGHT) */}
            <View style={styles.toggleArea}>
                <IconButton 
                    icon={isDarkTheme ? "weather-sunny" : "moon-waning-crescent"} 
                    iconColor={isDarkTheme ? "#FBC02D" : theme.text}
                    size={28}
                    onPress={toggleTheme}
                    style={{ backgroundColor: theme.cardBackground }}
                />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View style={{ opacity: fadeAnim }}>
                    
                    {/* CABEÇALHO COM LOGO */}
                    <View style={styles.headerSection}>
                        <Avatar.Icon 
                            size={100} 
                            icon="wallet-membership" 
                            style={styles.logoAvatar} 
                            color="white" 
                        />
                        <Title style={styles.appTitle}>Gestão Pro</Title>
                        <Paragraph style={styles.appSubtitle}>CONTROLE SEUS GASTOS COM INTELIGÊNCIA</Paragraph>
                    </View>

                    {/* FORMULÁRIO ESTILIZADO */}
                    <Surface style={styles.formCard}>
                        {/* CAMPO: USUÁRIO */}
                        <Text style={styles.inputLabel}>IDENTIFICAÇÃO</Text>
                        <View style={[styles.inputWrapper, isUserFocused && styles.inputFocused]}>
                            <MaterialCommunityIcons name="account-circle-outline" size={24} color={isUserFocused ? theme.primary : theme.subText} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Nome de usuário"
                                placeholderTextColor={theme.subText}
                                value={username}
                                onChangeText={setUsername}
                                onFocus={() => setIsUserFocused(true)}
                                onBlur={() => setIsUserFocused(false)}
                                autoCapitalize="none"
                            />
                        </View>

                        {/* CAMPO: SENHA */}
                        <Text style={styles.inputLabel}>SENHA DE ACESSO</Text>
                        <View style={[styles.inputWrapper, isPassFocused && styles.inputFocused]}>
                            <MaterialCommunityIcons name="lock-outline" size={24} color={isPassFocused ? theme.primary : theme.subText} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="••••••••"
                                placeholderTextColor={theme.subText}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!isPasswordVisible}
                                onFocus={() => setIsPassFocused(true)}
                                onBlur={() => setIsPassFocused(false)}
                            />
                            <IconButton 
                                icon={isPasswordVisible ? "eye-off" : "eye"} 
                                iconColor={theme.subText}
                                size={20}
                                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                            />
                        </View>

                        {/* BOTÃO ENTRAR */}
                        <Button 
                            mode="contained" 
                            onPress={handleLogin} 
                            style={styles.loginButton}
                            labelStyle={{ fontWeight: 'bold', fontSize: 16 }}
                            buttonColor={theme.primary}
                        >
                            ACESSAR CONTA
                        </Button>

                        {/* LINK PARA CADASTRO */}
                        <TouchableOpacity 
                            style={styles.registerLink} 
                            onPress={() => navigation.navigate('Register')}
                        >
                            <Text style={{ color: theme.text, fontSize: 14 }}>
                                Novo por aqui? <Text style={styles.linkText}>Crie sua conta</Text>
                            </Text>
                        </TouchableOpacity>
                    </Surface>

                    {/* RODAPÉ INFORMATIVO */}
                    <Text style={{ textAlign: 'center', color: theme.subText, marginTop: 40, fontSize: 11 }}>
                        Desenvolvido por Paulo Rezende • v2.0 Premium
                    </Text>
                </Animated.View>
            </ScrollView>

            {/* OVERLAY DE CARREGAMENTO */}
            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={{ color: 'white', marginTop: 15, fontWeight: 'bold' }}>Autenticando...</Text>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}
