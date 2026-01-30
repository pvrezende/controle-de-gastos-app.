// frontend/screens/DividasScreen.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    ActivityIndicator, 
    RefreshControl, 
    TouchableOpacity, 
    Modal, 
    TextInput, 
    Alert, 
    Platform,
    Dimensions
} from 'react-native';
import { 
    Card, 
    Title, 
    Paragraph, 
    Button, 
    Menu, 
    IconButton, 
    Surface, 
    Avatar, 
    Divider,
    FAB 
} from 'react-native-paper'; 
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

/**
 * TELA: DividasScreen
 * Finalidade: Gestão de dívidas externas com planos de quitação baseados em prazos e sobra mensal.
 * Estilo unificado com bordas dinâmicas e superfícies escuras.
 */
export default function DividasScreen() {
    const { api } = useContext(AuthContext);
    const { theme, isDarkTheme } = useContext(ThemeContext);
    
    // ==========================================
    // 1. ESTADOS DE DADOS FINANCEIROS
    // ==========================================
    const [dividas, setDividas] = useState([]);
    const [sobraMensal, setSobraMensal] = useState(0);
    const [totalDividasLiq, setTotalDividasLiq] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // ==========================================
    // 2. ESTADOS DE CADASTRO (MODAL)
    // ==========================================
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [newDivida, setNewDivida] = useState({
        nome: '',
        valor_total: '',
        valor_a_pagar: '',
        data_limite: new Date(),
    });
    const [showDatePicker, setShowDatePicker] = useState(false);

    // ==========================================
    // 3. ESTADOS DE EDIÇÃO E MENU
    // ==========================================
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingDivida, setEditingDivida] = useState(null);
    const [showEditDatePicker, setShowEditDatePicker] = useState(false);
    const [visibleDividaMenu, setVisibleDividaMenu] = useState(null);

    /**
     * fetchData: Sincroniza dados de dívidas e renda com o RDS AWS.
     */
    const fetchData = async () => {
        try {
            setRefreshing(true);
            const [dividasRes, usuarioRes, despesasRes] = await Promise.all([
                api.get('/dividas'), 
                api.get('/usuario'), 
                api.get('/despesas'),
            ]);

            const listaDividas = dividasRes.data || [];
            setDividas(listaDividas);
            
            const totalLiq = listaDividas.reduce((sum, d) => {
                const liq = parseFloat(d.valor_total) - (parseFloat(d.valor_desconto) || 0);
                return sum + liq;
            }, 0);
            setTotalDividasLiq(totalLiq);

            const renda = parseFloat(usuarioRes.data.renda_mensal) || 0;
            const hoje = new Date();
            const mesAtual = hoje.getMonth();
            const anoAtual = hoje.getFullYear();

            const totalDespesasMes = despesasRes.data
                .filter(d => {
                    const dataVencimento = new Date(d.data_vencimento);
                    return !d.data_pagamento && dataVencimento.getMonth() === mesAtual && dataVencimento.getFullYear() === anoAtual;
                })
                .reduce((sum, d) => sum + parseFloat(d.valor), 0);

            setSobraMensal(renda - totalDespesasMes);
        } catch (error) {
            console.error('Erro ao buscar dados de dívidas:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchData(); }, []));
    const onRefresh = () => fetchData();

    /**
     * handleAddDivida: Lógica de persistência para nova dívida.
     */
    const handleAddDivida = async () => {
        if (!newDivida.nome || !newDivida.valor_total) {
            Alert.alert('Erro', 'Preencha a descrição e o valor total.');
            return;
        }
        const valorTotal = parseFloat(newDivida.valor_total);
        const valorAPagar = parseFloat(newDivida.valor_a_pagar) || valorTotal;
        
        if (valorAPagar > valorTotal) {
            Alert.alert('Erro', 'O valor líquido não pode superar o total original.');
            return;
        }
        
        const valorDesconto = valorTotal - valorAPagar;
        try {
            await api.post('/dividas', {
                nome: newDivida.nome,
                valor_total: valorTotal,
                valor_desconto: valorDesconto,
                data_limite: newDivida.data_limite.toISOString().split('T')[0],
            });
            setAddModalVisible(false);
            setNewDivida({ nome: '', valor_total: '', valor_a_pagar: '', data_limite: new Date() });
            fetchData();
        } catch (error) {
            Alert.alert('Erro', 'Falha ao salvar dívida.');
        }
    };

    const handleUpdateDivida = async () => {
        if (!editingDivida) return;
        const valorTotal = parseFloat(editingDivida.valor_total);
        const valorAPagar = parseFloat(editingDivida.valor_a_pagar);
        const valorDesconto = valorTotal - valorAPagar;
        try {
            await api.put(`/dividas/${editingDivida.id}`, {
                nome: editingDivida.nome,
                valor_total: valorTotal,
                valor_desconto: valorDesconto,
                data_limite: editingDivida.data_limite.toISOString().split('T')[0],
            });
            setEditModalVisible(false);
            fetchData();
        } catch (error) {
            Alert.alert("Erro", "Não foi possível atualizar.");
        }
    };
    
    const handleDeleteDivida = (id) => {
        setVisibleDividaMenu(null);
        Alert.alert("Excluir Dívida", "Deseja remover este registro?",
            [{ text: "Cancelar" }, { text: "Excluir", style: 'destructive', onPress: async () => {
                try { await api.delete(`/dividas/${id}`); fetchData(); } 
                catch (e) { Alert.alert("Erro", "Falha ao apagar."); }
            }}]
        );
    };

    const handleToggleHomeVisibility = async (id) => {
        try {
            await api.put(`/dividas/${id}/toggle-home`);
            fetchData(); 
        } catch (e) { Alert.alert("Erro", "Falha na visibilidade."); }
        setVisibleDividaMenu(null);
    };
    
    const handleOpenEditModal = (divida) => {
        const valorOriginal = parseFloat(divida.valor_total);
        const valorDesconto = parseFloat(divida.valor_desconto) || 0;
        const valorAPagar = valorOriginal - valorDesconto;
        const [year, month, day] = divida.data_limite.split('T')[0].split('-');
        setEditingDivida({
            ...divida,
            valor_total: String(valorOriginal),
            valor_a_pagar: String(valorAPagar),
            data_limite: new Date(year, parseInt(month) - 1, day),
        });
        setEditModalVisible(true);
        setVisibleDividaMenu(null);
    };

    const onChangeDate = (event, selectedDate) => {
        setShowDatePicker(false);
        if(selectedDate) setNewDivida({ ...newDivida, data_limite: selectedDate });
    };

    const onChangeEditDate = (event, selectedDate) => {
        setShowEditDatePicker(false);
        if (selectedDate) setEditingDivida({ ...editingDivida, data_limite: selectedDate });
    };

    const openDividaMenu = (id) => setVisibleDividaMenu(id);
    const closeDividaMenu = () => setVisibleDividaMenu(null);

    // ==========================================
    // 4. FOLHA DE ESTILOS PREMIUM
    // ==========================================
    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        header: { padding: 25, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, alignItems: 'center' },
        scrollContent: { padding: 20, paddingBottom: 130 },
        summaryCard: { marginBottom: 20, borderRadius: 25, elevation: 8, backgroundColor: isDarkTheme ? '#1c1c1c' : '#fff9f0', borderLeftWidth: 12, borderLeftColor: '#FF9800' },
        card: { marginBottom: 18, borderRadius: 22, elevation: 4, backgroundColor: theme.cardBackground, borderLeftWidth: 10, borderLeftColor: theme.primary },
        planBox: { marginTop: 15, padding: 15, borderRadius: 15, backgroundColor: isDarkTheme ? '#252525' : '#f9f9f9', borderTopWidth: 1, borderTopColor: theme.subText + '30' },
        planTitle: { fontSize: 13, fontWeight: 'bold', color: theme.primary, marginBottom: 5, letterSpacing: 0.5 },
        amountToSave: { fontSize: 18, fontWeight: '900', color: theme.secondary },
        fab: { position: 'absolute', right: 25, bottom: 35, backgroundColor: theme.primary, borderRadius: 20, elevation: 12 },
        modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', padding: 25 },
        modalContent: { padding: 35, borderRadius: 35, backgroundColor: theme.cardBackground, elevation: 20 },
        input: { 
            borderWidth: 1, 
            borderRadius: 16, 
            padding: 18, 
            marginBottom: 15, 
            color: theme.text, 
            borderColor: theme.subText + '50', 
            backgroundColor: isDarkTheme ? '#2a2a2a' : '#f5f5f5',
            fontSize: 16 
        },
        center: { alignItems: 'center', justifyContent: 'center' },
        rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        btnAction: { height: 55, justifyContent: 'center', borderRadius: 18, marginTop: 15 }
    });
    
    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>;

    return (
        <View style={styles.container}>
            <Surface style={[styles.header, { backgroundColor: isDarkTheme ? '#1a1a1a' : '#f5f5f5' }]} elevation={2}>
                <Title style={{ color: theme.text, fontSize: 26, fontWeight: 'bold' }}>Minhas Dívidas</Title>
                <Paragraph style={{ color: theme.subText }}>Controle de quitação e prazos</Paragraph>
            </Surface>

            <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                
                {/* CARD DE RESUMO */}
                <Card style={styles.summaryCard}>
                    <Card.Content>
                        <Text style={{ color: theme.subText, fontWeight: 'bold' }}>VALOR TOTAL PENDENTE</Text>
                        <Title style={{ fontSize: 34, fontWeight: '900', color: '#FF9800' }}>R$ {totalDividasLiq.toFixed(2)}</Title>
                        <Divider style={{ marginVertical: 10 }} />
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name="wallet-giftcard" size={20} color={theme.secondary} />
                            <Text style={{ color: theme.text, marginLeft: 8, fontWeight: '600' }}>Sobra Mensal Estimada: R$ {sobraMensal.toFixed(2)}</Text>
                        </View>
                    </Card.Content>
                </Card>

                {dividas.length > 0 ? dividas.map(divida => {
                    const total = parseFloat(divida.valor_total);
                    const liq = total - (parseFloat(divida.valor_desconto) || 0);
                    const hoje = new Date(); hoje.setHours(0,0,0,0);
                    const limite = new Date(divida.data_limite); limite.setMinutes(limite.getMinutes() + limite.getTimezoneOffset());
                    const dias = Math.max(0, Math.ceil((limite - hoje) / (1000 * 60 * 60 * 24)));
                    const daily = dias > 0 ? liq / dias : liq;

                    return (
                        <Card key={divida.id} style={[styles.card, { borderLeftColor: dias <= 7 ? theme.danger : theme.primary }]}>
                            <Card.Title
                                title={divida.nome}
                                titleStyle={{ fontWeight: 'bold', color: theme.text }}
                                left={() => <Avatar.Icon size={40} icon={divida.incluir_home ? "eye-check" : "eye-off"} style={{ backgroundColor: theme.primary + '20' }} color={theme.primary} />}
                                right={() => (
                                    <Menu 
                                        visible={visibleDividaMenu === divida.id} 
                                        onDismiss={closeDividaMenu} 
                                        anchor={<IconButton icon="dots-vertical" onPress={() => openDividaMenu(divida.id)} iconColor={theme.text}/>}
                                    >
                                        <Menu.Item onPress={() => handleOpenEditModal(divida)} title="Editar" leadingIcon="pencil" />
                                        <Menu.Item onPress={() => handleToggleHomeVisibility(divida.id)} title="Visibilidade na Home" leadingIcon="home-export-outline" />
                                        <Menu.Item onPress={() => handleDeleteDivida(divida.id)} title="Excluir" leadingIcon="trash-can" titleStyle={{color: theme.danger}}/>
                                    </Menu>
                                )}
                            />
                            <Card.Content>
                                <View style={styles.rowBetween}>
                                    <Text style={{ color: theme.subText }}>Original: R$ {total.toFixed(2)}</Text>
                                    {divida.valor_desconto > 0 && <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>Desconto: {((divida.valor_desconto / total) * 100).toFixed(0)}%</Text>}
                                </View>
                                <Title style={{ color: theme.text, fontSize: 24, fontWeight: '900' }}>Pagar: <Text style={{ color: theme.danger }}>R$ {liq.toFixed(2)}</Text></Title>
                                <Text style={{ color: theme.subText, fontSize: 12 }}>Vencimento: {limite.toLocaleDateString('pt-BR')}</Text>

                                <View style={styles.planBox}>
                                    <Text style={styles.planTitle}>PLANO POR PRAZO</Text>
                                    {dias > 0 ? (
                                        <Text style={{ color: theme.text }}>Reserve <Text style={styles.amountToSave}>R$ {daily.toFixed(2)}/dia</Text> para quitar em {dias} dias.</Text>
                                    ) : (
                                        <Text style={{ color: theme.danger, fontWeight: 'bold' }}>Prazo expirado!</Text>
                                    )}
                                </View>
                            </Card.Content>
                        </Card>
                    );
                }) : <Text style={{ textAlign: 'center', color: theme.subText, marginTop: 40 }}>Nenhuma dívida listada.</Text>}
            </ScrollView>

            <FAB icon="plus" style={styles.fab} color="white" onPress={() => setAddModalVisible(true)} />

            {/* MODAL: ADICIONAR COM ESTILO PREMIUM */}
            <Modal visible={addModalVisible} transparent animationType="fade" onRequestClose={() => setAddModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <Surface style={styles.modalContent}>
                        <Title style={{ color: theme.text, textAlign: 'center', marginBottom: 25, fontWeight: 'bold' }}>Lançar Nova Dívida</Title>
                        <TextInput style={styles.input} placeholder="Descrição (ex: Empréstimo)" placeholderTextColor={theme.subText} value={newDivida.nome} onChangeText={t => setNewDivida({...newDivida, nome: t})} />
                        <TextInput style={styles.input} placeholder="Valor Total (R$)" placeholderTextColor={theme.subText} keyboardType="numeric" value={newDivida.valor_total} onChangeText={t => setNewDivida({...newDivida, valor_total: t})} />
                        <TextInput style={styles.input} placeholder="Valor com Desconto (R$)" placeholderTextColor={theme.subText} keyboardType="numeric" value={newDivida.valor_a_pagar} onChangeText={t => setNewDivida({...newDivida, valor_a_pagar: t})} />
                        <Button mode="outlined" icon="calendar" onPress={() => setShowDatePicker(true)} style={{ marginBottom: 15, borderRadius: 15 }}>{newDivida.data_limite.toLocaleDateString()}</Button>
                        {showDatePicker && <DateTimePicker value={newDivida.data_limite} mode="date" onChange={onChangeDate} />}
                        <Button mode="contained" onPress={handleAddDivida} style={styles.btnAction} labelStyle={{fontWeight: 'bold', fontSize: 16}}>ADICIONAR DÍVIDA</Button>
                        <Button mode="text" onPress={() => setAddModalVisible(false)} textColor={theme.danger} style={{marginTop: 5}}>CANCELAR</Button>
                    </Surface>
                </View>
            </Modal>
        </View>
    );
}
