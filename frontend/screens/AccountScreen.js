// frontend/screens/AccountScreen.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Card, Button, Title, Paragraph, IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

export default function AccountScreen({ navigation }) {
    const { api, deleteAccount } = useContext(AuthContext);
    const { theme, isDarkTheme } = useContext(ThemeContext);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const [rendaModalVisible, setRendaModalVisible] = useState(false);
    const [inputRenda, setInputRenda] = useState('');

    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const fetchData = async () => {
        try {
            setRefreshing(true);
            const response = await api.get('/usuario');
            setUserData(response.data);
            setInputRenda(String(response.data.renda_mensal));
        } catch (error) {
            console.error('Erro ao buscar dados do usuário:', error);
            Alert.alert('Erro', 'Não foi possível carregar os dados do usuário.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };
    
    useFocusEffect(useCallback(() => { fetchData(); }, []));
    const onRefresh = () => fetchData();

    const handleUpdateRenda = async () => {
        const novaRenda = parseFloat(inputRenda);
        if (isNaN(novaRenda) || novaRenda < 0) {
            Alert.alert('Valor Inválido', 'Por favor, insira um número válido.');
            return;
        }
        try {
            await api.put('/usuario', { renda_mensal: novaRenda });
            Alert.alert('Sucesso', 'Renda mensal atualizada!');
            setRendaModalVisible(false);
            fetchData();
        } catch (error) {
            console.error('Erro ao atualizar a renda:', error);
            Alert.alert('Erro', 'Não foi possível atualizar a renda.');
        }
    };

    const handleUpdatePassword = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Erro', 'As senhas não coincidem.');
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert('Erro', 'A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        try {
            await api.put('/usuario/senha', { newPassword });
            Alert.alert('Sucesso', 'Senha alterada com sucesso!');
            setPasswordModalVisible(false);
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error('Erro ao atualizar a senha:', error);
            Alert.alert('Erro', 'Não foi possível atualizar a senha. Tente novamente.');
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Atenção",
            "Tem certeza que deseja excluir sua conta? Esta ação é irreversível e excluirá todos os seus dados.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Excluir Permanentemente",
                    onPress: async () => {
                        try {
                            await deleteAccount();
                        } catch (error) {
                            Alert.alert('Erro', 'Não foi possível excluir a conta. Tente novamente.');
                        }
                    },
                    style: "destructive"
                }
            ]
        );
    };

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        scrollViewContent: { padding: 20, paddingBottom: 80 },
        loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: theme.text },
        card: { marginBottom: 15, elevation: 3, backgroundColor: theme.cardBackground },
        label: { fontSize: 16, color: theme.subText },
        value: { fontSize: 24, fontWeight: 'bold', color: theme.text },
        row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        deleteButton: { marginTop: 30, borderColor: theme.danger, backgroundColor: isDarkTheme ? '#551111' : '#fff' },
        deleteButtonText: { color: theme.danger },
        modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)'},
        modalContent: { backgroundColor: theme.cardBackground, padding: 20, borderRadius: 10, width: '90%', elevation: 5 },
        modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: theme.text },
        input: { borderWidth: 1, borderColor: theme.subText, padding: 10, marginBottom: 20, borderRadius: 6, backgroundColor: isDarkTheme ? '#333' : '#fff', color: theme.text },
        buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 10},
        modalButton: { flex: 1, marginHorizontal: 5 },
        passwordInputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.subText,
            borderRadius: 6,
            backgroundColor: isDarkTheme ? '#333' : '#fff',
            marginBottom: 10,
            // Removendo o paddingRight para não afetar o TextInput
            // paddingRight: 10, 
        },
        passwordVisibilityIcon: {
            position: 'absolute',
            right: 10,
            padding: 5,
            color: theme.subText,
        },
    });

    if (loading) {
        return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.text} /></View>;
    }

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollViewContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />}
            >
                <Title style={styles.title}>Minha Conta</Title>

                <Card style={styles.card}>
                    <Card.Content>
                        <Paragraph style={styles.label}>Nome de Usuário</Paragraph>
                        <Title style={styles.value}>{userData?.username}</Title>
                    </Card.Content>
                </Card>

                <Card style={styles.card}>
                    <Card.Content>
                        <View style={styles.row}>
                            <View>
                                <Paragraph style={styles.label}>Renda Mensal</Paragraph>
                                <Title style={styles.value}>R$ {Number(userData?.renda_mensal || 0).toFixed(2)}</Title>
                            </View>
                            <IconButton icon="pencil" size={24} onPress={() => setRendaModalVisible(true)} iconColor={theme.text} />
                        </View>
                    </Card.Content>
                </Card>
                
                <Card style={styles.card}>
                    <Card.Content>
                        <View style={styles.row}>
                            <View>
                                <Paragraph style={styles.label}>Alterar Senha</Paragraph>
                                <Title style={styles.value}>********</Title>
                            </View>
                            <IconButton icon="pencil" size={24} onPress={() => setPasswordModalVisible(true)} iconColor={theme.text} />
                        </View>
                    </Card.Content>
                </Card>

                <Button mode="outlined" onPress={handleDeleteAccount} style={styles.deleteButton} labelStyle={styles.deleteButtonText}>
                    Excluir Conta
                </Button>

                <Modal visible={rendaModalVisible} onRequestClose={() => setRendaModalVisible(false)} transparent={true} animationType="fade">
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Title style={styles.modalTitle}>Atualizar Renda Mensal</Title>
                            <TextInput style={styles.input} placeholder="Digite o novo valor da renda" keyboardType="numeric" value={inputRenda || ''} onChangeText={setInputRenda} placeholderTextColor={theme.subText} />
                            <View style={styles.buttonContainer}>
                                <Button mode="outlined" onPress={() => setRendaModalVisible(false)} style={styles.modalButton}>Cancelar</Button>
                                <Button mode="contained" onPress={handleUpdateRenda} style={[styles.modalButton, { backgroundColor: theme.primary }]} labelStyle={{color: '#fff'}}>Salvar</Button>
                            </View>
                        </View>
                    </View>
                </Modal>
                
                <Modal visible={passwordModalVisible} onRequestClose={() => setPasswordModalVisible(false)} transparent={true} animationType="fade">
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Title style={styles.modalTitle}>Alterar Senha</Title>
                            <View style={styles.passwordInputContainer}>
                                <TextInput
                                    style={[styles.input, { flex: 1, marginBottom: 0, color: theme.text, backgroundColor: isDarkTheme ? '#333' : '#fff', paddingRight: 40 }]}
                                    placeholder="Nova Senha"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry={!isPasswordVisible}
                                    placeholderTextColor={theme.subText}
                                />
                                <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={{ position: 'absolute', right: 10 }}>
                                    <Ionicons
                                        name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                                        size={24}
                                        color={theme.subText}
                                    />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.passwordInputContainer}>
                                <TextInput
                                    style={[styles.input, { flex: 1, marginBottom: 0, color: theme.text, backgroundColor: isDarkTheme ? '#333' : '#fff', paddingRight: 40 }]}
                                    placeholder="Confirme a Nova Senha"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!isPasswordVisible}
                                    placeholderTextColor={theme.subText}
                                />
                                <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={{ position: 'absolute', right: 10 }}>
                                    <Ionicons
                                        name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                                        size={24}
                                        color={theme.subText}
                                    />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.buttonContainer}>
                                <Button mode="outlined" onPress={() => setPasswordModalVisible(false)} style={styles.modalButton}>Cancelar</Button>
                                <Button mode="contained" onPress={handleUpdatePassword} style={[styles.modalButton, { backgroundColor: theme.primary }]} labelStyle={{color: '#fff'}}>Salvar</Button>
                            </View>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </View>
    );
}