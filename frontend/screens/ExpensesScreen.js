// frontend/screens/ExpensesScreen.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, FAB, Menu, IconButton } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

export default function ExpensesScreen({ route, navigation }) {
    const { api } = useContext(AuthContext);
    const { theme, isDarkTheme } = useContext(ThemeContext);
    const [despesas, setDespesas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTab, setSelectedTab] = useState('current');
    const [parcelamentos, setParcelamentos] = useState([]);
    const [fabOpen, setFabOpen] = useState(false);
    const [totalPagoMes, setTotalPagoMes] = useState(0);
    const [totalPagoGeral, setTotalPagoGeral] = useState(0);

    const [expenseModalVisible, setExpenseModalVisible] = useState(false);
    const [parcelamentoModalVisible, setParcelamentoModalVisible] = useState(false);

    const [newExpense, setNewExpense] = useState({ nome: '', valor: '', data_vencimento: new Date(), categoria: 'outros' });
    const [newParcelamento, setNewParcelamento] = useState({
        nome: '',
        valor_total: '',
        numero_parcelas: '',
        data_compra: new Date(),
        data_primeira_parcela: new Date(),
    });

    const [showExpensePicker, setShowExpensePicker] = useState(false);
    const [showCompraPicker, setShowCompraPicker] = useState(false);
    const [showPrimeiraParcelaPicker, setShowPrimeiraParcelaPicker] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [showEditDatePicker, setShowEditDatePicker] = useState(false);
    const [visibleExpenseMenu, setVisibleExpenseMenu] = useState(null);

    const [editParcelamentoModalVisible, setEditParcelamentoModalVisible] = useState(false);
    const [editingParcelamento, setEditingParcelamento] = useState(null);
    const [visibleParcelamentoMenu, setVisibleParcelamentoMenu] = useState(null);

    const [categorias, setCategorias] = useState([]);
    const [addCategoriaModalVisible, setAddCategoriaModalVisible] = useState(false);
    const [editCategoriaModalVisible, setEditCategoriaModalVisible] = useState(false);
    const [editingCategoria, setEditingCategoria] = useState(null);
    const [newCategoria, setNewCategoria] = useState({ nome: '', icone: '' });
    const [iconListModalVisible, setIconListModalVisible] = useState(false);

    useEffect(() => {
        if (route.params?.initialTab) {
            setSelectedTab(route.params.initialTab);
            navigation.setParams({ initialTab: undefined });
        }
    }, [route.params?.initialTab]);

    const tabNames = {
        current: 'Mês Atual',
        future: 'Próximos',
        overdue: 'Atrasadas',
        paid: 'Pagas',
        parcelados: 'Parcelados',
    };

    const fetchCategorias = async () => {
        try {
            const response = await api.get('/categorias');
            setCategorias(response.data);
        } catch (error) {
            console.error('Erro ao buscar categorias:', error);
            Alert.alert('Erro', 'Não foi possível carregar as categorias.');
        }
    };

    const fetchData = async () => {
        try {
            setRefreshing(true);
            const [despesasResponse, parcelamentosResponse] = await Promise.all([
                api.get('/despesas'),
                api.get('/parcelamentos')
            ]);

            const todasDespesas = despesasResponse.data;
            setDespesas(todasDespesas);
            setParcelamentos(parcelamentosResponse.data);

            const hoje = new Date();
            const mesAtual = hoje.getMonth();
            const anoAtual = hoje.getFullYear();

            const totalPagoNoMes = todasDespesas
                .filter(d => d.data_pagamento && new Date(d.data_pagamento).getMonth() === mesAtual && new Date(d.data_pagamento).getFullYear() === anoAtual)
                .reduce((sum, d) => sum + parseFloat(d.valor), 0);
            setTotalPagoMes(totalPagoNoMes);

            const totalGeralPago = todasDespesas
                .filter(d => d.data_pagamento !== null)
                .reduce((sum, d) => sum + parseFloat(d.valor), 0);
            setTotalPagoGeral(totalGeralPago);

        } catch (error) {
            console.error('Erro ao buscar dados:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => {
        fetchData();
        fetchCategorias();
    }, []));

    const onRefresh = () => {
        fetchData();
        fetchCategorias();
    };

    const handleAddExpense = async () => {
        if (!newExpense.nome || !newExpense.valor || !newExpense.data_vencimento || !newExpense.categoria) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios.');
            return;
        }
        try {
            await api.post('/despesas', {
                ...newExpense,
                valor: parseFloat(newExpense.valor),
                data_vencimento: newExpense.data_vencimento.toISOString().split('T')[0],
            });
            Alert.alert('Sucesso', 'Despesa adicionada com sucesso!');
            setExpenseModalVisible(false);
            setNewExpense({ nome: '', valor: '', data_vencimento: new Date(), categoria: 'outros' });
            fetchData();
        } catch (error) {
            console.error('Erro ao adicionar despesa:', error);
            Alert.alert('Erro', 'Não foi possível adicionar a despesa.');
        }
    };

    const handleAddParcelamento = async () => {
        if (!newParcelamento.nome || !newParcelamento.valor_total || !newParcelamento.numero_parcelas) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos do parcelamento.');
            return;
        }
        try {
            await api.post('/parcelamentos', {
                ...newParcelamento,
                valor_total: parseFloat(newParcelamento.valor_total),
                numero_parcelas: parseInt(newParcelamento.numero_parcelas, 10),
                data_compra: newParcelamento.data_compra.toISOString().split('T')[0],
                data_primeira_parcela: newParcelamento.data_primeira_parcela.toISOString().split('T')[0],
            });
            Alert.alert('Sucesso', 'Compra parcelada registrada!');
            setParcelamentoModalVisible(false);
            setNewParcelamento({ nome: '', valor_total: '', numero_parcelas: '', data_compra: new Date(), data_primeira_parcela: new Date() });
            fetchData();
        } catch (error) {
            console.error('Erro ao adicionar parcelamento:', error);
            Alert.alert('Erro', 'Não foi possível registrar o parcelamento.');
        }
    };

    const handleAddCategoria = async () => {
        if (!newCategoria.nome || !newCategoria.icone) {
            Alert.alert('Erro', 'Nome e ícone são obrigatórios.');
            return;
        }
        try {
            await api.post('/categorias', newCategoria);
            Alert.alert('Sucesso', 'Categoria adicionada!');
            setAddCategoriaModalVisible(false);
            setNewCategoria({ nome: '', icone: '' });
            fetchCategorias();
        } catch (error) {
            console.error('Erro ao adicionar categoria:', error);
            Alert.alert('Erro', 'Não foi possível adicionar a categoria.');
        }
    };
    
    const handleUpdateCategoria = async () => {
        if (!editingCategoria?.nome || !editingCategoria?.icone) {
            Alert.alert('Erro', 'Nome e ícone são obrigatórios.');
            return;
        }
        try {
            await api.put(`/categorias/${editingCategoria.id}`, { nome: editingCategoria.nome, icone: editingCategoria.icone });
            Alert.alert('Sucesso', 'Categoria atualizada!');
            setEditCategoriaModalVisible(false);
            setEditingCategoria(null);
            fetchCategorias();
        } catch (error) {
            console.error('Erro ao atualizar categoria:', error);
            Alert.alert('Erro', 'Não foi possível atualizar a categoria.');
        }
    };
    
    const handleDeleteCategoria = (id) => {
        Alert.alert("Confirmar Exclusão", "Você tem certeza que deseja excluir esta categoria? As despesas associadas a ela não terão mais uma categoria.",
            [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: async () => {
                try {
                    await api.delete(`/categorias/${id}`);
                    Alert.alert("Sucesso", "Categoria excluída.");
                    fetchCategorias();
                } catch (error) {
                    console.error("Erro ao excluir categoria:", error);
                    Alert.alert("Erro", "Não foi possível excluir a categoria.");
                }
            },},]
        );
    };

    const handleMarkAsPaid = async (id) => {
        try {
            await api.put(`/despesas/${id}/pagar`, { data_pagamento: new Date().toISOString().split('T')[0], });
            Alert.alert('Sucesso', 'Despesa marcada como paga!');
            fetchData();
        } catch (error) {
            console.error('Erro ao marcar despesa como paga:', error);
            Alert.alert('Erro', 'Não foi possível marcar a despesa como paga.');
        }
    };

    const onChangeExpenseDate = (event, selectedDate) => { setShowExpensePicker(false); if (selectedDate) { setNewExpense({ ...newExpense, data_vencimento: selectedDate }); } };
    const onChangeCompraDate = (event, selectedDate) => { setShowCompraPicker(false); if (selectedDate) { setNewParcelamento({ ...newParcelamento, data_compra: selectedDate }); } };
    const onChangePrimeiraParcelaDate = (event, selectedDate) => { setShowPrimeiraParcelaPicker(false); if (selectedDate) { setNewParcelamento({ ...newParcelamento, data_primeira_parcela: selectedDate }); } };

    const openExpenseMenu = (expenseId) => setVisibleExpenseMenu(expenseId);
    const closeExpenseMenu = () => setVisibleExpenseMenu(null);

    const handleDeleteExpense = (id) => {
        closeExpenseMenu();
        Alert.alert("Confirmar Exclusão", "Você tem certeza que deseja excluir esta despesa?",
            [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: async () => {
                try {
                    await api.delete(`/despesas/${id}`);
                    Alert.alert("Sucesso", "Despesa excluída.");
                    fetchData();
                } catch (error) {
                    console.error("Erro ao excluir despesa:", error);
                    Alert.alert("Erro", "Não foi possível excluir a despesa.");
                }
            }, }, ]
        );
    };

    const handleOpenEditModal = (expense) => {
        const [year, month, day] = expense.data_vencimento.split('T')[0].split('-');
        setEditingExpense({ ...expense, valor: String(expense.valor), data_vencimento: new Date(year, month - 1, day) });
        setEditModalVisible(true);
        closeExpenseMenu();
    };

    const handleUpdateExpense = async () => {
        if (!editingExpense) return;
        try {
            await api.put(`/despesas/${editingExpense.id}`, {
                ...editingExpense,
                valor: parseFloat(editingExpense.valor),
                data_vencimento: editingExpense.data_vencimento.toISOString().split('T')[0],
            });
            Alert.alert("Sucesso", "Despesa atualizada!");
            setEditModalVisible(false);
            setEditingExpense(null);
            fetchData();
        } catch (error) {
            console.error("Erro ao atualizar despesa:", error);
            Alert.alert("Erro", "Não foi possível atualizar a despesa.");
        }
    };

    const onChangeEditDate = (event, selectedDate) => {
        setShowEditDatePicker(false);
        if (selectedDate && editingExpense) {
            setEditingExpense({ ...editingExpense, data_vencimento: selectedDate });
        }
    };

    const openParcelamentoMenu = (id) => setVisibleParcelamentoMenu(id);
    const closeParcelamentoMenu = () => setVisibleParcelamentoMenu(null);

    const handleOpenEditParcelamentoModal = (parcelamento) => {
        const categoria = getCategoryForParcelamento(parcelamento.id);
        setEditingParcelamento({ ...parcelamento, categoria });
        setEditParcelamentoModalVisible(true);
        closeParcelamentoMenu();
    };

    const handleUpdateParcelamento = async () => {
        if (!editingParcelamento) return;
        if (!editingParcelamento.nome || !editingParcelamento.categoria) {
            Alert.alert('Erro', 'Nome e categoria são obrigatórios.');
            return;
        }

        try {
            await api.put(`/parcelamentos/${editingParcelamento.id}`, { 
                nome: editingParcelamento.nome,
                categoria: editingParcelamento.categoria,
            });
            Alert.alert("Sucesso", "Parcelamento atualizado!");
            setEditParcelamentoModalVisible(false);
            setEditingParcelamento(null);
            fetchData();
        } catch (error) {
            console.error("Erro ao atualizar parcelamento:", error);
            Alert.alert("Erro", "Não foi possível atualizar o parcelamento.");
        }
    };

    const handleDeleteParcelamento = (id) => {
        closeParcelamentoMenu();
        Alert.alert(
            "Confirmar Exclusão",
            "Isso excluirá a compra e TODAS as suas parcelas. Deseja continuar?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Excluir", style: "destructive", onPress: async () => {
                        try {
                            await api.delete(`/parcelamentos/${id}`);
                            Alert.alert("Sucesso", "Compra parcelada excluída.");
                            fetchData();
                        } catch (error) {
                            console.error("Erro ao excluir parcelamento:", error);
                            Alert.alert("Erro", "Não foi possível excluir o parcelamento.");
                        }
                    },
                },
            ]
        );
    };

    const filterExpenses = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return despesas.filter(despesa => {
            const dueDate = new Date(despesa.data_vencimento);
            dueDate.setUTCHours(0, 0, 0, 0);
            if (selectedTab === 'current') {
                const currentMonth = today.getMonth();
                const currentYear = today.getFullYear();
                return dueDate.getUTCMonth() === currentMonth && dueDate.getUTCFullYear() === currentYear;
            } else if (selectedTab === 'future') {
                return dueDate > today;
            } else if (selectedTab === 'overdue') {
                return dueDate < today && despesa.data_pagamento === null;
            } else if (selectedTab === 'paid') {
                return despesa.data_pagamento !== null;
            }
            return false;
        });
    };

    const openMenu = () => setMenuVisible(true);
    const closeMenu = () => setMenuVisible(false);

    const selectTab = (tab) => {
        closeMenu();
        setTimeout(() => {
            setSelectedTab(tab);
        }, 100);
    };

    const getIconForCategory = (categoryName) => {
        const categoria = categorias.find(c => c.nome === categoryName);
        return categoria ? categoria.icone : 'help-circle-outline';
    };

    const getCategoryForParcelamento = (parcelamentoId) => {
        const despesa = despesas.find(d => d.compra_parcelada_id === parcelamentoId);
        return despesa ? despesa.categoria : 'outros';
    };

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        title: { fontSize: 28, fontWeight: 'bold', margin: 20, textAlign: 'center', color: theme.text },
        loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        summaryCard: { marginHorizontal: 20, marginBottom: 10, backgroundColor: isDarkTheme ? '#1e303c' : '#e7f5ff', elevation: 2 },
        summaryCardContent: { alignItems: 'center', padding: 10 },
        summaryText: { fontSize: 16, color: isDarkTheme ? '#a5d3f2' : '#005f9e' },
        summaryValue: { fontSize: 24, fontWeight: 'bold', color: isDarkTheme ? '#a5d3f2' : '#005f9e' },
        menuContainer: { paddingHorizontal: 20, marginBottom: 20, alignItems: 'flex-start' },
        menuAnchorButton: { backgroundColor: theme.cardBackground, elevation: 2, borderWidth: 1, borderColor: theme.subText, },
        listContainer: { flex: 1, paddingHorizontal: 20 },
        expenseCard: { marginBottom: 10, elevation: 2, backgroundColor: theme.cardBackground },
        noDataText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: theme.subText },
        modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
        modalContent: { backgroundColor: theme.cardBackground, padding: 20, borderRadius: 10, width: '90%', elevation: 5 },
        modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: theme.text },
        input: { borderWidth: 1, borderColor: theme.subText, padding: 10, marginBottom: 10, borderRadius: 6, backgroundColor: isDarkTheme ? '#333' : '#fff', color: theme.text },
        datePickerButton: { width: '100%', padding: 10, borderWidth: 1, borderColor: theme.subText, borderRadius: 6, marginBottom: 10, justifyContent: 'center', alignItems: 'center' },
        picker: { color: theme.text, backgroundColor: theme.cardBackground },
        iconListModalContent: { backgroundColor: theme.cardBackground, padding: 20, borderRadius: 10, width: '90%', elevation: 5, height: '80%' },
        iconListContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', },
        iconOption: { padding: 10, margin: 5, borderWidth: 1, borderColor: theme.subText, borderRadius: 8, },
        categoriaListContainer: { maxHeight: 200, width: '100%', borderWidth: 1, borderColor: theme.subText, borderRadius: 6, marginTop: 10, },
        categoriaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: theme.subText },
        categoriaName: { fontSize: 16, color: theme.text },
        newCategoriaContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, },
        iconSelectButton: { borderWidth: 1, borderColor: theme.subText, borderRadius: 6, padding: 5, justifyContent: 'center', alignItems: 'center', },
    });

    if (loading) {
        return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.text} /></View>;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Minhas Despesas</Text>

            <Card style={styles.summaryCard}>
                <Card.Content style={styles.summaryCardContent}>
                    <Paragraph style={styles.summaryText}>Total Pago no Mês Atual</Paragraph>
                    <Title style={styles.summaryValue}>R$ {totalPagoMes.toFixed(2)}</Title>
                </Card.Content>
            </Card>

            <View style={styles.menuContainer}>
                <Menu visible={menuVisible} onDismiss={closeMenu} anchor={<Button icon="chevron-down" mode="outlined" onPress={openMenu} style={styles.menuAnchorButton} contentStyle={{ flexDirection: 'row-reverse' }} labelStyle={{ color: theme.text }}>{tabNames[selectedTab]}</Button>}>
                    <Menu.Item onPress={() => selectTab('current')} title="Mês Atual" />
                    <Menu.Item onPress={() => selectTab('future')} title="Próximos" />
                    <Menu.Item onPress={() => selectTab('overdue')} title="Atrasadas" />
                    <Menu.Item onPress={() => selectTab('paid')} title="Pagas" />
                    <Menu.Item onPress={() => selectTab('parcelados')} title="Parcelados" />
                </Menu>
            </View>

            <ScrollView
                style={styles.listContainer}
                contentContainerStyle={{ paddingBottom: 140 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />}
            >
                {selectedTab === 'parcelados' ? (
                    parcelamentos.length > 0 ? (
                        parcelamentos.map(item => {
                            const categoria = getCategoryForParcelamento(item.id);
                            const icone = getIconForCategory(categoria);
                            return (
                                <Card key={item.id} style={styles.expenseCard}>
                                    <Card.Title
                                        title={item.nome}
                                        titleStyle={{ paddingTop: 10, color: theme.text }}
                                        left={(props) => <Ionicons {...props} name={icone} size={24} color={theme.text} />}
                                        right={(props) => (
                                            <Menu visible={visibleParcelamentoMenu === item.id} onDismiss={closeParcelamentoMenu} anchor={<IconButton {...props} icon="dots-vertical" onPress={() => openParcelamentoMenu(item.id)} />}>
                                                <Menu.Item onPress={() => handleOpenEditParcelamentoModal(item)} title="Editar" />
                                                <Menu.Item onPress={() => handleDeleteParcelamento(item.id)} title="Excluir Compra" titleStyle={{ color: theme.danger }} />
                                            </Menu>
                                        )}
                                    />
                                    <Card.Content>
                                        <Paragraph style={{ color: theme.subText }}>Categoria: {categoria}</Paragraph>
                                        <Paragraph style={{ color: theme.text }}>Valor Total: <Text style={{fontWeight: 'bold'}}>R$ {parseFloat(item.valor_total).toFixed(2)}</Text></Paragraph>
                                        <Paragraph style={{ color: theme.text }}>Parcelas: {item.numero_parcelas}x de <Text style={{fontWeight: 'bold'}}>R$ {(item.valor_total / item.numero_parcelas).toFixed(2)}</Text></Paragraph>
                                        <Paragraph style={{ color: theme.subText }}>Data da Compra: {new Date(item.data_compra).toLocaleDateString()}</Paragraph>
                                    </Card.Content>
                                </Card>
                            );
                        })
                    ) : <Text style={styles.noDataText}>Nenhuma compra parcelada registrada.</Text>
                ) : (
                    <>
                        {selectedTab === 'paid' && (
                            <Card style={[styles.summaryCard, { backgroundColor: isDarkTheme ? '#1c301c' : '#e8f5e9', marginHorizontal: 0 }]}>
                                <Card.Content style={styles.summaryCardContent}>
                                    <Paragraph style={[styles.summaryText, { color: isDarkTheme ? '#a1d9a1' : '#1b5e20' }]}>Histórico Total Pago</Paragraph>
                                    <Title style={[styles.summaryValue, { color: isDarkTheme ? '#a1d9a1' : '#1b5e20' }]}>R$ {totalPagoGeral.toFixed(2)}</Title>
                                </Card.Content>
                            </Card>
                        )}
                        {filterExpenses().length > 0 ? (
                            filterExpenses().map(despesa => (
                                <Card key={despesa.id} style={styles.expenseCard}>
                                  <Card.Title 
                                      title={despesa.nome} 
                                      titleStyle={{paddingTop: 10, color: theme.text}} 
                                      left={(props) => <Ionicons {...props} name={getIconForCategory(despesa.categoria)} size={24} color={theme.text} />}
                                      right={(props) => (
                                          <Menu visible={visibleExpenseMenu === despesa.id} onDismiss={closeExpenseMenu} anchor={<IconButton {...props} icon="dots-vertical" onPress={() => openExpenseMenu(despesa.id)} />}>
                                              <Menu.Item onPress={() => handleOpenEditModal(despesa)} title="Editar" />
                                              <Menu.Item onPress={() => handleDeleteExpense(despesa.id)} title="Excluir" titleStyle={{ color: theme.danger }} />
                                          </Menu>
                                      )} />
                                    <Card.Content>
                                        <Paragraph style={{ color: theme.subText }}>Valor: <Text style={{fontWeight: 'bold', color: theme.text}}>R$ {parseFloat(despesa.valor).toFixed(2)}</Text></Paragraph>
                                        <Paragraph style={{ color: theme.subText }}>Vencimento: <Text style={{fontWeight: 'bold', color: theme.text}}>{new Date(despesa.data_vencimento).toLocaleDateString()}</Text></Paragraph>
                                        <Paragraph style={{ color: theme.subText }}>Categoria: <Text style={{fontWeight: 'bold', color: theme.text}}>{despesa.categoria}</Text></Paragraph>
                                        {!despesa.data_pagamento && (<Button mode="contained" onPress={() => handleMarkAsPaid(despesa.id)} style={{ marginTop: 10, backgroundColor: theme.primary }} labelStyle={{color: '#fff'}}>Marcar como Paga</Button>)}
                                        {despesa.data_pagamento && (<Paragraph style={{ fontWeight: 'bold', color: 'green', marginTop: 8 }}>Pago em: {new Date(despesa.data_pagamento).toLocaleDateString()}</Paragraph>)}
                                    </Card.Content>
                                </Card>
                            ))
                        ) : <Text style={styles.noDataText}>Nenhuma despesa encontrada para esta categoria.</Text>}
                    </>
                )}
            </ScrollView>

            {/* Novo FAB estilizado */}
<View style={{ position: 'absolute', bottom: 25, right: 25, alignItems: 'center' }}>
  {fabOpen && (
    <View style={{ marginBottom: 10, alignItems: 'flex-end' }}>
      <TouchableOpacity
        onPress={() => { setAddCategoriaModalVisible(true); setFabOpen(false); }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.cardBackground,
          paddingVertical: 8,
          paddingHorizontal: 15,
          borderRadius: 30,
          marginBottom: 12,
          elevation: 5,
        }}
      >
        <Ionicons name="list-box-outline" size={22} color={theme.text} style={{ marginRight: 8 }} />
        <Text style={{ color: theme.text, fontWeight: '500' }}>Gerenciar Categorias</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => { setParcelamentoModalVisible(true); setFabOpen(false); }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.cardBackground,
          paddingVertical: 8,
          paddingHorizontal: 15,
          borderRadius: 30,
          marginBottom: 12,
          elevation: 5,
        }}
      >
        <Ionicons name="card-outline" size={22} color={theme.text} style={{ marginRight: 8 }} />
        <Text style={{ color: theme.text, fontWeight: '500' }}>Novo Parcelamento</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => { setExpenseModalVisible(true); setFabOpen(false); }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.cardBackground,
          paddingVertical: 8,
          paddingHorizontal: 15,
          borderRadius: 30,
          marginBottom: 12,
          elevation: 5,
        }}
      >
        <Ionicons name="cash-outline" size={22} color={theme.text} style={{ marginRight: 8 }} />
        <Text style={{ color: theme.text, fontWeight: '500' }}>Nova Despesa</Text>
      </TouchableOpacity>
    </View>
  )}

  <TouchableOpacity
    onPress={() => setFabOpen(!fabOpen)}
    style={{
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: fabOpen ? theme.danger : theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 6,
    }}
  >
    <Ionicons name={fabOpen ? 'close' : 'add'} size={32} color="#fff" />
  </TouchableOpacity>
</View>

            <Modal visible={expenseModalVisible} onRequestClose={() => setExpenseModalVisible(false)} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        <Text style={styles.modalTitle}>Adicionar Nova Despesa</Text>
                        <TextInput style={styles.input} placeholder="Nome da Despesa" placeholderTextColor={theme.subText} value={newExpense.nome} onChangeText={(text) => setNewExpense({ ...newExpense, nome: text })} />
                        <TextInput style={styles.input} placeholder="Valor" placeholderTextColor={theme.subText} keyboardType="numeric" value={newExpense.valor} onChangeText={(text) => setNewExpense({ ...newExpense, valor: text })} />
                        <TouchableOpacity onPress={() => setShowExpensePicker(true)} style={styles.datePickerButton}>
                            <Text style={{ color: theme.text }}>Data de Vencimento: {newExpense.data_vencimento.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                        {showExpensePicker && <DateTimePicker value={newExpense.data_vencimento} mode="date" display="default" onChange={onChangeExpenseDate} />}
                        <Picker selectedValue={newExpense.categoria} style={styles.picker} onValueChange={(itemValue) => setNewExpense({ ...newExpense, categoria: itemValue })}>
                            {categorias.map(cat => (
                                <Picker.Item key={cat.id} label={cat.nome} value={cat.nome} />
                            ))}
                        </Picker>
                        <Button mode="contained" onPress={handleAddExpense} style={{ marginBottom: 10, backgroundColor: theme.primary }} labelStyle={{color: '#fff'}}>Adicionar Despesa</Button>
                        <Button mode="outlined" onPress={() => setExpenseModalVisible(false)}>Cancelar</Button>
                    </ScrollView>
                </View>
            </Modal>

            <Modal visible={parcelamentoModalVisible} onRequestClose={() => setParcelamentoModalVisible(false)} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        <Text style={styles.modalTitle}>Registrar Compra Parcelada</Text>
                        <TextInput style={styles.input} placeholder="Nome do Produto (ex: PS5)" placeholderTextColor={theme.subText} value={newParcelamento.nome} onChangeText={(text) => setNewParcelamento({ ...newParcelamento, nome: text })} />
                        <TextInput style={styles.input} placeholder="Valor Total (ex: 4500.00)" placeholderTextColor={theme.subText} keyboardType="numeric" value={newParcelamento.valor_total} onChangeText={(text) => setNewParcelamento({ ...newParcelamento, valor_total: text })} />
                        <TextInput style={styles.input} placeholder="Número de Parcelas (ex: 10)" placeholderTextColor={theme.subText} keyboardType="numeric" value={newParcelamento.numero_parcelas} onChangeText={(text) => setNewParcelamento({ ...newParcelamento, numero_parcelas: text })} />
                        <TouchableOpacity onPress={() => setShowCompraPicker(true)} style={styles.datePickerButton}>
                            <Text style={{ color: theme.text }}>Data da Compra: {newParcelamento.data_compra.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                        {showCompraPicker && <DateTimePicker value={newParcelamento.data_compra} mode="date" display="default" onChange={onChangeCompraDate} />}
                        <TouchableOpacity onPress={() => setShowPrimeiraParcelaPicker(true)} style={styles.datePickerButton}>
                            <Text style={{ color: theme.text }}>Vencimento da 1ª Parcela: {newParcelamento.data_primeira_parcela.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                        {showPrimeiraParcelaPicker && <DateTimePicker value={newParcelamento.data_primeira_parcela} mode="date" display="default" onChange={onChangePrimeiraParcelaDate} />}
                        <Button mode="contained" onPress={handleAddParcelamento} style={{ marginBottom: 10, backgroundColor: theme.primary }} labelStyle={{color: '#fff'}}>Registrar Compra</Button>
                        <Button mode="outlined" onPress={() => setParcelamentoModalVisible(false)}>Cancelar</Button>
                    </ScrollView>
                </View>
            </Modal>

            <Modal visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        <Text style={styles.modalTitle}>Editar Despesa</Text>
                        <TextInput style={styles.input} placeholder="Nome da Despesa" placeholderTextColor={theme.subText} value={editingExpense?.nome} onChangeText={(text) => setEditingExpense({ ...editingExpense, nome: text })} />
                        <TextInput style={styles.input} placeholder="Valor" placeholderTextColor={theme.subText} keyboardType="numeric" value={editingExpense?.valor} onChangeText={(text) => setEditingExpense({ ...editingExpense, valor: text })} />
                        <TouchableOpacity onPress={() => setShowEditDatePicker(true)} style={styles.datePickerButton}>
                            <Text style={{ color: theme.text }}>Data de Vencimento: {editingExpense?.data_vencimento.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                        {showEditDatePicker && <DateTimePicker value={editingExpense?.data_vencimento} mode="date" display="default" onChange={onChangeEditDate} />}
                        <Picker selectedValue={editingExpense?.categoria} style={styles.picker} onValueChange={(itemValue) => setEditingExpense({ ...editingExpense, categoria: itemValue })}>
                            {categorias.map(cat => (
                                <Picker.Item key={cat.id} label={cat.nome} value={cat.nome} />
                            ))}
                        </Picker>
                        <Button mode="contained" onPress={handleUpdateExpense} style={{ marginBottom: 10, backgroundColor: theme.primary }} labelStyle={{color: '#fff'}}>Salvar Alterações</Button>
                        <Button mode="outlined" onPress={() => setEditModalVisible(false)}>Cancelar</Button>
                    </ScrollView>
                </View>
            </Modal>

            <Modal visible={editParcelamentoModalVisible} onRequestClose={() => setEditParcelamentoModalVisible(false)} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Editar Compra Parcelada</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nome da Compra"
                            placeholderTextColor={theme.subText}
                            value={editingParcelamento?.nome}
                            onChangeText={(text) => setEditingParcelamento({ ...editingParcelamento, nome: text })}
                        />
                        <Picker
                            selectedValue={editingParcelamento?.categoria}
                            style={styles.picker}
                            onValueChange={(itemValue) => setEditingParcelamento({ ...editingParcelamento, categoria: itemValue })}
                        >
                            {categorias.map(cat => (
                                <Picker.Item key={cat.id} label={cat.nome} value={cat.nome} />
                            ))}
                        </Picker>
                        <Button mode="contained" onPress={handleUpdateParcelamento} style={{ marginBottom: 10, backgroundColor: theme.primary }} labelStyle={{color: '#fff'}}>Salvar Alterações</Button>
                        <Button mode="outlined" onPress={() => setEditParcelamentoModalVisible(false)}>Cancelar</Button>
                    </View>
                </View>
            </Modal>

            <Modal visible={addCategoriaModalVisible} onRequestClose={() => setAddCategoriaModalVisible(false)} transparent animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Gerenciar Categorias</Text>

                        {/* Adicionar nova categoria */}
                        <View style={styles.newCategoriaContainer}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginRight: 10 }]}
                                placeholder="Nome da Categoria"
                                placeholderTextColor={theme.subText}
                                value={newCategoria.nome}
                                onChangeText={(text) => setNewCategoria({ ...newCategoria, nome: text })}
                            />
                            <TouchableOpacity style={styles.iconSelectButton} onPress={() => setIconListModalVisible(true)}>
                                <Ionicons name={newCategoria.icone || 'add-circle-outline'} size={28} color={theme.text} />
                            </TouchableOpacity>
                            <IconButton icon="check-circle" size={30} onPress={handleAddCategoria} iconColor={theme.primary}/>
                        </View>

                        {/* Lista de categorias existentes */}
                        <ScrollView style={styles.categoriaListContainer}>
                            {categorias.map(cat => (
                                <View key={cat.id} style={styles.categoriaRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name={cat.icone} size={24} color={theme.text} style={{ marginRight: 10 }} />
                                        <Text style={styles.categoriaName}>{cat.nome}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row' }}>
                                        <IconButton icon="pencil" size={20} onPress={() => { setEditingCategoria(cat); setEditCategoriaModalVisible(true); setAddCategoriaModalVisible(false); }} />
                                        <IconButton icon="delete" size={20} iconColor={theme.danger} onPress={() => handleDeleteCategoria(cat.id)} />
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <Button mode="outlined" onPress={() => setAddCategoriaModalVisible(false)} style={{ marginTop: 10 }}>
                            Fechar
                        </Button>
                    </View>
                </View>
            </Modal>

            
         <Modal visible={editCategoriaModalVisible} onRequestClose={() => setEditCategoriaModalVisible(false)} transparent animationType="slide">
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Editar Categoria</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Nome da Categoria"
                        placeholderTextColor={theme.subText}
                        value={editingCategoria?.nome}
                        onChangeText={(text) => setEditingCategoria({ ...editingCategoria, nome: text })}
                    />

                    <TouchableOpacity style={styles.iconSelectButton} onPress={() => setIconListModalVisible(true)}>
                        <Ionicons name={editingCategoria?.icone || 'add-circle-outline'} size={30} color={theme.text} />
                        <Text style={{ color: theme.text, marginLeft: 8 }}>
                            {editingCategoria?.icone ? editingCategoria.icone : 'Selecionar ícone'}
                        </Text>
                    </TouchableOpacity>

                    <Button mode="contained" onPress={handleUpdateCategoria} style={{ marginTop: 15, backgroundColor: theme.primary }} labelStyle={{color: '#fff'}}>
                        Salvar Alterações
                    </Button>
                    <Button mode="outlined" onPress={() => setEditCategoriaModalVisible(false)} style={{ marginTop: 10 }}>
                        Cancelar
                    </Button>
                </View>
            </View>
        </Modal>

            <Modal visible={iconListModalVisible} onRequestClose={() => setIconListModalVisible(false)} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.iconListModalContent}>
                        <Text style={styles.modalTitle}>Selecione um Ícone</Text>
                        <ScrollView contentContainerStyle={styles.iconListContainer}>
                            {iconOptions.map((icon, index) => (
                                <TouchableOpacity key={index} style={styles.iconOption} onPress={() => {
                                    if (addCategoriaModalVisible) {
                                        setNewCategoria({ ...newCategoria, icone: icon });
                                    } else if (editCategoriaModalVisible) {
                                        setEditingCategoria({ ...editingCategoria, icone: icon });
                                    }
                                    setIconListModalVisible(false);
                                }}>
                                    <Ionicons name={icon} size={30} color={theme.text} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <Button mode="outlined" onPress={() => setIconListModalVisible(false)}>Fechar</Button>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const iconOptions = [
    'fast-food-outline', 'home-outline', 'bus-outline', 'car-outline', 'bicycle-outline',
    'medkit-outline', 'fitness-outline', 'heart-outline', 'school-outline', 'book-outline',
    'happy-outline', 'game-controller-outline', 'tv-outline', 'shirt-outline',
    'cash-outline', 'wallet-outline', 'card-outline', 'basket-outline',
];