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
import { 
    Card, 
    Title, 
    Paragraph, 
    Button, 
    FAB, 
    Menu, 
    IconButton, 
    List, 
    Divider, 
    Surface,
    HelperText,
    Avatar,
    ProgressBar
} from 'react-native-paper';
import { Picker } from '@react-native-picker/picker'; 
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

/**
 * CONFIGURAÇÕES GLOBAIS DE INTERFACE
 * Definição de constantes de layout para garantir responsividade premium em APK e Web.
 */
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * COMPONENTE: CustomDatePicker
 * Finalidade: Interface de seleção de data modular que funciona em todas as plataformas.
 */
const CustomDatePicker = ({ value, onChange, label, theme, isDarkTheme, showPicker, setShowPicker }) => {
    if (Platform.OS === 'web') {
        return (
            <View style={styles.datePickerWebWrapper}>
                <Text style={[styles.miniLabelTxt, { color: theme.text }]}>{label}:</Text>
                <input
                    type="date"
                    value={value instanceof Date ? value.toISOString().split('T')[0] : ""}
                    onChange={(e) => {
                        const selectedDate = new Date(e.target.value + 'T12:00:00');
                        onChange(null, selectedDate);
                    }}
                    style={{
                        padding: '14px',
                        borderRadius: '12px',
                        border: `1.5px solid ${theme.subText}40`,
                        backgroundColor: isDarkTheme ? '#2a2a2a' : '#fff',
                        color: theme.text,
                        width: '100%',
                        fontSize: '14px',
                        outline: 'none',
                        marginTop: '5px'
                    }}
                />
            </View>
        );
    }

    return (
        <View style={styles.datePickerMobileWrapper}>
            <Text style={[styles.miniLabelTxt, { color: theme.text }]}>{label}:</Text>
            <TouchableOpacity 
                onPress={() => setShowPicker(true)} 
                activeOpacity={0.7}
                style={[styles.inputFrameAdjusted, { 
                    borderColor: theme.subText + '30', 
                    backgroundColor: isDarkTheme ? '#2a2a2a' : '#fff' 
                }]}
            >
                <View style={styles.dateDisplayRowContainer}>
                    <MaterialCommunityIcons name="calendar-month-outline" size={20} color={theme.primary} />
                    <Text style={{ color: theme.text, marginLeft: 12, fontSize: 14, fontWeight: '600' }}>
                        {value.toLocaleDateString('pt-BR')}
                    </Text>
                </View>
            </TouchableOpacity>
            {showPicker && (
                <DateTimePicker 
                    value={value} 
                    mode="date" 
                    display="default" 
                    onChange={(e, d) => { 
                        setShowPicker(false); 
                        if(d) onChange(e, d); 
                    }} 
                />
            )}
        </View>
    );
};

/**
 * TELA: ExpensesScreen
 * Descrição: Central de gerenciamento de despesas integrada com o banco de dados RDS AWS.
 * Correção: Recuperação da aba "Parceladas" (Estilo Hambúrguer) e filtros Web.
 */
export default function ExpensesScreen({ route, navigation }) {
    const { api } = useContext(AuthContext);
    const { theme, isDarkTheme } = useContext(ThemeContext);
    
    // ==========================================
    // 1. ESTADOS DE DADOS (SINCRONIA BACKEND)
    // ==========================================
    const [despesas, setDespesas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTab, setSelectedTab] = useState('all'); 
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    
    const filterAnim = useRef(new Animated.Value(0)).current;

    // ==========================================
    // 2. CONFIGURAÇÕES DE FILTRAGEM TEMPORAL
    // ==========================================
    const [monthStart, setMonthStart] = useState(new Date().getMonth() + 1);
    const [yearStart, setYearStart] = useState(new Date().getFullYear());
    const [monthEnd, setMonthEnd] = useState(new Date().getMonth() + 1);
    const [yearEnd, setYearEnd] = useState(new Date().getFullYear());

    // ==========================================
    // 3. ESTADOS DE MODAIS E WORKFLOW
    // ==========================================
    const [expenseModalVisible, setExpenseModalVisible] = useState(false);
    const [groupListModalVisible, setGroupListModalVisible] = useState(false);
    const [replicateModalVisible, setReplicateModalVisible] = useState(false);
    const [syncModalVisible, setSyncModalVisible] = useState(false); 
    
    const [isEditing, setIsEditing] = useState(false);
    const [currentExpenseId, setCurrentExpenseId] = useState(null);
    const [targetGroupId, setTargetGroupId] = useState(null);
    const [selectedGroupData, setSelectedGroupData] = useState(null);
    
    const [replicateProgress, setReplicateProgress] = useState(0);
    const [syncLabel, setSyncLabel] = useState('Sincronizando...');

    const [newValueToReplicate, setNewValueToReplicate] = useState('');
    const [newNameToReplicate, setNewNameToReplicate] = useState('');
    const [newCategoryToReplicate, setNewCategoryToReplicate] = useState('outros');
    
    const [isEssencial, setIsEssencial] = useState(true); 
    const [isParcelado, setIsParcelado] = useState(false);
    
    const [formData, setFormData] = useState({ 
        nome: '', valor: '', data_vencimento: new Date(), categoria: 'outros', numero_parcelas: '1' 
    });
    
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);

    const listMonths = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const listYears = Array.from({length: 15}, (_, i) => new Date().getFullYear() - 5 + i);
    const tabLabels = { 
        all: 'Filtro por Período', 
        current: 'Mês Atual', 
        overdue: 'Em Atraso', 
        paid: 'Pagas', 
        parcelados: 'Parceladas' 
    };

    const fetchData = async () => {
        try {
            setRefreshing(true);
            const [despRes, catRes] = await Promise.all([
                api.get('/despesas'), 
                api.get('/categorias')
            ]);
            setDespesas(despRes.data || []);
            setCategorias(catRes.data || []);
        } catch (error) { 
            console.error("Erro na carga RDS:", error);
        } finally { 
            setLoading(false); 
            setRefreshing(false); 
        }
    };

    useFocusEffect(useCallback(() => { fetchData(); }, []));

    const togglePayment = async (item) => {
        try {
            const dtStatus = item.data_pagamento ? null : new Date().toISOString().split('T')[0];
            await api.put(`/despesas/${item.id}/pagar`, { data_pagamento: dtStatus });
            fetchData();
        } catch (e) { Alert.alert("Erro", "Falha na transação."); }
    };

    const handleDelete = (id) => {
        const confirmDelete = async () => { 
            try { await api.delete(`/despesas/${id}`); fetchData(); } 
            catch (e) { Alert.alert("Erro", "Falha ao apagar registro."); }
        };
        if (Platform.OS === 'web') { 
            if(window.confirm("Deseja apagar esta despesa?")) confirmDelete(); 
        } else { 
            Alert.alert("Confirmar Exclusão", "Deseja continuar?", [
                {text: "Voltar"}, 
                {text: "Sim, Excluir", onPress: confirmDelete, style: 'destructive'}
            ]); 
        }
    };

    const handleSaveExpense = async () => {
        if (!formData.nome.trim() || !formData.valor) return;
        try {
            const vConv = parseFloat(String(formData.valor).replace(',', '.'));
            const payload = { 
                ...formData, 
                valor: vConv, 
                essencial: isEssencial ? 1 : 0, 
                data_vencimento: formData.data_vencimento.toISOString().split('T')[0] 
            };

            if (isParcelado && !isEditing) {
                await api.post('/parcelamentos', { ...payload, valor_total: vConv, numero_parcelas: parseInt(formData.numero_parcelas) });
            } else {
                if (isEditing) await api.put(`/despesas/${currentExpenseId}`, payload);
                else await api.post('/despesas', payload);
            }
            setExpenseModalVisible(false);
            fetchData();
        } catch (e) { Alert.alert("Erro", "Falha ao salvar no banco."); }
    };

    /**
     * handleSaveReplicate: Sincronização em lote para grupos de parcelas (Hambúrguer).
     */
    const handleSaveReplicate = async () => {
        const vNum = parseFloat(newValueToReplicate.trim().replace(',', '.'));
        if (isNaN(vNum) || vNum <= 0 || !newNameToReplicate.trim()) {
            Alert.alert("Campos Inválidos", "Preencha nome e valor.");
            return;
        }

        try {
            setReplicateModalVisible(false);
            setSyncModalVisible(true);
            setReplicateProgress(0);
            
            const pAlvo = [...despesas]
                .filter(d => d.compra_parcelada_id === targetGroupId)
                .sort((a,b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
                
            const totalCount = pAlvo.length;

            for (let i = 0; i < totalCount; i++) {
                const seq = i + 1;
                setSyncLabel(`Sincronizando ${seq} de ${totalCount}...`);
                
                await api.put(`/despesas/${pAlvo[i].id}`, {
                    nome: `${newNameToReplicate.trim()} (${seq}/${totalCount})`,
                    valor: vNum,
                    data_vencimento: pAlvo[i].data_vencimento.split('T')[0],
                    categoria: newCategoryToReplicate,
                    essencial: isEssencial ? 1 : 0
                });
                
                await new Promise(r => setTimeout(r, 120));
                setReplicateProgress(seq / totalCount);
            }
            
            setSyncModalVisible(false);
            setGroupListModalVisible(false);
            fetchData();
        } catch (err) { setSyncModalVisible(false); Alert.alert("Erro", "Conexão AWS RDS falhou."); }
    };

    const getFilteredData = () => {
        const dH = new Date(); dH.setHours(0,0,0,0);
        return despesas.filter(d => {
            const strD = d.data_vencimento.split('T')[0];
            const pV = strD.split('-'); 
            if(pV.length < 3) return false;
            const dV = new Date(parseInt(pV[0]), parseInt(pV[1])-1, parseInt(pV[2]), 12, 0, 0);
            
            if (selectedTab === 'all') {
                const dataInicioFiltro = new Date(yearStart, monthStart-1, 1);
                const dataFimFiltro = new Date(yearEnd, monthEnd, 0, 23, 59, 59);
                return dV >= dataInicioFiltro && dV <= dataFimFiltro;
            }
            if (selectedTab === 'current') return dV.getMonth() === dH.getMonth() && dV.getFullYear() === dH.getFullYear();
            if (selectedTab === 'overdue') return dV < dH && d.data_pagamento === null;
            if (selectedTab === 'paid') return d.data_pagamento !== null;
            return true;
        });
    };

    const toggleFilters = () => {
        const toValue = isFilterVisible ? 0 : 1;
        Animated.spring(filterAnim, { toValue, friction: 9, useNativeDriver: false }).start();
        setIsFilterVisible(!isFilterVisible);
    };

    const drawerHeight = filterAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Platform.OS === 'web' ? 280 : 420] 
    });

    const openEdit = (item) => {
        setIsEditing(true);
        setIsParcelado(item.compra_parcelada_id !== null);
        setCurrentExpenseId(item.id);
        setIsEssencial(Boolean(item.essencial));
        setFormData({
            nome: item.nome, valor: String(item.valor),
            data_vencimento: new Date(item.data_vencimento),
            categoria: item.categoria || 'outros', numero_parcelas: '1'
        });
        setExpenseModalVisible(true);
    };

    const getCategoryIcon = (categoryName) => {
        const catMap = {
            'moradia': 'home-city', 'transporte': 'car-side', 'gamer': 'controller-classic', 'pets': 'paw',
            'lazer': 'palm-tree', 'saúde': 'medical-bag', 'alimentação': 'food-apple', 'educação': 'school'
        };
        return catMap[(categoryName || 'outros').toLowerCase()] || 'receipt-text';
    };

    const renderPicker = (val, setVal, items) => (
        <View style={styles.pickerBoxFrameAdjusted}>
            <View style={[styles.pickerSurfaceAdjusted, { backgroundColor: isDarkTheme ? '#2a2a2a' : '#fff' }]}>
                {Platform.OS === 'web' ? (
                    <select 
                        value={val} 
                        onChange={(e) => setVal(parseInt(e.target.value))}
                        style={{ background: 'transparent', color: theme.text, border: 'none', padding: '12px', width: '100%', outline: 'none', fontSize: '14px', cursor: 'pointer' }}
                    >
                        {items.map((item, idx) => (
                            <option key={idx} value={typeof item === 'string' && items.length === 12 ? idx + 1 : item} style={{ backgroundColor: isDarkTheme ? '#2a2a2a' : '#fff', color: theme.text }}>
                                {item}
                            </option>
                        ))}
                    </select>
                ) : (
                    <Picker selectedValue={val} onValueChange={(v) => setVal(v)} style={{ color: theme.text, height: 50, width: '100%' }} dropdownIconColor={theme.text} mode="dropdown">
                        {items.map((item, idx) => (
                            <Picker.Item key={idx} label={String(item)} value={typeof item === 'string' && items.length === 12 ? idx + 1 : item} color={isDarkTheme ? "#FFF" : "#000"} style={{ fontSize: 13, backgroundColor: isDarkTheme ? '#2a2a2a' : '#fff' }} />
                        ))}
                    </Picker>
                )}
            </View>
        </View>
    );

    /**
     * renderParceladosTab: Lógica de agrupamento (Hambúrguer) corrigida.
     */
    const renderParceladosTab = () => {
        const agrp = {};
        despesas.filter(d => d.compra_parcelada_id !== null).forEach(it => {
            if (!agrp[it.compra_parcelada_id]) {
                agrp[it.compra_parcelada_id] = { 
                    id: it.compra_parcelada_id, 
                    nome: it.nome.split(' (')[0], 
                    total: 0, items: [] 
                };
            }
            agrp[it.compra_parcelada_id].items.push(it);
            agrp[it.compra_parcelada_id].total += parseFloat(it.valor);
        });

        if (Object.keys(agrp).length === 0) {
            return (
                <View style={styles.emptyStateBoxContainer}>
                    <MaterialCommunityIcons name="layers-off" size={100} color={theme.subText + '25'} />
                    <Text style={{ color: theme.subText, fontSize: 14, marginTop: 15 }}>Sem grupos de parcelamento.</Text>
                </View>
            );
        }

        return Object.values(agrp).map(gp => {
            const sortedItems = [...gp.items].sort((a,b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
            return (
                <Card 
                    key={gp.id} 
                    style={[styles.cardGroupOuter, { backgroundColor: theme.cardBackground }]} 
                    onPress={() => { 
                        setTargetGroupId(gp.id); 
                        setSelectedGroupData({ ...gp, items: sortedItems }); 
                        setGroupListModalVisible(true); 
                    }}
                >
                    <Card.Content style={styles.cardGroupInner}>
                        <Surface style={[styles.boxIconSurface, { backgroundColor: theme.primary + '18' }]} elevation={2}>
                            <MaterialCommunityIcons name="layers-triple" size={26} color={theme.primary} />
                        </Surface>
                        <View style={{ flex: 1, marginLeft: 15 }}>
                            <Text style={[styles.textGroupTitle, { color: theme.text }]}>{gp.nome}</Text>
                            <Paragraph style={{ color: theme.primary, fontWeight: 'bold', fontSize: 12 }}>
                                Total: R$ {gp.total.toFixed(2)} | Parcelas: {gp.items.length}
                            </Paragraph>
                        </View>
                        <MaterialCommunityIcons name="chevron-right-circle" size={22} color={theme.subText} />
                    </Card.Content>
                </Card>
            );
        });
    };

    const renderParcelaItem = ({ item }) => (
        <List.Item
            title={item.nome}
            description={`R$ ${parseFloat(item.valor).toFixed(2)} • Venc: ${new Date(item.data_vencimento).toLocaleDateString('pt-BR')}`}
            titleStyle={{ color: theme.text, fontSize: 15, fontWeight: 'bold' }}
            left={props => <Avatar.Icon {...props} size={40} icon={getCategoryIcon(item.categoria)} style={{ backgroundColor: theme.primary + '15' }} color={theme.primary} />}
            right={() => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <IconButton icon="pencil" size={18} iconColor={theme.primary} onPress={() => { setGroupListModalVisible(false); openEdit(item); }} />
                    <IconButton icon={item.data_pagamento ? "check-circle" : "circle-outline"} iconColor={item.data_pagamento ? '#4CAF50' : theme.subText} onPress={() => togglePayment(item)} />
                </View>
            )}
            style={{ borderBottomWidth: 1, borderBottomColor: theme.subText + '15' }}
        />
    );

    if (loading) return <View style={styles.loadingCenter}><ActivityIndicator size="large" color={theme.primary} /></View>;

    return (
        <View style={[styles.fullScreenMain, { backgroundColor: theme.background }]}>
            <Surface style={[styles.headerSurfaceBox, { backgroundColor: theme.background }]} elevation={4}>
                <Text style={[styles.headerMainTitle, { color: theme.text }]}>Minhas Despesas</Text>
                <Paragraph style={{ color: theme.subText, textAlign: 'center', fontSize: 12 }}>Gestão financeira RDS AWS</Paragraph>
            </Surface>
            
            <Card style={[styles.summaryDashboardCardFrame, { backgroundColor: isDarkTheme ? '#181818' : '#f0faff' }]}>
                <Card.Content>
                    <Text style={{ color: theme.subText, fontWeight: 'bold', fontSize: 11 }}>TOTAL NA VISÃO (FILTRADO)</Text>
                    <Title style={{ fontSize: 36, color: theme.primary, fontWeight: '900' }}>
                        R$ {(selectedTab === 'parcelados' ? despesas.filter(d => d.compra_parcelada_id !== null) : getFilteredData()).reduce((s, d) => s + parseFloat(d.valor), 0).toFixed(2)}
                    </Title>
                    <Divider style={styles.summaryDividerLine} />
                    <View style={styles.paidStatusRowBox}>
                        <Avatar.Icon size={24} icon="check-decagram" color="#4CAF50" style={{ backgroundColor: '#4CAF5015' }} />
                        <Text style={{ color: '#4CAF50', fontWeight: 'bold', marginLeft: 10 }}>
                            Pagas: R$ {(selectedTab === 'parcelados' ? despesas.filter(d => d.compra_parcelada_id !== null && d.data_pagamento) : getFilteredData().filter(d => d.data_pagamento)).reduce((s, d) => s + parseFloat(d.valor), 0).toFixed(2)}
                        </Text>
                    </View>
                </Card.Content>
            </Card>

            <View style={styles.actionBarContainerBox}>
                <Menu visible={menuVisible} onDismiss={() => setMenuVisible(false)} anchor={<Button mode="contained-tonal" onPress={() => setMenuVisible(true)} icon="layers-triple-outline" style={styles.btnSelectorTabFrame}>{tabLabels[selectedTab]}</Button>}>
                    {Object.keys(tabLabels).map(k => <Menu.Item key={k} onPress={() => { setSelectedTab(k); setMenuVisible(false); }} title={tabLabels[k]} />)}
                </Menu>
                {selectedTab === 'all' && <IconButton icon={isFilterVisible ? "chevron-up-circle-outline" : "calendar-search"} size={32} iconColor={theme.primary} onPress={toggleFilters} />}
            </View>

            {selectedTab === 'all' && (
                <Animated.View style={[styles.filterDrawerFrameBox, { height: drawerHeight }]}>
                    <Surface style={styles.filterInternalSurfaceBox} elevation={1}>
                        <View style={styles.filterSectionFrame}>
                            <Text style={[styles.labelFilterSmall, { color: theme.primary }]}>DATA INICIAL:</Text>
                            <View style={styles.rowPickerFilterGroup}>{renderPicker(monthStart, setMonthStart, listMonths)}{renderPicker(yearStart, setYearStart, listYears)}</View>
                        </View>
                        <Divider style={{ marginVertical: 12, backgroundColor: theme.subText + '15' }} />
                        <View style={styles.filterSectionFrame}>
                            <Text style={[styles.labelFilterSmall, { color: theme.primary }]}>DATA FINAL:</Text>
                            <View style={styles.rowPickerFilterGroup}>{renderPicker(monthEnd, setMonthEnd, listMonths)}{renderPicker(yearEnd, setYearEnd, listYears)}</View>
                        </View>
                        <Button mode="contained" onPress={toggleFilters} style={styles.btnExecuteFilterNow}>APLICAR FILTRO</Button>
                    </Surface>
                </Animated.View>
            )}

            <ScrollView contentContainerStyle={styles.mainScrollableContentBox} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} colors={[theme.primary]} />}>
                {selectedTab === 'parcelados' ? renderParceladosTab() : (
                    getFilteredData().length > 0 ? getFilteredData().map(item => (
                        <Card key={item.id} style={[styles.expenseItemCardFrame, { backgroundColor: theme.cardBackground, borderLeftColor: item.data_pagamento ? '#4CAF50' : theme.danger }]}>
                            <Card.Title 
                                title={item.nome} 
                                subtitle={`${item.data_vencimento.split('T')[0].split('-').reverse().join('/')} • ${item.categoria}`} 
                                left={() => <Avatar.Icon size={42} icon={getCategoryIcon(item.categoria)} color="white" style={{ backgroundColor: theme.primary }} />} 
                                right={() => (
                                    <View style={styles.cardActionsIconRow}>
                                        <IconButton icon="pencil-outline" iconColor={theme.primary} size={22} onPress={() => openEdit(item)} />
                                        <IconButton icon="trash-can-outline" iconColor={theme.danger} size={22} onPress={() => handleDelete(item.id)} />
                                    </View>
                                )} 
                                titleStyle={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}
                            />
                            <Card.Content style={styles.expenseValueContainerBox}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={[styles.expenseValueTextMain, { color: theme.text }]}>R$ {parseFloat(item.valor).toFixed(2)}</Text>
                                    {!item.essencial && <Avatar.Icon size={24} icon="alert-decagram" color="#FF9800" style={{ backgroundColor: 'transparent', marginLeft: 10 }} />}
                                </View>
                                <Button mode={item.data_pagamento ? "outlined" : "contained"} onPress={() => togglePayment(item)} textColor={item.data_pagamento ? '#4CAF50' : '#fff'}>{item.data_pagamento ? "PAGA" : "PAGAR"}</Button>
                            </Card.Content>
                        </Card>
                    )) : (
                        <View style={styles.emptyStateBoxContainer}>
                            <MaterialCommunityIcons name="file-search-outline" size={100} color={theme.subText + '25'} />
                            <Text style={{ color: theme.subText, fontSize: 14, marginTop: 15 }}>Nenhuma despesa encontrada.</Text>
                        </View>
                    )
                )}
            </ScrollView>

            <FAB style={[styles.floatingAddBtnFrame, { backgroundColor: theme.primary }]} icon="plus" color="white" label="NOVA" onPress={() => { setIsEditing(false); setIsParcelado(false); setIsEssencial(true); setFormData({ nome: '', valor: '', data_vencimento: new Date(), categoria: 'outros', numero_parcelas: '1' }); setExpenseModalVisible(true); }} />

            <Modal visible={groupListModalVisible} animationType="slide">
                <View style={[styles.fullScreenMain, { backgroundColor: theme.background, padding: 20 }]}>
                    <View style={styles.rowModalHeader}>
                        <Title style={{ color: theme.text, flex: 1, fontSize: 20, fontWeight: 'bold' }}>{selectedGroupData?.nome}</Title>
                        <IconButton icon="close-circle" iconColor={theme.danger} size={32} onPress={() => setGroupListModalVisible(false)} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                        <Button icon="sync" mode="contained" onPress={() => { setNewNameToReplicate(selectedGroupData?.nome); setNewValueToReplicate(String(selectedGroupData?.items?.[0]?.valor || '')); setNewCategoryToReplicate(selectedGroupData?.items?.[0]?.categoria || 'outros'); setReplicateModalVisible(true); }} style={{ flex: 1 }}>REPLICAR</Button>
                        <Button icon="delete-sweep" mode="outlined" textColor={theme.danger} onPress={() => { Alert.alert("Apagar Tudo", "Confirma?", [{text: "Não"}, {text: "Sim", onPress: () => api.delete(`/parcelamentos/${targetGroupId}`).then(() => { setGroupListModalVisible(false); fetchData(); })}]) }} style={{ flex: 1, borderColor: theme.danger }}>APAGAR</Button>
                    </View>
                    <FlatList data={selectedGroupData?.items || []} keyExtractor={(it) => it.id.toString()} renderItem={renderParcelaItem} />
                </View>
            </Modal>

            {/* MODAL CADASTRO (COM CALENDÁRIO WEB CORRIGIDO) */}
            <Modal visible={expenseModalVisible} animationType="fade" transparent={true}>
                <View style={styles.modalBackgroundOverlayBox}>
                    <Surface style={[styles.modalContentSurfacePremium, { backgroundColor: theme.cardBackground }]} elevation={5}>
                        <Title style={[styles.modalHeaderTitleMain, { color: theme.text }]}>{isEditing ? 'Editar Despesa' : 'Novo Lançamento'}</Title>
                        
                        <TextInput style={[styles.modalInputTxtBoxFrame, { color: theme.text, borderColor: theme.subText + '30', backgroundColor: isDarkTheme ? '#2a2a2a' : '#f8f8f8' }]} placeholder="Descrição" placeholderTextColor={theme.subText} value={formData.nome} onChangeText={t => setFormData({...formData, nome: t})} />
                        <TextInput style={[styles.modalInputTxtBoxFrame, { color: theme.text, borderColor: theme.subText + '30', backgroundColor: isDarkTheme ? '#2a2a2a' : '#f8f8f8' }]} placeholder="Valor R$" keyboardType="numeric" placeholderTextColor={theme.subText} value={formData.valor} onChangeText={t => setFormData({...formData, valor: t})} />
                        
                        {isParcelado && !isEditing && (
                            <TextInput style={[styles.modalInputTxtBoxFrame, { color: theme.text, borderColor: theme.subText + '30', backgroundColor: isDarkTheme ? '#2a2a2a' : '#f8f8f8' }]} placeholder="Parcelas" keyboardType="numeric" value={formData.numero_parcelas} onChangeText={t => setFormData({...formData, numero_parcelas: t})} />
                        )}

                        <CustomDatePicker label="Vencimento" value={formData.data_vencimento} onChange={(e, d) => setFormData({...formData, data_vencimento: d})} theme={theme} isDarkTheme={isDarkTheme} showPicker={showDatePicker} setShowPicker={setShowDatePicker} />

                        <Surface style={[styles.essencialControlCardBox, { backgroundColor: isDarkTheme ? '#252525' : '#f2f2f2' }]} elevation={1}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Avatar.Icon size={36} icon={isEssencial ? "check-decagram-outline" : "alert-decagram-outline"} color={isEssencial ? "#4CAF50" : "#FF9800"} style={{ backgroundColor: 'transparent' }} />
                                <Text style={{ color: theme.text, marginLeft: 12, fontWeight: 'bold' }}>Essencial?</Text>
                            </View>
                            <Switch value={isEssencial} onValueChange={setIsEssencial} color={theme.primary} />
                        </Surface>

                        <View style={styles.modalActionButtonsRowContainer}>
                            <Button mode="contained" onPress={handleSaveExpense} style={styles.btnPrimarySaveNow}>SALVAR</Button>
                            <Button mode="text" onPress={() => setExpenseModalVisible(false)} textColor={theme.danger} style={styles.btnSecondaryCancelNow}>FECHAR</Button>
                        </View>
                    </Surface>
                </View>
            </Modal>
            
            {/* MODAL DE SINCRONIZAÇÃO */}
            <Modal visible={syncModalVisible} transparent={true}>
                <View style={styles.modalBackgroundOverlayBox}>
                    <Surface style={styles.syncModalSurface} elevation={5}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={{ color: theme.text, marginTop: 15, fontWeight: 'bold' }}>{syncLabel}</Text>
                        <ProgressBar progress={replicateProgress} color={theme.primary} style={{ height: 10, borderRadius: 5, marginTop: 15, width: '100%' }} />
                    </Surface>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    fullScreenMain: { flex: 1 },
    loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerSurfaceBox: { paddingVertical: 25, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, alignItems: 'center' },
    headerMainTitle: { fontSize: 24, fontWeight: 'bold' },
    summaryDashboardCardFrame: { margin: 15, borderRadius: 28, elevation: 12, padding: 5 },
    summaryDividerLine: { marginVertical: 10, height: 1.5, backgroundColor: 'rgba(0,0,0,0.06)' },
    paidStatusRowBox: { flexDirection: 'row', alignItems: 'center' },
    actionBarContainerBox: { paddingHorizontal: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    btnSelectorTabFrame: { borderRadius: 14 },
    mainScrollableContentBox: { padding: 15, paddingBottom: 220 },
    expenseItemCardFrame: { marginBottom: 18, borderLeftWidth: 12, elevation: 6, borderRadius: 22 },
    cardActionsIconRow: { flexDirection: 'row' },
    expenseValueContainerBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    expenseValueTextMain: { fontSize: 24, fontWeight: '900' },
    floatingAddBtnFrame: { position: 'absolute', right: 25, bottom: 35, elevation: 18, borderRadius: 15 },
    modalBackgroundOverlayBox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 20 },
    modalContentSurfacePremium: { padding: 30, borderRadius: 35 },
    modalHeaderTitleMain: { textAlign: 'center', fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
    modalInputTxtBoxFrame: { borderWidth: 1.5, padding: 14, borderRadius: 16, marginBottom: 15, fontSize: 16 },
    modalActionButtonsRowContainer: { flexDirection: 'row', gap: 15, marginTop: 25 },
    btnPrimarySaveNow: { flex: 1, height: 50, justifyContent: 'center', borderRadius: 15 },
    btnSecondaryCancelNow: { flex: 1, height: 50, justifyContent: 'center' },
    filterDrawerFrameBox: { overflow: 'hidden', paddingHorizontal: 15, marginBottom: 20 },
    filterInternalSurfaceBox: { padding: 18, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.04)' },
    filterSectionFrame: { marginBottom: 8 },
    labelFilterSmall: { fontWeight: '900', fontSize: 10, marginBottom: 8, letterSpacing: 1 },
    rowPickerFilterGroup: { flexDirection: 'row', gap: 10 },
    pickerBoxFrameAdjusted: { flex: 1, minHeight: 55 },
    pickerSurfaceAdjusted: { borderWidth: 1.5, borderColor: '#88888830', borderRadius: 14, height: 50, justifyContent: 'center', overflow: 'hidden' },
    btnExecuteFilterNow: { marginTop: 15, borderRadius: 12, height: 45, justifyContent: 'center' },
    essencialControlCardBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 18, marginBottom: 15 },
    cardGroupOuter: { marginBottom: 18, borderRadius: 22, elevation: 8 },
    cardGroupInner: { flexDirection: 'row', alignItems: 'center', padding: 10 },
    textGroupTitle: { fontSize: 18, fontWeight: 'bold' },
    rowModalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    syncModalSurface: { padding: 30, borderRadius: 25, width: '80%', alignSelf: 'center', alignItems: 'center' },
    datePickerWebWrapper: { marginBottom: 20 },
    datePickerMobileWrapper: { marginBottom: 20 },
    dateDisplayRowContainer: { flexDirection: 'row', alignItems: 'center' },
    miniLabelTxt: { fontSize: 12, fontWeight: 'bold', marginLeft: 5 },
    inputFrameAdjusted: { borderWidth: 1.5, padding: 14, borderRadius: 16, height: 55, justifyContent: 'center' },
    emptyStateBoxContainer: { padding: 100, alignItems: 'center', justifyContent: 'center', opacity: 0.4 }
});
