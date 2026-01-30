// frontend/screens/HomeScreen.js
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
    ProgressBar, 
    Button, 
    Title, 
    Paragraph, 
    IconButton, 
    Surface, 
    Avatar, 
    Divider 
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

/**
 * TELA: HomeScreen
 * Descrição: Dashboard principal com resumo financeiro, metas e rendas extras.
 * Estilo unificado com a tela de Despesas para consistência visual.
 */
export default function HomeScreen({ navigation }) {
    const { api, userToken } = useContext(AuthContext); 
    const { theme, isDarkTheme } = useContext(ThemeContext); 
    
    // Estados de Controle de Dados
    const [rendaMensal, setRendaMensal] = useState(0);
    const [despesasPagasMes, setDespesasPagasMes] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [username, setUsername] = useState('');

    // Estados de Gastos e Alertas
    const [upcomingExpenses, setUpcomingExpenses] = useState([]);
    const [overdueExpenses, setOverdueExpenses] = useState([]);
    const [debtSavingsGoals, setDebtSavingsGoals] = useState({ daily: 0, monthly: 0 });
    const [goalSavings, setGoalSavings] = useState({ daily: 0, monthly: 0 });
    const [homeDividas, setHomeDividas] = useState([]);
    const [homeMetas, setHomeMetas] = useState([]);

    // Estados de Renda Extra
    const [rendasExtras, setRendasExtras] = useState([]);
    const [totalRendasExtras, setTotalRendasExtras] = useState(0);

    // Estados de Modais e Formulários
    const [rendaModalVisible, setRendaModalVisible] = useState(false);
    const [inputRenda, setInputRenda] = useState('');
    const [addRendaExtraModalVisible, setAddRendaExtraModalVisible] = useState(false);
    const [editRendaExtraModalVisible, setEditRendaExtraModalVisible] = useState(false);
    const [newRendaExtra, setNewRendaExtra] = useState({ nome: '', valor: '', data_recebimento: new Date() });
    const [editingRendaExtra, setEditingRendaExtra] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    /**
     * fetchData: Sincroniza as informações do Dashboard com o banco de dados RDS.
     */
    const fetchData = async () => {
        try {
            setRefreshing(true);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const mesAtual = hoje.getMonth() + 1;
            const anoAtual = hoje.getFullYear();

            // Busca múltipla paralela para performance
            const [rendaRes, despesasRes, dividasRes, metasRes, extrasRes] = await Promise.all([
                api.get('/usuario'),
                api.get('/despesas'),
                api.get('/dividas'),
                api.get('/metas'),
                api.get(`/rendas-extras?mes=${mesAtual}&ano=${anoAtual}`),
            ]);

            // 1. Processamento de Perfil e Renda Fixa
            const rendaBase = parseFloat(rendaRes.data.renda_mensal) || 0;
            setRendaMensal(rendaBase);
            setInputRenda(rendaBase.toString());
            setUsername(rendaRes.data.username || 'Usuário');

            // 2. Processamento de Rendas Extras
            const listaExtras = extrasRes.data || [];
            setRendasExtras(listaExtras);
            setTotalRendasExtras(listaExtras.reduce((sum, item) => sum + parseFloat(item.valor), 0));

            // 3. Processamento de Despesas e Alertas
            const todasDespesas = despesasRes.data || [];
            const totalPagas = todasDespesas
                .filter(d => {
                    if (!d.data_pagamento) return false;
                    const dataPag = new Date(d.data_pagamento);
                    return dataPag.getMonth() === hoje.getMonth() && dataPag.getFullYear() === hoje.getFullYear();
                })
                .reduce((sum, d) => sum + parseFloat(d.valor), 0);
            setDespesasPagasMes(totalPagas);
            
            // Filtro de Contas Atrasadas
            setOverdueExpenses(todasDespesas.filter(d => !d.data_pagamento && new Date(d.data_vencimento) < hoje));

            // Filtro de Próximas Contas (Janela de 30 dias)
            const limite30 = new Date(hoje);
            limite30.setDate(hoje.getDate() + 30);
            setUpcomingExpenses(todasDespesas
                .filter(d => !d.data_pagamento && new Date(d.data_vencimento) >= hoje && new Date(d.data_vencimento) <= limite30)
                .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento))
            );

            // 4. Cálculos de Metas de Quitação de Dívidas
            const dividasFiltradas = dividasRes.data.filter(d => d.incluir_home);
            setHomeDividas(dividasFiltradas);
            let somaDiariaDivida = 0;
            dividasFiltradas.forEach(div => {
                const totalLiq = parseFloat(div.valor_total) - (parseFloat(div.valor_desconto) || 0);
                const limite = new Date(div.data_limite);
                const diasRestantes = Math.max(0, Math.ceil((limite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)));
                if (diasRestantes > 0 && totalLiq > 0) somaDiariaDivida += totalLiq / diasRestantes;
            });
            setDebtSavingsGoals({ daily: somaDiariaDivida, monthly: somaDiariaDivida * 30.44 });

            // 5. Cálculos de Metas de Economia
            const metasFiltradas = metasRes.data.filter(m => m.incluir_home);
            setHomeMetas(metasFiltradas);
            let somaDiariaMeta = 0;
            metasFiltradas.forEach(meta => {
                const alvo = parseFloat(meta.valor_alvo) - (parseFloat(meta.valor_economizado) || 0);
                const limite = new Date(meta.data_limite);
                const diasRestantes = Math.max(0, Math.ceil((limite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)));
                if (diasRestantes > 0 && alvo > 0) somaDiariaMeta += alvo / diasRestantes;
            });
            setGoalSavings({ daily: somaDiariaMeta, monthly: somaDiariaMeta * 30.44 });

        } catch (error) {
            console.error('Erro na sincronização da Home:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };
    
    useFocusEffect(useCallback(() => { if (userToken) fetchData(); }, [userToken]));

    const onRefresh = () => fetchData();
    
    const handleUpdateRenda = async () => {
        const novaRenda = parseFloat(inputRenda);
        if (isNaN(novaRenda) || novaRenda < 0) { Alert.alert('Erro', 'Insira um valor válido.'); return; }
        try {
            await api.put('/usuario', { renda_mensal: novaRenda });
            setRendaModalVisible(false);
            fetchData();
        } catch (error) { Alert.alert('Erro', 'Falha ao atualizar renda.'); }
    };

    const handleAddRendaExtra = async () => {
        if (!newRendaExtra.nome || !newRendaExtra.valor) { Alert.alert('Erro', 'Preencha todos os campos.'); return; }
        try {
            await api.post('/rendas-extras', { 
                ...newRendaExtra, 
                valor: parseFloat(newRendaExtra.valor), 
                data_recebimento: newRendaExtra.data_recebimento.toISOString().split('T')[0] 
            });
            setAddRendaExtraModalVisible(false);
            setNewRendaExtra({ nome: '', valor: '', data_recebimento: new Date() });
            fetchData();
        } catch (error) { Alert.alert('Erro', 'Falha ao adicionar renda extra.'); }
    };

    const handleOpenEditRendaExtra = (renda) => {
        const [y, m, d] = renda.data_recebimento.split('T')[0].split('-');
        setEditingRendaExtra({ 
            ...renda, 
            valor: String(renda.valor), 
            data_recebimento: new Date(y, parseInt(m) - 1, d) 
        });
        setEditRendaExtraModalVisible(true);
    };

    const handleUpdateRendaExtra = async () => {
        if (!editingRendaExtra) return;
        try {
            await api.put(`/rendas-extras/${editingRendaExtra.id}`, { 
                ...editingRendaExtra, 
                valor: parseFloat(editingRendaExtra.valor), 
                data_recebimento: editingRendaExtra.data_recebimento.toISOString().split('T')[0] 
            });
            setEditRendaExtraModalVisible(false);
            fetchData();
        } catch (error) { Alert.alert('Erro', 'Falha ao atualizar.'); }
    };

    const handleDeleteRendaExtra = (id) => {
        Alert.alert("Excluir Renda", "Deseja remover este registro?", [
            { text: "Cancelar" },
            { text: "Excluir", style: 'destructive', onPress: async () => {
                try { await api.delete(`/rendas-extras/${id}`); fetchData(); } 
                catch (error) { Alert.alert("Erro", "Falha ao excluir."); }
            }}
        ]);
    };
    
    const onChangeDate = (event, selectedDate, type) => {
        setShowDatePicker(false);
        if (selectedDate) {
            if (type === 'new') setNewRendaExtra({ ...newRendaExtra, data_recebimento: selectedDate });
            else setEditingRendaExtra({ ...editingRendaExtra, data_recebimento: selectedDate });
        }
    };

    // Estilos internos que respeitam o Tema (Dark/Light)
    const dynamicStyles = StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        header: { padding: 25, borderBottomLeftRadius: 35, borderBottomRightRadius: 35 },
        greeting: { fontSize: 26, fontWeight: 'bold' },
        scrollContent: { padding: 20, paddingBottom: 110 },
        card: { 
            marginBottom: 18, 
            borderRadius: 22, 
            borderLeftWidth: 12, 
            borderLeftColor: 'transparent', 
            elevation: 6,
            backgroundColor: theme.cardBackground
        },
        alertCard: { backgroundColor: '#FF5252', borderLeftWidth: 0 },
        balanceTitle: { fontSize: 36, fontWeight: '900', marginVertical: 8 },
        progress: { height: 12, borderRadius: 6, marginTop: 12 },
        div: { marginVertical: 15, height: 1.5 },
        row: { flexDirection: 'row', alignItems: 'center' },
        rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
        extraItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: theme.subText + '40' },
        overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 25 },
        modal: { padding: 25, borderRadius: 28, backgroundColor: theme.cardBackground },
        input: { borderWidth: 1, borderRadius: 14, padding: 18, marginBottom: 15, fontSize: 16, color: theme.text },
        center: { alignItems: 'center', justifyContent: 'center' },
        upcomingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.subText + '20' }
    });

    if (loading) { 
        return (
            <View style={[dynamicStyles.container, dynamicStyles.center]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        ); 
    }

    const somaRenda = rendaMensal + totalRendasExtras;
    const saldoAtual = somaRenda - despesasPagasMes;
    const percUtilizado = somaRenda > 0 ? (despesasPagasMes / somaRenda) : 0;

    return (
        <View style={dynamicStyles.container}>
            <Surface style={[dynamicStyles.header, { backgroundColor: isDarkTheme ? '#1c1c1c' : '#f5f5f5' }]} elevation={2}>
                <Text style={[dynamicStyles.greeting, { color: theme.text }]}>Olá, {username}!</Text>
                <Paragraph style={{ color: theme.subText }}>Resumo da sua saúde financeira</Paragraph>
            </Surface>

            <ScrollView
                contentContainerStyle={dynamicStyles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
            >
                {/* ALERTA DE CONTAS EM ATRASO */}
                {overdueExpenses.length > 0 && (
                    <TouchableOpacity onPress={() => navigation.navigate('Despesas', { initialTab: 'overdue' })}>
                        <Card style={[dynamicStyles.card, dynamicStyles.alertCard]}>
                            <Card.Content style={dynamicStyles.row}>
                                <Avatar.Icon size={44} icon="alert-decagram" color="white" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                                <View style={{ marginLeft: 15, flex: 1 }}>
                                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Atenção!</Text>
                                    <Text style={{ color: 'white', fontSize: 13 }}>Você tem {overdueExpenses.length} conta(s) vencida(s).</Text>
                                </View>
                                <MaterialCommunityIcons name="chevron-right" size={24} color="white" />
                            </Card.Content>
                        </Card>
                    </TouchableOpacity>
                )}

                {/* CARD DE SALDO DISPONÍVEL */}
                <Card style={[dynamicStyles.card, { borderLeftColor: saldoAtual < 0 ? theme.danger : '#4CAF50' }]}>
                    <Card.Content>
                        <Text style={{ color: theme.subText, fontWeight: 'bold' }}>SALDO DISPONÍVEL (MÊS)</Text>
                        <Title style={[dynamicStyles.balanceTitle, { color: saldoAtual < 0 ? theme.danger : '#4CAF50' }]}>
                            R$ {saldoAtual.toFixed(2)}
                        </Title>
                        <ProgressBar progress={percUtilizado} color={percUtilizado > 0.85 ? theme.danger : theme.primary} style={dynamicStyles.progress} />
                        <Text style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: theme.subText, fontWeight: 'bold' }}>
                            {`${(percUtilizado * 100).toFixed(0)}% do orçamento comprometido`}
                        </Text>
                        
                        <Divider style={dynamicStyles.div} />
                        
                        <TouchableOpacity onPress={() => setRendaModalVisible(true)} style={dynamicStyles.rowBetween}>
                            <View style={dynamicStyles.row}>
                                <Avatar.Icon size={32} icon="bank-transfer-in" color="#4CAF50" style={{ backgroundColor: '#4CAF5020' }} />
                                <Text style={{ color: theme.text, marginLeft: 12, fontSize: 16, fontWeight: '500' }}>Renda Fixa: R$ {rendaMensal.toFixed(2)}</Text>
                            </View>
                            <MaterialCommunityIcons name="pencil-box-outline" size={22} color={theme.subText} />
                        </TouchableOpacity>

                        <View style={dynamicStyles.rowBetween}>
                            <View style={dynamicStyles.row}>
                                <Avatar.Icon size={32} icon="bank-transfer-out" color={theme.danger} style={{ backgroundColor: theme.danger + '20' }} />
                                <Text style={{ color: theme.text, marginLeft: 12, fontSize: 16, fontWeight: '500' }}>Contas Pagas: R$ {despesasPagasMes.toFixed(2)}</Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>

                {/* RENDAS EXTRAS */}
                <Card style={dynamicStyles.card}>
                    <Card.Title 
                        title={`Extras do Mês (R$ ${totalRendasExtras.toFixed(2)})`}
                        titleStyle={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}
                        right={() => <IconButton icon="plus-circle" iconColor={theme.primary} size={28} onPress={() => setAddRendaExtraModalVisible(true)} />}
                    />
                    <Card.Content>
                        {rendasExtras.length > 0 ? rendasExtras.map(renda => (
                            <View key={renda.id} style={dynamicStyles.extraItem}>
                                <Text style={{ color: theme.text, flex: 1, fontWeight: '500' }}>{renda.nome}</Text>
                                <Text style={{ color: '#4CAF50', fontWeight: '900', marginRight: 10 }}>+ R$ {parseFloat(renda.valor).toFixed(2)}</Text>
                                <IconButton icon="trash-can-outline" iconColor={theme.danger} size={18} onPress={() => handleDeleteRendaExtra(renda.id)} />
                            </View>
                        )) : <Text style={{ textAlign: 'center', color: theme.subText, marginVertical: 10 }}>Nenhuma entrada extra.</Text>}
                    </Card.Content>
                </Card>

                {/* META PARA DÍVIDAS */}
                {debtSavingsGoals.daily > 0 && (
                    <Card style={[dynamicStyles.card, { backgroundColor: isDarkTheme ? '#2a1e12' : '#fff9f0', borderLeftColor: '#FF9800' }]}>
                        <Card.Title title="Plano de Quitação" titleStyle={{ color: theme.text, fontWeight: 'bold' }} left={() => <Avatar.Icon size={36} icon="calculator" color="#FF9800" style={{backgroundColor: '#FF980020'}} />} />
                        <Card.Content style={dynamicStyles.center}>
                            <Paragraph style={{ color: theme.text, textAlign: 'center' }}>Para quitar suas pendências no prazo, reserve:</Paragraph>
                            <Title style={{ color: '#FF9800', fontWeight: '900', fontSize: 28 }}>R$ {debtSavingsGoals.daily.toFixed(2)} / dia</Title>
                            <Text style={{ color: theme.subText, fontSize: 12 }}>Equivalente a R$ {debtSavingsGoals.monthly.toFixed(2)} por mês</Text>
                        </Card.Content>
                    </Card>
                )}

                {/* PRÓXIMOS VENCIMENTOS */}
                {upcomingExpenses.length > 0 && (
                    <Card style={dynamicStyles.card}>
                        <Card.Title title="Próximos Compromissos" titleStyle={{ color: theme.text, fontWeight: 'bold' }} />
                        <Card.Content>
                            {upcomingExpenses.slice(0, 4).map(exp => (
                                <View key={exp.id} style={dynamicStyles.upcomingRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: theme.text, fontWeight: '600' }}>{exp.nome}</Text>
                                        <Text style={{ color: theme.subText, fontSize: 11 }}>Vencimento em {new Date(exp.data_vencimento).toLocaleDateString()}</Text>
                                    </View>
                                    <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>R$ {parseFloat(exp.valor).toFixed(2)}</Text>
                                </View>
                            ))}
                            <Button mode="text" onPress={() => navigation.navigate('Despesas')} labelStyle={{ fontWeight: 'bold' }}>VER LISTA COMPLETA</Button>
                        </Card.Content>
                    </Card>
                )}

                {/* MODAL: ATUALIZAR RENDA FIXA */}
                <Modal visible={rendaModalVisible} transparent animationType="fade">
                    <View style={dynamicStyles.overlay}>
                        <Surface style={dynamicStyles.modal} elevation={5}>
                            <Title style={{ color: theme.text, textAlign: 'center', marginBottom: 20 }}>Renda Mensal Fixa</Title>
                            <TextInput 
                                style={[dynamicStyles.input, { backgroundColor: isDarkTheme ? '#2a2a2a' : '#fff' }]} 
                                keyboardType="numeric" 
                                value={inputRenda} 
                                onChangeText={setInputRenda}
                                placeholder="0.00"
                                placeholderTextColor={theme.subText}
                            />
                            <View style={dynamicStyles.row}>
                                <Button mode="outlined" onPress={() => setRendaModalVisible(false)} style={{ flex: 1, marginRight: 10 }}>Cancelar</Button>
                                <Button mode="contained" onPress={handleUpdateRenda} style={{ flex: 1 }}>Salvar</Button>
                            </View>
                        </Surface>
                    </View>
                </Modal>

                {/* MODAL: ADICIONAR RENDA EXTRA */}
                <Modal visible={addRendaExtraModalVisible} transparent animationType="slide">
                    <View style={dynamicStyles.overlay}>
                        <Surface style={dynamicStyles.modal} elevation={5}>
                            <Title style={{ color: theme.text, marginBottom: 15 }}>Nova Renda Extra</Title>
                            <TextInput style={[dynamicStyles.input, { backgroundColor: isDarkTheme ? '#2a2a2a' : '#fff' }]} placeholder="Descrição" placeholderTextColor={theme.subText} value={newRendaExtra.nome} onChangeText={t => setNewRendaExtra({...newRendaExtra, nome: t})} />
                            <TextInput style={[dynamicStyles.input, { backgroundColor: isDarkTheme ? '#2a2a2a' : '#fff' }]} placeholder="Valor" placeholderTextColor={theme.subText} keyboardType="numeric" value={newRendaExtra.valor} onChangeText={t => setNewRendaExtra({...newRendaExtra, valor: t})} />
                            <TouchableOpacity 
                                style={[dynamicStyles.input, { backgroundColor: isDarkTheme ? '#2a2a2a' : '#fff', justifyContent: 'center' }]} 
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={{ color: theme.text }}>Data: {newRendaExtra.data_recebimento.toLocaleDateString()}</Text>
                            </TouchableOpacity>
                            {showDatePicker && <DateTimePicker value={newRendaExtra.data_recebimento} mode="date" display="default" onChange={(e,d) => onChangeDate(e,d,'new')} />}
                            <View style={dynamicStyles.row}>
                                <Button mode="text" onPress={() => setAddRendaExtraModalVisible(false)} textColor={theme.danger} style={{ flex: 1 }}>Sair</Button>
                                <Button mode="contained" onPress={handleAddRendaExtra} style={{ flex: 1 }}>Confirmar</Button>
                            </View>
                        </Surface>
                    </View>
                </Modal>
            </ScrollView>
        </View>
    );
}
