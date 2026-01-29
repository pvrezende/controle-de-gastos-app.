// frontend/screens/ExpensesScreen.js
import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
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
    Dimensions, 
    Animated,
    Switch,
    FlatList 
} from 'react-native';
import { Card, Title, Paragraph, Button, FAB, Menu, IconButton, List } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Componente de Seleção de Data Customizado
 */
const CustomDatePicker = ({ value, onChange, label, theme, isDarkTheme, showPicker, setShowPicker }) => {
    if (Platform.OS === 'web') {
        return (
            <View style={{ marginBottom: 15, width: '100%' }}>
                <Text style={{ color: theme.text, marginBottom: 8, fontSize: 14, fontWeight: 'bold' }}>{label}:</Text>
                <input
                    type="date"
                    value={value instanceof Date ? value.toISOString().split('T')[0] : ""}
                    onChange={(e) => {
                        const selectedDate = new Date(e.target.value + 'T12:00:00');
                        onChange(null, selectedDate);
                    }}
                    style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${theme.subText}`,
                        backgroundColor: isDarkTheme ? '#2c2c2c' : '#fff',
                        color: isDarkTheme ? '#fff' : '#000',
                        width: '100%',
                        fontSize: '16px',
                        outline: 'none',
                        boxSizing: 'border-box'
                    }}
                />
            </View>
        );
    }

    return (
        <View style={{ marginBottom: 15 }}>
            <Text style={{ color: theme.text, marginBottom: 8, fontSize: 14, fontWeight: 'bold' }}>{label}:</Text>
            <TouchableOpacity 
                onPress={() => setShowPicker(true)} 
                style={[styles.input, { justifyContent: 'center', height: 50, borderColor: theme.subText, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, backgroundColor: isDarkTheme ? '#333' : '#fff' }]}
            >
                <Text style={{ color: theme.text }}>{value.toLocaleDateString('pt-BR')}</Text>
            </TouchableOpacity>
            {showPicker && (
                <DateTimePicker 
                    value={value} 
                    mode="date" 
                    display="default" 
                    onChange={(e, d) => { setShowPicker(false); if(d) onChange(e, d); }} 
                />
            )}
        </View>
    );
};

export default function ExpensesScreen({ route, navigation }) {
    const { api } = useContext(AuthContext);
    const { theme, isDarkTheme } = useContext(ThemeContext);
    
    const [despesas, setDespesas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTab, setSelectedTab] = useState('all'); 
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const animationController = useRef(new Animated.Value(0)).current;

    const [monthStart, setMonthStart] = useState(new Date().getMonth() + 1);
    const [yearStart, setYearStart] = useState(new Date().getFullYear());
    const [monthEnd, setMonthEnd] = useState(new Date().getMonth() + 1);
    const [yearEnd, setYearEnd] = useState(new Date().getFullYear());

    const [expenseModalVisible, setExpenseModalVisible] = useState(false);
    const [replicateModalVisible, setReplicateModalVisible] = useState(false);
    const [groupListModalVisible, setGroupListModalVisible] = useState(false);
    const [syncModalVisible, setSyncModalVisible] = useState(false); // Novo modal para evitar crash
    
    const [isEditing, setIsEditing] = useState(false);
    const [currentExpenseId, setCurrentExpenseId] = useState(null);
    const [targetGroupId, setTargetGroupId] = useState(null);
    const [selectedGroupData, setSelectedGroupData] = useState(null);
    
    const [newValueToReplicate, setNewValueToReplicate] = useState('');
    const [newNameToReplicate, setNewNameToReplicate] = useState('');
    const [replicateProgress, setReplicateProgress] = useState(0);

    const [isParcelado, setIsParcelado] = useState(false);
    const [formData, setFormData] = useState({ 
        nome: '', valor: '', data_vencimento: new Date(), categoria: 'outros', numero_parcelas: '1' 
    });
    
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);

    const toggleFilters = () => {
        const toValue = isFilterVisible ? 0 : 1;
        Animated.timing(animationController, { toValue, duration: 300, useNativeDriver: false }).start();
        setIsFilterVisible(!isFilterVisible);
    };

    const filterHeight = animationController.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Platform.OS === 'web' ? (screenWidth < 768 ? 400 : 180) : 280] 
    });

    const fetchData = async () => {
        try {
            setRefreshing(true);
            const [despRes, catRes] = await Promise.all([api.get('/despesas'), api.get('/categorias')]);
            setDespesas(despRes.data);
            setCategorias(catRes.data);
        } catch (e) { 
            console.error("Erro ao buscar dados:", e); 
        } finally { 
            setLoading(false); 
            setRefreshing(false); 
        }
    };

    useFocusEffect(useCallback(() => { fetchData(); }, []));

    const togglePayment = async (item) => {
        try {
            const data = item.data_pagamento ? null : new Date().toISOString().split('T')[0];
            await api.put(`/despesas/${item.id}/pagar`, { data_pagamento: data });
            fetchData();
        } catch (e) {
            console.error("Erro ao atualizar pagamento:", e);
        }
    };

    const handleDelete = (id) => {
        const del = async () => { try { await api.delete(`/despesas/${id}`); fetchData(); } catch (e) {} };
        if (Platform.OS === 'web') { if(confirm("Excluir esta parcela?")) del(); }
        else { Alert.alert("Excluir", "Deseja excluir esta parcela?", [{text: "Não"}, {text: "Sim", onPress: del}]); }
    };

    const handleDeleteGroup = (groupId) => {
        const del = async () => { 
            try { 
                await api.delete(`/parcelamentos/${groupId}`); 
                setGroupListModalVisible(false);
                fetchData(); 
            } catch (e) { Alert.alert("Erro", "Falha ao excluir grupo."); }
        };
        if (Platform.OS === 'web') { if(confirm("AVISO: Isso excluirá TODAS as parcelas deste item. Confirmar?")) del(); }
        else { Alert.alert("Excluir Tudo", "Isso excluirá o item e TODAS as suas parcelas. Confirmar?", [{text: "Cancelar"}, {text: "Sim, Excluir Tudo", onPress: del, style: 'destructive'}]); }
    };

    const openEdit = (item) => {
        setIsEditing(true);
        setIsParcelado(item.compra_parcelada_id !== null);
        setCurrentExpenseId(item.id);
        setFormData({
            nome: item.nome,
            valor: String(item.valor),
            data_vencimento: new Date(item.data_vencimento),
            categoria: item.categoria,
            numero_parcelas: '1'
        });
        setExpenseModalVisible(true);
    };

    /**
     * SALVAR REPLICAÇÃO ESTABILIZADA:
     * Agora usa processamento sequencial e delay para não derrubar o Android
     */
    const handleSaveReplicate = async () => {
        const cleanValue = newValueToReplicate.trim().replace(',', '.');
        const parsedValue = parseFloat(cleanValue);

        if (isNaN(parsedValue) || parsedValue <= 0 || !newNameToReplicate.trim()) {
            Alert.alert("Erro", "Preencha o nome e um valor válido.");
            return;
        }

        try {
            setReplicateModalVisible(false);
            setSyncModalVisible(true); // Abre o modal de progresso isolado
            setReplicateProgress(0);

            const parcelasDoGrupo = despesas
                .filter(d => d.compra_parcelada_id === targetGroupId)
                .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));

            const total = parcelasDoGrupo.length;
            const nomeBase = newNameToReplicate.trim();

            // PROCESSAMENTO UM POR UM (FUNDAMENTAL PARA NÃO REINICIAR)
            for (let i = 0; i < total; i++) {
                const p = parcelasDoGrupo[i];
                const numeroParcela = i + 1;
                const nomeFormatado = `${nomeBase} (${numeroParcela}/${total})`;
                
                await api.put(`/despesas/${p.id}`, {
                    nome: nomeFormatado,
                    valor: parsedValue,
                    data_vencimento: p.data_vencimento.split('T')[0],
                    categoria: p.categoria,
                    fixo: p.fixo || 0
                });

                // Pequeno delay de respiro para o sistema operacional
                await new Promise(resolve => setTimeout(resolve, 100));
                setReplicateProgress(Math.round(((i + 1) / total) * 100));
            }

            setSyncModalVisible(false);
            setGroupListModalVisible(false);
            setNewValueToReplicate('');
            setNewNameToReplicate('');
            await fetchData();
            Alert.alert("Sucesso", "Todas as parcelas foram atualizadas sem erros!");

        } catch (e) {
            console.error("Erro ao replicar:", e);
            setSyncModalVisible(false);
            Alert.alert("Erro", "A sincronização falhou. Verifique sua conexão.");
        }
    };

    const handleSaveExpense = async () => {
        if (!formData.nome || !formData.valor) {
            Alert.alert("Erro", "Preencha nome e valor.");
            return;
        }
        try {
            if (isParcelado && !isEditing) {
                const payloadParcelado = {
                    nome: formData.nome,
                    valor_total: parseFloat(formData.valor),
                    numero_parcelas: parseInt(formData.numero_parcelas),
                    data_compra: new Date().toISOString().split('T')[0],
                    data_primeira_parcela: formData.data_vencimento.toISOString().split('T')[0]
                };
                await api.post('/parcelamentos', payloadParcelado);
                Alert.alert("Sucesso", "Compra parcelada registrada!");
            } else {
                const payloadNormal = { 
                    ...formData, 
                    valor: parseFloat(formData.valor), 
                    data_vencimento: formData.data_vencimento.toISOString().split('T')[0],
                    fixo: 0
                };
                if (isEditing) {
                    await api.put(`/despesas/${currentExpenseId}`, payloadNormal);
                } else {
                    await api.post('/despesas', payloadNormal);
                }
            }
            setExpenseModalVisible(false);
            fetchData();
        } catch (e) { 
            Alert.alert("Erro", "Falha ao salvar. Verifique os dados."); 
        }
    };

    const renderParceladosTab = () => {
        const grupos = {};
        despesas.filter(d => d.compra_parcelada_id !== null).forEach(item => {
            if (!grupos[item.compra_parcelada_id]) {
                grupos[item.compra_parcelada_id] = {
                    id: item.compra_parcelada_id,
                    nome: item.nome.split(' (')[0], 
                    totalGeral: 0,
                    parcelas: []
                };
            }
            grupos[item.compra_parcelada_id].parcelas.push(item);
            grupos[item.compra_parcelada_id].totalGeral += parseFloat(item.valor);
        });

        if (Object.keys(grupos).length === 0) {
            return (
                <View style={{ padding: 40, alignItems: 'center' }}>
                    <Ionicons name="card-outline" size={60} color={theme.subText} />
                    <Text style={{ color: theme.subText, marginTop: 10 }}>Nenhuma conta parcelada encontrada.</Text>
                </View>
            );
        }

        return Object.values(grupos).map(grupo => {
            const parcelasOrdenadas = grupo.parcelas.sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
            const dataQuitacao = parcelasOrdenadas.length > 0 
                ? new Date(parcelasOrdenadas[parcelasOrdenadas.length - 1].data_vencimento).toLocaleDateString('pt-BR') 
                : 'N/A';

            return (
                <Card 
                    key={grupo.id} 
                    style={{ marginBottom: 12, borderRadius: 12, backgroundColor: theme.cardBackground }}
                    onPress={() => {
                        setTargetGroupId(grupo.id);
                        setSelectedGroupData(grupo);
                        setGroupListModalVisible(true);
                    }}
                >
                    <Card.Content style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15 }}>
                        <Ionicons name="layers-outline" size={24} color={theme.primary} style={{ marginRight: 15 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>{grupo.nome}</Text>
                            <Paragraph style={{ color: theme.primary, fontWeight: 'bold', fontSize: 11 }}>
                                Total: R$ {grupo.totalGeral.toFixed(2)} | <Text style={{ color: '#2196F3' }}>Quitação: {dataQuitacao}</Text>
                            </Paragraph>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.subText} />
                    </Card.Content>
                </Card>
            );
        });
    };

    const getFilteredData = () => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        return despesas.filter(d => {
            const p = d.data_vencimento.split('T')[0].split('-');
            const dueDate = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]), 12, 0, 0);

            if (selectedTab === 'all') {
                const start = new Date(yearStart, monthStart - 1, 1, 0, 0, 0);
                const end = new Date(yearEnd, monthEnd, 0, 23, 59, 59);
                return dueDate >= start && dueDate <= end;
            }
            if (selectedTab === 'current') return parseInt(p[1]) === (hoje.getMonth() + 1) && parseInt(p[0]) === hoje.getFullYear();
            if (selectedTab === 'overdue') return dueDate < hoje && d.data_pagamento === null;
            if (selectedTab === 'paid') return d.data_pagamento !== null;
            return true;
        });
    };

    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const years = Array.from({length: 10}, (_, i) => new Date().getFullYear() - 5 + i);

    const renderPicker = (val, setVal, items) => (
        <View style={styles.pickerContainer}>
            <View style={[styles.pickerWrapper, { backgroundColor: isDarkTheme ? '#333' : '#fff' }]}>
                {Platform.OS === 'web' ? (
                    <select 
                        value={val} 
                        onChange={(e) => setVal(parseInt(e.target.value))}
                        style={{ background: 'transparent', color: theme.text, border: 'none', padding: '10px', width: '100%', outline: 'none' }}
                    >
                        {items.map((item, idx) => (
                            <option key={idx} value={typeof item === 'string' && items.length === 12 ? idx + 1 : item}>{item}</option>
                        ))}
                    </select>
                ) : (
                    <Picker
                        selectedValue={val}
                        onValueChange={(v) => setVal(v)}
                        style={{ color: theme.text, height: 50, width: '100%' }}
                        dropdownIconColor={theme.text}
                    >
                        {items.map((item, idx) => (
                            <Picker.Item key={idx} label={String(item)} value={typeof item === 'string' && items.length === 12 ? idx + 1 : item} color={isDarkTheme ? "#FFF" : "#000"} />
                        ))}
                    </Picker>
                )}
            </View>
        </View>
    );

    const renderParcelaItem = ({ item }) => (
        <List.Item
            title={item.nome}
            description={`Vencimento: ${new Date(item.data_vencimento).toLocaleDateString('pt-BR')}`}
            titleStyle={{ color: theme.text }}
            descriptionStyle={{ color: theme.subText }}
            right={() => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: theme.text, fontWeight: 'bold', marginRight: 5 }}>R$ {parseFloat(item.valor).toFixed(2)}</Text>
                    <IconButton icon="pencil-outline" size={20} iconColor={theme.primary} onPress={() => { setGroupListModalVisible(false); openEdit(item); }} />
                    <IconButton 
                        icon={item.data_pagamento ? "check-circle" : "circle-outline"} 
                        iconColor={item.data_pagamento ? '#4CAF50' : theme.subText}
                        onPress={() => togglePayment(item)}
                    />
                </View>
            )}
            style={{ borderBottomWidth: 1, borderBottomColor: theme.subText + '33' }}
        />
    );

    const tabNames = { all: 'Geral (Filtro)', current: 'Mês Atual', overdue: 'Atrasadas', paid: 'Pagas', parcelados: 'Parcelados' };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Minhas Despesas</Text>

            {loading && replicateProgress === 0 && !refreshing && <ActivityIndicator style={{ marginVertical: 10 }} color={theme.primary} />}

            <Card style={[styles.summaryCard, { backgroundColor: isDarkTheme ? '#1e1e1e' : '#f0f7ff' }]}>
                <Card.Content>
                    <Text style={{ color: theme.subText }}>{tabNames[selectedTab]}</Text>
                    <Title style={{ fontSize: 28, color: theme.primary }}>
                        R$ {(selectedTab === 'parcelados' ? despesas.filter(d => d.compra_parcelada_id !== null) : getFilteredData()).reduce((s, d) => s + parseFloat(d.valor), 0).toFixed(2)}
                    </Title>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
                        <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>Pago: R$ {(selectedTab === 'parcelados' ? despesas.filter(d => d.compra_parcelada_id !== null && d.data_pagamento) : getFilteredData().filter(d => d.data_pagamento)).reduce((s, d) => s + parseFloat(d.valor), 0).toFixed(2)}</Text>
                    </View>
                </Card.Content>
            </Card>

            <View style={styles.filterSection}>
                <Menu
                    visible={menuVisible}
                    onDismiss={() => setMenuVisible(false)}
                    anchor={<Button mode="outlined" onPress={() => setMenuVisible(true)} icon="filter">{tabNames[selectedTab]}</Button>}
                >
                    {Object.keys(tabNames).map(k => <Menu.Item key={k} onPress={() => { setSelectedTab(k); setMenuVisible(false); }} title={tabNames[k]} />)}
                </Menu>
                {selectedTab === 'all' && <IconButton icon={isFilterVisible ? "chevron-up" : "calendar-range"} onPress={toggleFilters} />}
            </View>

            {selectedTab === 'all' && (
                <Animated.View style={[styles.filterDrawer, { height: filterHeight }]}>
                    <View style={styles.filterGrid}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.sectionLabel, { color: theme.primary }]}>DE:</Text>
                            <View style={{ flexDirection: 'row', gap: 5 }}>
                                {renderPicker(monthStart, setMonthStart, months)}
                                {renderPicker(yearStart, setYearStart, years)}
                            </View>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.sectionLabel, { color: theme.primary }]}>ATÉ:</Text>
                            <View style={{ flexDirection: 'row', gap: 5 }}>
                                {renderPicker(monthEnd, setMonthEnd, months)}
                                {renderPicker(yearEnd, setYearEnd, years)}
                            </View>
                        </View>
                    </View>
                    <Button mode="contained" onPress={toggleFilters} style={{ marginTop: 15 }}>Aplicar Filtros</Button>
                </Animated.View>
            )}

            <ScrollView 
                contentContainerStyle={{ padding: 15, paddingBottom: 120 }} 
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} />}
            >
                {selectedTab === 'parcelados' ? renderParceladosTab() : getFilteredData().map(item => (
                    <Card key={item.id} style={[styles.expenseCard, { backgroundColor: theme.cardBackground, borderLeftColor: item.data_pagamento ? '#4CAF50' : theme.danger }]}>
                        <Card.Title 
                            title={item.nome} titleStyle={{ color: theme.text }}
                            subtitle={`Vencimento: ${item.data_vencimento.split('T')[0].split('-').reverse().join('/')}`}
                            right={(p) => (
                                <View style={{ flexDirection: 'row' }}>
                                    <IconButton {...p} icon="pencil-outline" iconColor={theme.primary} onPress={() => openEdit(item)} />
                                    <IconButton {...p} icon="delete-outline" iconColor={theme.danger} onPress={() => handleDelete(item.id)} />
                                </View>
                            )}
                        />
                        <Card.Content>
                            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>R$ {parseFloat(item.valor).toFixed(2)}</Text>
                            <Button 
                                mode={item.data_pagamento ? "outlined" : "contained"} 
                                style={{ marginTop: 10, borderColor: item.data_pagamento ? '#4CAF50' : 'transparent' }} 
                                onPress={() => togglePayment(item)}
                            >
                                {item.data_pagamento ? "PAGA ✅" : "MARCAR COMO PAGA"}
                            </Button>
                        </Card.Content>
                    </Card>
                ))}
            </ScrollView>

            <FAB 
                style={[styles.fab, { backgroundColor: theme.primary }]} 
                icon="plus" 
                onPress={() => { 
                    setIsEditing(false); 
                    setIsParcelado(false); 
                    setFormData({ nome: '', valor: '', data_vencimento: new Date(), categoria: 'outros', numero_parcelas: '1' }); 
                    setExpenseModalVisible(true); 
                }} 
            />

            {/* MODAL DE LISTA DE PARCELAS */}
            <Modal visible={groupListModalVisible} animationType="slide" transparent={false}>
                <View style={[styles.container, { backgroundColor: theme.background, padding: 15 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <Title style={{ color: theme.text, flex: 1 }}>{selectedGroupData?.nome}</Title>
                        <IconButton icon="close" iconColor={theme.text} onPress={() => setGroupListModalVisible(false)} />
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 }}>
                        <Button 
                            icon="sync" 
                            mode="contained" 
                            onPress={() => { 
                                setNewNameToReplicate(selectedGroupData?.nome);
                                setNewValueToReplicate(String(selectedGroupData?.parcelas[0].valor));
                                setReplicateModalVisible(true); 
                            }}
                            style={{ flex: 1, marginRight: 5 }}
                        >REPLICAR</Button>
                        <Button 
                            icon="trash-can" 
                            mode="outlined" 
                            textColor={theme.danger} 
                            onPress={() => handleDeleteGroup(targetGroupId)}
                            style={{ flex: 1, borderColor: theme.danger }}
                        >EXCLUIR TUDO</Button>
                    </View>

                    <FlatList
                        data={selectedGroupData?.parcelas.sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento))}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderParcelaItem}
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        removeClippedSubviews={true}
                    />
                </View>
            </Modal>

            {/* MODAL DE EDIÇÃO INDIVIDUAL E NOVA DESPESA */}
            <Modal visible={expenseModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
                        <Title style={{ color: theme.text, textAlign: 'center' }}>
                            {isEditing ? 'Editar Parcela' : (isParcelado ? 'Nova Compra Parcelada' : 'Nova Despesa')}
                        </Title>
                        
                        {!isEditing && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
                                <Text style={{ color: theme.text }}>É uma compra parcelada?</Text>
                                <Switch value={isParcelado} onValueChange={setIsParcelado} trackColor={{ false: "#767577", true: theme.primary }} />
                            </View>
                        )}

                        <TextInput 
                            style={[styles.input, { color: theme.text, borderColor: theme.subText, backgroundColor: isDarkTheme ? '#333' : '#fff' }]} 
                            placeholder="Nome" 
                            placeholderTextColor={theme.subText}
                            value={formData.nome} 
                            onChangeText={t => setFormData({...formData, nome: t})} 
                        />

                        <TextInput 
                            style={[styles.input, { color: theme.text, borderColor: theme.subText, backgroundColor: isDarkTheme ? '#333' : '#fff' }]} 
                            placeholder={isParcelado && !isEditing ? "Valor Total" : "Valor"} 
                            placeholderTextColor={theme.subText}
                            keyboardType="numeric" 
                            value={formData.valor} 
                            onChangeText={t => setFormData({...formData, valor: t})} 
                        />

                        {isParcelado && !isEditing && (
                            <TextInput 
                                style={[styles.input, { color: theme.text, borderColor: theme.subText, backgroundColor: isDarkTheme ? '#333' : '#fff' }]} 
                                placeholder="Número de Parcelas" 
                                placeholderTextColor={theme.subText}
                                keyboardType="numeric" 
                                value={formData.numero_parcelas} 
                                onChangeText={t => setFormData({...formData, numero_parcelas: t})} 
                            />
                        )}

                        <CustomDatePicker 
                            label={isParcelado && !isEditing ? "Data da 1ª Parcela" : "Vencimento"} 
                            value={formData.data_vencimento} 
                            onChange={(e, d) => setFormData({...formData, data_vencimento: d})} 
                            theme={theme} 
                            isDarkTheme={isDarkTheme} 
                            showPicker={showDatePicker} 
                            setShowPicker={setShowDatePicker} 
                        />

                        <View style={styles.modalButtons}>
                            <Button mode="contained" onPress={handleSaveExpense} style={{ flex: 1 }}>Salvar</Button>
                            <Button mode="text" onPress={() => setExpenseModalVisible(false)} textColor={theme.danger} style={{ flex: 1 }}>Cancelar</Button>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL PARA REPLICAR NOME E VALOR */}
            <Modal visible={replicateModalVisible} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
                        <Title style={{ color: theme.text, textAlign: 'center', marginBottom: 15 }}>Replicar Nome e Valor</Title>
                        
                        <Text style={{ color: theme.text, fontWeight: 'bold', marginBottom: 5 }}>Novo Nome Base:</Text>
                        <TextInput 
                            style={[styles.input, { color: theme.text, borderColor: theme.subText, backgroundColor: isDarkTheme ? '#333' : '#fff' }]} 
                            placeholder="Ex: CONSÓRCIO YAMAHA" 
                            placeholderTextColor={theme.subText}
                            value={newNameToReplicate} 
                            onChangeText={setNewNameToReplicate}
                        />

                        <Text style={{ color: theme.text, fontWeight: 'bold', marginBottom: 5 }}>Novo Valor por Parcela:</Text>
                        <TextInput 
                            style={[styles.input, { color: theme.text, borderColor: theme.subText, backgroundColor: isDarkTheme ? '#333' : '#fff' }]} 
                            placeholder="Ex: 512.46" 
                            placeholderTextColor={theme.subText}
                            keyboardType="numeric" 
                            value={newValueToReplicate} 
                            onChangeText={setNewValueToReplicate}
                        />

                        <View style={styles.modalButtons}>
                            <Button mode="contained" onPress={handleSaveReplicate} style={{ flex: 1 }}>Replicar</Button>
                            <Button mode="text" onPress={() => setReplicateModalVisible(false)} textColor={theme.danger} style={{ flex: 1 }}>Cancelar</Button>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL DE SINCRONIZAÇÃO (EVITA CRASH NO ANDROID) */}
            <Modal visible={syncModalVisible} transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.cardBackground, alignItems: 'center' }]}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={{ color: theme.text, marginTop: 15, fontWeight: 'bold', fontSize: 18 }}>
                            Sincronizando: {replicateProgress}%
                        </Text>
                        <Paragraph style={{ color: theme.subText, textAlign: 'center', marginTop: 5 }}>
                            Processando as 72 parcelas uma a uma para garantir estabilidade.
                        </Paragraph>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 15 },
    summaryCard: { margin: 15, borderRadius: 12, elevation: 4 },
    filterSection: { paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    filterDrawer: { overflow: 'hidden', paddingHorizontal: 15 },
    filterGrid: { flexDirection: 'row', gap: 10 },
    sectionLabel: { fontWeight: 'bold', fontSize: 12, marginBottom: 5 },
    pickerContainer: { flex: 1, minHeight: 55 },
    pickerWrapper: { borderWidth: 1, borderColor: '#555', borderRadius: 8, height: 50, justifyContent: 'center' },
    expenseCard: { marginBottom: 12, borderLeftWidth: 8, elevation: 2 },
    fab: { position: 'absolute', right: 20, bottom: 20 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
    modalContent: { padding: 20, borderRadius: 15 },
    input: { borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 15 },
    modalButtons: { flexDirection: 'row', gap: 10, marginTop: 10 }
});
