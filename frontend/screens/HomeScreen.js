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
    Platform 
} from 'react-native';
import { Card, ProgressBar, Button, Title, Paragraph, IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

export default function HomeScreen({ navigation }) {
    const { api, userToken } = useContext(AuthContext); 
    const { theme, isDarkTheme } = useContext(ThemeContext); 
    const [rendaMensal, setRendaMensal] = useState(0);
    const [despesasPagasMes, setDespesasPagasMes] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const [rendaModalVisible, setRendaModalVisible] = useState(false);
    const [inputRenda, setInputRenda] = useState('');

    const [username, setUsername] = useState('');
    const [upcomingExpenses, setUpcomingExpenses] = useState([]);
    const [overdueExpenses, setOverdueExpenses] = useState([]);

    const [debtSavingsGoals, setDebtSavingsGoals] = useState({ daily: 0, monthly: 0 });
    const [goalSavings, setGoalSavings] = useState({ daily: 0, monthly: 0 });
    
    const [homeDividas, setHomeDividas] = useState([]);
    const [homeMetas, setHomeMetas] = useState([]);

    const [rendasExtras, setRendasExtras] = useState([]);
    const [totalRendasExtras, setTotalRendasExtras] = useState(0);
    const [addRendaExtraModalVisible, setAddRendaExtraModalVisible] = useState(false);
    const [editRendaExtraModalVisible, setEditRendaExtraModalVisible] = useState(false);
    const [newRendaExtra, setNewRendaExtra] = useState({ nome: '', valor: '', data_recebimento: new Date() });
    const [editingRendaExtra, setEditingRendaExtra] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const fetchData = async () => {
        try {
            setRefreshing(true);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const mesAtual = hoje.getMonth() + 1;
            const anoAtual = hoje.getFullYear();

            const [rendaResponse, despesasResponse, dividasResponse, metasResponse, rendasExtrasResponse] = await Promise.all([
                api.get('/usuario'),
                api.get('/despesas'),
                api.get('/dividas'),
                api.get('/metas'),
                api.get(`/rendas-extras?mes=${mesAtual}&ano=${anoAtual}`),
            ]);

            const renda = parseFloat(rendaResponse.data.renda_mensal) || 0;
            setRendaMensal(renda);
            setInputRenda(renda.toString());
            setUsername(rendaResponse.data.username || '');

            const rendasExtrasDoMes = rendasExtrasResponse.data;
            setRendasExtras(rendasExtrasDoMes);
            const totalExtra = rendasExtrasDoMes.reduce((sum, item) => sum + parseFloat(item.valor), 0);
            setTotalRendasExtras(totalExtra);

            const todasDespesas = despesasResponse.data;
            const totalPagas = todasDespesas
                .filter(d => {
                    if (!d.data_pagamento) return false;
                    const dataPagamento = new Date(d.data_pagamento);
                    return dataPagamento.getMonth() === hoje.getMonth() && dataPagamento.getFullYear() === hoje.getFullYear();
                })
                .reduce((sum, d) => sum + parseFloat(d.valor), 0);
            setDespesasPagasMes(totalPagas);
            
            const atrasadas = todasDespesas.filter(d => {
                const dataVencimento = new Date(d.data_vencimento);
                return !d.data_pagamento && dataVencimento < hoje;
            });
            setOverdueExpenses(atrasadas);

            const daqui30Dias = new Date(hoje);
            daqui30Dias.setDate(hoje.getDate() + 30);

            const proximas = todasDespesas
                .filter(d => {
                    if (d.data_pagamento) { return false; }
                    const [year, month, day] = d.data_vencimento.split('T')[0].split('-');
                    const dataVencimento = new Date(year, parseInt(month) - 1, day);
                    return dataVencimento >= hoje && dataVencimento <= daqui30Dias;
                })
                .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
            
            setUpcomingExpenses(proximas);

            const dividasNaHome = dividasResponse.data.filter(d => d.incluir_home);
            setHomeDividas(dividasNaHome);
            let totalDailySavings = 0;
            if (dividasNaHome.length > 0) {
                dividasNaHome.forEach(divida => {
                    const valorFinal = parseFloat(divida.valor_total) - (parseFloat(divida.valor_desconto) || 0);
                    const deadline = new Date(divida.data_limite);
                    deadline.setMinutes(deadline.getMinutes() + deadline.getTimezoneOffset());
                    const diffTime = deadline.getTime() - hoje.getTime();
                    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                    if (diffDays > 0 && valorFinal > 0) {
                        totalDailySavings += valorFinal / diffDays;
                    }
                });
            }
            setDebtSavingsGoals({
                daily: totalDailySavings,
                monthly: totalDailySavings * 30.44
            });

            const metasNaHome = metasResponse.data.filter(m => m.incluir_home);
            setHomeMetas(metasNaHome);
            let totalGoalDailySavings = 0;
            if (metasNaHome.length > 0) {
                metasNaHome.forEach(meta => {
                    const valorAlvo = parseFloat(meta.valor_alvo);
                    const deadline = new Date(meta.data_limite);
                    deadline.setMinutes(deadline.getMinutes() + deadline.getTimezoneOffset());
                    const diffTime = deadline.getTime() - hoje.getTime();
                    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                    if (diffDays > 0 && valorAlvo > 0) {
                        totalGoalDailySavings += valorAlvo / diffDays;
                    }
                });
            }
            setGoalSavings({
                daily: totalGoalDailySavings,
                monthly: totalGoalDailySavings * 30.44
            });

        } catch (error) {
            console.error('Erro ao buscar dados da home:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };
    
    useFocusEffect(
        useCallback(() => { 
            if (userToken) {
                fetchData();
            }
        }, [userToken])
    );

    const onRefresh = () => fetchData();
    
    const handleUpdateRenda = async () => {
        const novaRenda = parseFloat(inputRenda);
        if (isNaN(novaRenda) || novaRenda < 0) { Alert.alert('Valor Inválido', 'Por favor, insira um número válido.'); return; }
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

    const handleAddRendaExtra = async () => {
        if (!newRendaExtra.nome || !newRendaExtra.valor) { Alert.alert('Erro', 'Preencha nome e valor.'); return; }
        try {
            await api.post('/rendas-extras', { ...newRendaExtra, valor: parseFloat(newRendaExtra.valor), data_recebimento: newRendaExtra.data_recebimento.toISOString().split('T')[0] });
            setAddRendaExtraModalVisible(false);
            setNewRendaExtra({ nome: '', valor: '', data_recebimento: new Date() });
            fetchData();
        } catch (error) { Alert.alert('Erro', 'Não foi possível adicionar a renda extra.'); }
    };

    const handleOpenEditRendaExtra = (renda) => {
        const [year, month, day] = renda.data_recebimento.split('T')[0].split('-');
        setEditingRendaExtra({ ...renda, valor: String(renda.valor), data_recebimento: new Date(year, parseInt(month) - 1, day) });
        setEditRendaExtraModalVisible(true);
    };

    const handleUpdateRendaExtra = async () => {
        if (!editingRendaExtra) return;
        try {
            await api.put(`/rendas-extras/${editingRendaExtra.id}`, { ...editingRendaExtra, valor: parseFloat(editingRendaExtra.valor), data_recebimento: editingRendaExtra.data_recebimento.toISOString().split('T')[0] });
            setEditRendaExtraModalVisible(false);
            setEditingRendaExtra(null);
            fetchData();
        } catch (error) { Alert.alert('Erro', 'Não foi possível atualizar.'); }
    };

    const handleDeleteRendaExtra = (id) => {
        Alert.alert("Confirmar Exclusão", "Deseja excluir este registro de renda extra?",
            [{ text: "Cancelar" }, { text: "Excluir", style: 'destructive', onPress: async () => {
                try { await api.delete(`/rendas-extras/${id}`); fetchData(); } 
                catch (error) { Alert.alert("Erro", "Não foi possível excluir."); }
            }}]
        );
    };
    
    const onChangeDate = (event, selectedDate, type) => {
        setShowDatePicker(false);
        if (selectedDate) {
            if (type === 'new') setNewRendaExtra({ ...newRendaExtra, data_recebimento: selectedDate });
            else setEditingRendaExtra({ ...editingRendaExtra, data_recebimento: selectedDate });
        }
    };

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        scrollViewContent: { padding: 20, paddingBottom: 110 }, // Aumentado para visibilidade na Web
        loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        greeting: { fontSize: 22, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginTop: 20 },
        title: { fontSize: 18, color: theme.subText, textAlign: 'center', marginBottom: 20 },
        card: {
            marginBottom: 15,
            backgroundColor: theme.cardBackground,
            overflow: 'hidden', // Previne elementos saindo do card na Web
            ...Platform.select({
                android: { elevation: 3 },
                ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.22,
                    shadowRadius: 2.22,
                },
                web: {
                    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
                }
            })
        },
        overdueCard: { backgroundColor: theme.danger },
        overdueTitle: { color: '#fff', fontWeight: 'bold' },
        summaryLabel: { fontSize: 16, color: theme.subText, textAlign: 'center' },
        summaryBalance: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginVertical: 5 },
        positiveSaldo: { color: 'green', fontWeight: 'bold' },
        negativeSaldo: { color: 'red', fontWeight: 'bold' },
        progressBar: { height: 10, borderRadius: 5, marginTop: 10 },
        progressText: { textAlign: 'center', color: theme.subText, fontSize: 12, marginTop: 5 },
        summaryDetails: { marginTop: 15, borderTopWidth: 1, borderTopColor: theme.subText, paddingTop: 10 },
        summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, paddingVertical: 5 },
        summaryDetailText: { marginLeft: 10, fontSize: 16, color: theme.text },
        upcomingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.subText },
        upcomingText: { flex: 1, color: theme.text },
        upcomingDetails: { flexDirection: 'row', alignItems: 'center' },
        upcomingDate: { marginRight: 10, color: theme.subText, fontSize: 12 },
        upcomingValue: { fontWeight: 'bold', color: theme.text },
        modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)'},
        modalContent: { backgroundColor: theme.cardBackground, padding: 20, borderRadius: 10, width: '90%', elevation: 5 },
        modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: theme.text },
        input: { borderWidth: 1, borderColor: theme.subText, padding: 10, marginBottom: 20, borderRadius: 6, color: theme.text },
        buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 10},
        modalButton: { flex: 1, marginHorizontal: 5 },
        goalText: { fontSize: 14, textAlign: 'center', color: theme.text, marginBottom: 4 },
        goalValue: { fontSize: 20, fontWeight: 'bold', color: theme.secondary },
        detailsLink: { marginTop: 10, fontSize: 12, color: theme.secondary, textDecorationLine: 'underline' },
        itemListContainer: { alignSelf: 'stretch', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: theme.subText, paddingHorizontal: 15 },
        itemListTitle: { fontSize: 12, color: theme.subText, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
        itemText: { fontSize: 12, color: theme.text, textAlign: 'center' },
        itemRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: theme.subText
        },
        noDataText: { textAlign: 'center', marginVertical: 10, color: theme.subText },
        datePickerButton: {
          width: '100%',
          padding: 10,
          borderWidth: 1,
          borderColor: theme.subText,
          borderRadius: 6,
          marginBottom: 10,
          justifyContent: 'center',
          alignItems: 'center'
        },
    });

    if (loading) { return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.text} /></View>; }

    const rendaTotalDoMes = rendaMensal + totalRendasExtras;
    const saldoDisponivel = rendaTotalDoMes - despesasPagasMes;
    const progresso = rendaTotalDoMes > 0 ? (despesasPagasMes / rendaTotalDoMes) : 0;

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollViewContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <Text style={styles.greeting}>Olá, {username}!</Text>
                <Text style={styles.title}>Resumo Financeiro</Text>

                {overdueExpenses.length > 0 && (
                    <TouchableOpacity onPress={() => navigation.navigate('Despesas', { initialTab: 'overdue' })}>
                        <Card style={[styles.card, styles.overdueCard]}>
                            <Card.Title 
                                title={`Você tem ${overdueExpenses.length} conta(s) atrasada(s)!`} 
                                titleStyle={styles.overdueTitle} 
                                left={() => <Ionicons name="alert-circle" size={24} color="#fff" />}
                            />
                        </Card>
                    </TouchableOpacity>
                )}

                <Card style={styles.card}>
                    <Card.Content>
                        <Text style={styles.summaryLabel}>Saldo Disponível do Mês</Text>
                        <Text style={[styles.summaryBalance, saldoDisponivel < 0 ? styles.negativeSaldo : styles.positiveSaldo]}>
                            R$ {saldoDisponivel.toFixed(2)}
                        </Text>
                        <ProgressBar 
                            progress={progresso} 
                            color={progresso > 0.8 ? theme.danger : theme.primary} 
                            style={styles.progressBar} 
                        />
                        <Text style={styles.progressText}>{`${(progresso * 100).toFixed(0)}% do seu orçamento utilizado`}</Text>
                        <View style={styles.summaryDetails}>
                            <TouchableOpacity onPress={() => navigation.navigate('Conta')} style={styles.summaryRow}>
                                <Ionicons name="arrow-up-circle-outline" size={20} color="green" />
                                <Text style={styles.summaryDetailText}>Renda Fixa: R$ {rendaMensal.toFixed(2)}</Text>
                                <Ionicons name="pencil" size={16} color={theme.subText} style={{marginLeft: 'auto'}} />
                            </TouchableOpacity>
                            <View style={styles.summaryRow}>
                                <Ionicons name="arrow-down-circle-outline" size={20} color="red" />
                                <Text style={styles.summaryDetailText}>Despesas Pagas: R$ {despesasPagasMes.toFixed(2)}</Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>
                
                <Card style={styles.card}>
                    <Card.Title 
                        titleStyle={{ color: theme.text, fontWeight: 'bold' }}
                        title={`Extras do Mês (R$ ${totalRendasExtras.toFixed(2)})`}
                        right={() => <Button icon="plus" onPress={() => setAddRendaExtraModalVisible(true)}>Adicionar</Button>}
                    />
                    <Card.Content>
                        {rendasExtras.length > 0 ? (
                            rendasExtras.map(renda => (
                                <View key={renda.id} style={styles.itemRow}>
                                    <Text style={{color: theme.text}}>{renda.nome}</Text>
                                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                        <Text style={{color: theme.primary, fontWeight: 'bold'}}>+ R$ {parseFloat(renda.valor).toFixed(2)}</Text>
                                        <IconButton icon="pencil" size={18} onPress={() => handleOpenEditRendaExtra(renda)} />
                                        <IconButton icon="trash-can-outline" iconColor={theme.danger} size={18} onPress={() => handleDeleteRendaExtra(renda.id)} />
                                    </View>
                                </View>
                            ))
                        ) : <Text style={styles.noDataText}>Nenhuma renda extra este mês.</Text>}
                    </Card.Content>
                </Card>

                {debtSavingsGoals.daily > 0 && (
                    <TouchableOpacity onPress={() => navigation.navigate('Dívidas')}>
                        <Card style={[styles.card, {backgroundColor: isDarkTheme ? '#2a2216' : '#fff8e1'}]}>
                            <Card.Title titleStyle={{ color: theme.text, fontWeight: 'bold' }} title="Meta para Quitar Dívidas" left={() => <Ionicons name="cash-outline" size={24} color={isDarkTheme ? "#fcd34d" : "#f57c00"} />}/>
                            <Card.Content style={{alignItems: 'center'}}>
                                <Paragraph style={styles.goalText}>Para quitar suas dívidas nos prazos, guarde:</Paragraph>
                                <Title style={styles.goalValue}>R$ {debtSavingsGoals.daily.toFixed(2)} por dia</Title>
                                <Paragraph style={styles.goalText}>ou</Paragraph>
                                <Title style={styles.goalValue}>R$ {debtSavingsGoals.monthly.toFixed(2)} por mês</Title>
                                <View style={styles.itemListContainer}>
                                    <Text style={styles.itemListTitle}>Considerando as dívidas:</Text>
                                    {homeDividas.map(divida => (<Text key={divida.id} style={styles.itemText}>- {divida.nome}</Text>))}
                                </View>
                                <Text style={styles.detailsLink}>Ver detalhes...</Text>
                            </Card.Content>
                        </Card>
                    </TouchableOpacity>
                )}

                {goalSavings.daily > 0 && (
                    <TouchableOpacity onPress={() => navigation.navigate('Metas')}>
                        <Card style={[styles.card, {backgroundColor: isDarkTheme ? '#152b36' : '#e3f2fd'}]}>
                            <Card.Title title="Meta para Planejamentos" titleStyle={{ color: theme.text, fontWeight: 'bold' }} left={() => <Ionicons name="star-outline" size={24} color={isDarkTheme ? "#64b5f6" : "#0d47a1"} />}/>
                            <Card.Content style={{alignItems: 'center'}}>
                                <Paragraph style={styles.goalText}>Para alcançar seus objetivos nos prazos, guarde:</Paragraph>
                                <Title style={[styles.goalValue, {color: isDarkTheme ? "#64b5f6" : "#0d47a1"}]}>R$ {goalSavings.daily.toFixed(2)} por dia</Title>
                                <Paragraph style={styles.goalText}>ou</Paragraph>
                                <Title style={[styles.goalValue, {color: isDarkTheme ? "#64b5f6" : "#0d47a1"}]}>R$ {goalSavings.monthly.toFixed(2)} por mês</Title>
                                <View style={styles.itemListContainer}>
                                    <Text style={styles.itemListTitle}>Considerando as metas:</Text>
                                    {homeMetas.map(meta => (<Text key={meta.id} style={styles.itemText}>- {meta.nome}</Text>))}
                                </View>
                                <Text style={styles.detailsLink}>Ver detalhes...</Text>
                            </Card.Content>
                        </Card>
                    </TouchableOpacity>
                )}

                {upcomingExpenses.length > 0 && (
                    <Card style={styles.card}>
                        <Card.Title titleStyle={{ color: theme.text, fontWeight: 'bold' }} title="Próximas a Vencer (30 dias)" />
                        <Card.Content>
                            {upcomingExpenses.map(expense => (
                                <View key={expense.id} style={styles.upcomingRow}>
                                    <Text style={styles.upcomingText}>{expense.nome}</Text>
                                    <View style={styles.upcomingDetails}>
                                        <Text style={styles.upcomingDate}>{new Date(expense.data_vencimento).toLocaleDateString()}</Text>
                                        <Text style={styles.upcomingValue}>R$ {parseFloat(expense.valor).toFixed(2)}</Text>
                                    </View>
                                </View>
                            ))}
                        </Card.Content>
                    </Card>
                )}

                <Modal visible={rendaModalVisible} onRequestClose={() => setRendaModalVisible(false)} transparent={true} animationType="fade">
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Title style={styles.modalTitle}>Atualizar Renda Mensal</Title>
                            <TextInput 
                                style={styles.input} 
                                placeholder="Digite o novo valor da renda" 
                                keyboardType="numeric" 
                                value={inputRenda || ''} 
                                onChangeText={setInputRenda} 
                            />
                            <View style={styles.buttonContainer}>
                                <Button mode="outlined" onPress={() => setRendaModalVisible(false)} style={styles.modalButton}>Cancelar</Button>
                                <Button mode="contained" onPress={handleUpdateRenda} style={styles.modalButton}>Salvar</Button>
                            </View>
                        </View>
                    </View>
                </Modal>
            </ScrollView>

            {/* Modais de Renda Extra */}
            {addRendaExtraModalVisible && (
                <Modal visible={addRendaExtraModalVisible} onRequestClose={() => setAddRendaExtraModalVisible(false)} transparent>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Title style={{ color: theme.text }}>Adicionar Renda Extra</Title>
                            <TextInput style={styles.input} placeholder="Descrição (ex: Freelance)" placeholderTextColor={theme.subText} value={newRendaExtra.nome} onChangeText={t => setNewRendaExtra({...newRendaExtra, nome: t})} />
                            <TextInput style={styles.input} placeholder="Valor" placeholderTextColor={theme.subText} keyboardType="numeric" value={newRendaExtra.valor} onChangeText={t => setNewRendaExtra({...newRendaExtra, valor: t})} />
                            <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker('new')}>
                                <Text style={{ color: theme.text }}>Data: {newRendaExtra.data_recebimento.toLocaleDateString()}</Text>
                            </TouchableOpacity>
                            {showDatePicker === 'new' && <DateTimePicker value={newRendaExtra.data_recebimento} mode="date" display="default" onChange={(e,d) => onChangeDate(e,d,'new')} />}
                            <View style={styles.buttonContainer}>
                                <Button mode="outlined" onPress={() => setAddRendaExtraModalVisible(false)}>Cancelar</Button>
                                <Button mode="contained" onPress={handleAddRendaExtra}>Salvar</Button>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}

            {editingRendaExtra && (
                <Modal visible={editRendaExtraModalVisible} onRequestClose={() => setEditRendaExtraModalVisible(false)} transparent>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Title style={{ color: theme.text }}>Editar Renda Extra</Title>
                            <TextInput style={styles.input} placeholder="Descrição" placeholderTextColor={theme.subText} value={editingRendaExtra.nome} onChangeText={t => setEditingRendaExtra({...editingRendaExtra, nome: t})} />
                            <TextInput style={styles.input} placeholder="Valor" placeholderTextColor={theme.subText} keyboardType="numeric" value={String(editingRendaExtra.valor)} onChangeText={t => setEditingRendaExtra({...editingRendaExtra, valor: t})} />
                            <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker('edit')}>
                                <Text style={{ color: theme.text }}>Data: {editingRendaExtra.data_recebimento.toLocaleDateString()}</Text>
                            </TouchableOpacity>
                            {showDatePicker === 'edit' && <DateTimePicker value={editingRendaExtra.data_recebimento} mode="date" display="default" onChange={(e,d) => onChangeDate(e,d,'edit')} />}
                            <View style={styles.buttonContainer}>
                                <Button mode="outlined" onPress={() => setEditRendaExtraModalVisible(false)}>Cancelar</Button>
                                <Button mode="contained" onPress={handleUpdateRendaExtra}>Salvar</Button>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}