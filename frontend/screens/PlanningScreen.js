// frontend/screens/PlanningScreen.js
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
    ProgressBar,
    FAB 
} from 'react-native-paper'; 
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

/**
 * TELA: PlanningScreen (Meus Planejamentos e Metas)
 * Objetivo: Gestão de objetivos financeiros de longo prazo com metas de economia diária/mensal.
 * Estilo premium unificado com bordas dinâmicas e superfícies escuras.
 */
export default function PlanningScreen() {
    const { api } = useContext(AuthContext);
    const { theme, isDarkTheme } = useContext(ThemeContext);
    
    // ==========================================
    // 1. ESTADOS DE DADOS E DASHBOARD
    // ==========================================
    const [metas, setMetas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [totalObjetivo, setTotalObjetivo] = useState(0);
    const [totalEconomizado, setTotalEconomizado] = useState(0);
    
    // ==========================================
    // 2. ESTADOS DE CADASTRO (NOVA META)
    // ==========================================
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [newMeta, setNewMeta] = useState({
        nome: '',
        valor_alvo: '',
        data_limite: new Date(),
    });
    const [showDatePicker, setShowDatePicker] = useState(false);

    // ==========================================
    // 3. ESTADOS DE EDIÇÃO E CONTROLE
    // ==========================================
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingMeta, setEditingMeta] = useState(null);
    const [showEditDatePicker, setShowEditDatePicker] = useState(false);
    const [visibleMetaMenu, setVisibleMetaMenu] = useState(null);

    /**
     * fetchData: Sincroniza as metas do servidor RDS e calcula totais para o dashboard.
     */
    const fetchData = async () => {
        try {
            setRefreshing(true);
            const response = await api.get('/metas');
            const listaMetas = response.data || [];
            setMetas(listaMetas);

            // Cálculos para o Card de Resumo Superior
            const somaAlvo = listaMetas.reduce((sum, m) => sum + parseFloat(m.valor_alvo), 0);
            const somaEconomizada = listaMetas.reduce((sum, m) => sum + (parseFloat(m.valor_economizado) || 0), 0);
            
            setTotalObjetivo(somaAlvo);
            setTotalEconomizado(somaEconomizada);
        } catch (error) {
            console.error('Erro ao buscar metas:', error);
            Alert.alert('Erro', 'Não foi possível atualizar suas metas.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchData(); }, []));

    const onRefresh = () => fetchData();

    /**
     * handleAddMeta: Lógica de persistência para novo planejamento.
     */
    const handleAddMeta = async () => {
        if (!newMeta.nome || !newMeta.valor_alvo) {
            Alert.alert('Erro', 'Por favor, preencha o nome e o valor alvo.');
            return;
        }
        try {
            await api.post('/metas', {
                ...newMeta,
                valor_alvo: parseFloat(newMeta.valor_alvo),
                data_limite: newMeta.data_limite.toISOString().split('T')[0],
            });
            Alert.alert('Sucesso', 'Novo planejamento registrado!');
            setAddModalVisible(false);
            setNewMeta({ nome: '', valor_alvo: '', data_limite: new Date() });
            fetchData();
        } catch (error) {
            Alert.alert('Erro', 'Falha ao adicionar meta ao banco RDS.');
        }
    };

    /**
     * handleUpdateMeta: Envia atualizações de nome, valor ou data.
     */
    const handleUpdateMeta = async () => {
        if (!editingMeta) return;
        try {
            await api.put(`/metas/${editingMeta.id}`, {
                ...editingMeta,
                valor_alvo: parseFloat(editingMeta.valor_alvo),
                data_limite: editingMeta.data_limite.toISOString().split('T')[0],
            });
            Alert.alert("Sucesso", "Planejamento atualizado!");
            setEditModalVisible(false);
            setEditingMeta(null);
            fetchData();
        } catch (error) {
            Alert.alert("Erro", "Falha ao gravar alterações.");
        }
    };

    /**
     * handleDeleteMeta: Remoção definitiva da meta.
     */
    const handleDeleteMeta = (id) => {
        setVisibleMetaMenu(null);
        Alert.alert("Excluir Planejamento", "Esta ação é permanente. Deseja continuar?", [
            { text: "Cancelar", style: "cancel" },
            { text: "Sim, Excluir", style: "destructive", onPress: async () => {
                try {
                    await api.delete(`/metas/${id}`);
                    fetchData();
                } catch (e) { Alert.alert("Erro", "Não foi possível excluir."); }
            }}
        ]);
    };

    const handleToggleHomeVisibility = async (id) => {
        try {
            await api.put(`/metas/${id}/toggle-home`);
            fetchData();
        } catch (e) { Alert.alert("Erro", "Falha ao mudar visibilidade."); }
        setVisibleMetaMenu(null);
    };

    const handleOpenEditModal = (meta) => {
        const [y, m, d] = meta.data_limite.split('T')[0].split('-');
        setEditingMeta({
            ...meta,
            valor_alvo: String(meta.valor_alvo),
            data_limite: new Date(y, parseInt(m) - 1, d),
        });
        setEditModalVisible(true);
        setVisibleMetaMenu(null);
    };

    const onChangeDate = (e, d) => { setShowDatePicker(false); if(d) setNewMeta({ ...newMeta, data_limite: d }); };
    const onChangeEditDate = (e, d) => { setShowEditDatePicker(false); if(d) setEditingMeta({ ...editingMeta, data_limite: d }); };
    const openMetaMenu = (id) => setVisibleMetaMenu(id);

    // ==========================================
    // 4. FOLHA DE ESTILOS PREMIUM (+550 Linhas)
    // ==========================================
    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        header: { padding: 25, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, alignItems: 'center' },
        scrollContent: { padding: 20, paddingBottom: 130 },
        dashboardCard: { marginBottom: 20, borderRadius: 25, elevation: 8, backgroundColor: isDarkTheme ? '#152b36' : '#e3f2fd', borderLeftWidth: 12, borderLeftColor: '#2196F3' },
        metaCard: { marginBottom: 18, borderRadius: 22, elevation: 4, backgroundColor: theme.cardBackground, borderLeftWidth: 10, borderLeftColor: theme.primary },
        rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        progressBar: { height: 12, borderRadius: 6, marginTop: 15 },
        progressInfo: { textAlign: 'center', marginTop: 8, fontSize: 11, fontWeight: 'bold' },
        planBox: { marginTop: 15, padding: 18, borderRadius: 18, backgroundColor: isDarkTheme ? '#252525' : '#f9f9f9', borderTopWidth: 1, borderTopColor: theme.subText + '30' },
        planTitle: { fontSize: 13, fontWeight: 'bold', color: theme.primary, marginBottom: 8, letterSpacing: 0.8 },
        savingsText: { fontSize: 18, fontWeight: '900', color: theme.secondary },
        fab: { position: 'absolute', right: 25, bottom: 35, backgroundColor: theme.primary, borderRadius: 20, elevation: 12 },
        modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 25 },
        modalContent: { padding: 30, borderRadius: 32, backgroundColor: theme.cardBackground },
        inputField: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 15, color: theme.text, borderColor: theme.subText + '50', backgroundColor: isDarkTheme ? '#2a2a2a' : '#f5f5f5', fontSize: 16 },
        btnAction: { height: 52, justifyContent: 'center', borderRadius: 15, marginTop: 10 },
        center: { alignItems: 'center', justifyContent: 'center' }
    });

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>;

    const percentualGeral = totalObjetivo > 0 ? (totalEconomizado / totalObjetivo) : 0;

    return (
        <View style={styles.container}>
            {/* TOPO DA TELA PREMIUM */}
            <Surface style={[styles.header, { backgroundColor: isDarkTheme ? '#1a1a1a' : '#f5f5f5' }]} elevation={2}>
                <Title style={{ color: theme.text, fontSize: 26, fontWeight: 'bold' }}>Metas e Sonhos</Title>
                <Paragraph style={{ color: theme.subText }}>Organize seus planos para o futuro</Paragraph>
            </Surface>

            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
            >
                {/* DASHBOARD DE PROGRESSO ACUMULADO */}
                <Card style={styles.dashboardCard}>
                    <Card.Content>
                        <Text style={{ color: theme.subText, fontWeight: 'bold', fontSize: 12 }}>TOTAL DOS OBJETIVOS</Text>
                        <Title style={{ fontSize: 32, fontWeight: '900', color: '#2196F3' }}>R$ {totalObjetivo.toFixed(2)}</Title>
                        <ProgressBar progress={percentualGeral} color="#2196F3" style={styles.progressBar} />
                        <Text style={[styles.progressInfo, { color: theme.text }]}>
                            {`${(percentualGeral * 100).toFixed(1)}% do total já planejado`}
                        </Text>
                        <Divider style={{ marginVertical: 12 }} />
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name="star-circle" size={22} color={theme.secondary} />
                            <Text style={{ color: theme.text, marginLeft: 10, fontWeight: 'bold' }}>Guardado: R$ {totalEconomizado.toFixed(2)}</Text>
                        </View>
                    </Card.Content>
                </Card>

                {/* LISTAGEM DE METAS */}
                {metas.length > 0 ? metas.map(meta => {
                    const alvo = parseFloat(meta.valor_alvo);
                    const economizado = parseFloat(meta.valor_economizado) || 0;
                    const faltante = alvo - economizado;
                    const hoje = new Date(); hoje.setHours(0,0,0,0);
                    const limite = new Date(meta.data_limite); limite.setMinutes(limite.getMinutes() + limite.getTimezoneOffset());
                    const dias = Math.max(0, Math.ceil((limite - hoje) / (1000 * 60 * 60 * 24)));
                    
                    const daily = dias > 0 ? faltante / dias : faltante;
                    const monthly = (dias / 30.44) > 0 ? faltante / (dias / 30.44) : faltante;

                    return (
                        <Card key={meta.id} style={styles.metaCard}>
                            <Card.Title
                                title={meta.nome}
                                titleStyle={{ fontWeight: 'bold', color: theme.text, fontSize: 18 }}
                                left={() => <Avatar.Icon size={44} icon={meta.incluir_home ? "star-check" : "star-off-outline"} style={{ backgroundColor: theme.primary + '20' }} color={theme.primary} />}
                                right={() => (
                                    <Menu 
                                        visible={visibleMetaMenu === meta.id} 
                                        onDismiss={() => setVisibleMetaMenu(null)} 
                                        anchor={<IconButton icon="dots-vertical" onPress={() => openMetaMenu(meta.id)} iconColor={theme.text}/>}
                                    >
                                        <Menu.Item onPress={() => handleOpenEditModal(meta)} title="Editar Meta" leadingIcon="pencil" />
                                        <Menu.Item onPress={() => handleToggleHomeVisibility(meta.id)} title="Visibilidade na Home" leadingIcon="home-eye" />
                                        <Menu.Item onPress={() => handleDeleteMeta(meta.id)} title="Excluir" leadingIcon="delete-sweep" titleStyle={{color: theme.danger}}/>
                                    </Menu>
                                )}
                            />
                            <Card.Content>
                                <View style={styles.rowBetween}>
                                    <Text style={{ color: theme.subText }}>Objetivo: R$ {alvo.toFixed(2)}</Text>
                                    <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>{((economizado/alvo)*100).toFixed(0)}% concluído</Text>
                                </View>
                                
                                <ProgressBar progress={economizado / alvo} color={theme.primary} style={[styles.progressBar, { height: 8 }]} />

                                <Title style={{ color: theme.text, fontSize: 24, fontWeight: '900', marginTop: 15 }}>
                                    Restam: <Text style={{ color: theme.secondary }}>R$ {faltante.toFixed(2)}</Text>
                                </Title>
                                <Text style={{ color: theme.subText, fontSize: 13, marginBottom: 10 }}>Alcançar até: {limite.toLocaleDateString('pt-BR')}</Text>

                                <View style={styles.planBox}>
                                    <Text style={styles.planTitle}>PLANEJAMENTO DE ECONOMIA</Text>
                                    {dias > 0 ? (
                                        <View>
                                            <Text style={{ color: theme.text, fontSize: 15 }}>Guarde <Text style={styles.savingsText}>R$ {daily.toFixed(2)}</Text> por dia.</Text>
                                            <Text style={{ color: theme.text, fontSize: 15, marginTop: 4 }}>Ou reserve <Text style={styles.savingsText}>R$ {monthly.toFixed(2)}</Text> por mês.</Text>
                                            <Divider style={{ marginVertical: 8 }} />
                                            <Text style={{ color: theme.subText, fontSize: 12 }}>Prazo restante: {dias} dias</Text>
                                        </View>
                                    ) : (
                                        <Text style={{ color: theme.danger, fontWeight: 'bold' }}>⚠️ O prazo para esta meta expirou!</Text>
                                    )}
                                </View>
                            </Card.Content>
                        </Card>
                    );
                }) : (
                    <View style={[styles.center, { marginTop: 60 }]}>
                        <MaterialCommunityIcons name="star-outline" size={80} color={theme.subText + '50'} />
                        <Text style={{ color: theme.subText, textAlign: 'center' }}>Nenhuma meta de planejamento encontrada.</Text>
                    </View>
                )}
            </ScrollView>

            <FAB icon="star-plus" style={styles.fab} color="white" onPress={() => setAddModalVisible(true)} />

            {/* MODAL: ADICIONAR NOVA META */}
            <Modal visible={addModalVisible} transparent animationType="fade" onRequestClose={() => setAddModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <Surface style={styles.modalContent} elevation={5}>
                        <Title style={{ color: theme.text, textAlign: 'center', marginBottom: 25, fontWeight: 'bold' }}>Adicionar Nova Meta</Title>
                        
                        <TextInput 
                            style={styles.inputField} 
                            placeholder="Nome da Meta (ex: Viagem)" 
                            placeholderTextColor={theme.subText} 
                            value={newMeta.nome} 
                            onChangeText={t => setNewMeta({...newMeta, nome: t})} 
                        />
                        
                        <TextInput 
                            style={styles.inputField} 
                            placeholder="Valor Alvo (R$)" 
                            keyboardType="numeric" 
                            placeholderTextColor={theme.subText}
                            value={newMeta.valor_alvo} 
                            onChangeText={t => setNewMeta({...newMeta, valor_alvo: t})} 
                        />
                        
                        <Button 
                            mode="outlined" 
                            icon="calendar" 
                            onPress={() => setShowDatePicker(true)} 
                            style={{ marginBottom: 20, borderRadius: 15 }}
                        >
                            Data Limite: {newMeta.data_limite.toLocaleDateString('pt-BR')}
                        </Button>
                        
                        {showDatePicker && <DateTimePicker value={newMeta.data_limite} mode="date" display="default" onChange={onChangeDate} />}
                        
                        <Button mode="contained" onPress={handleAddMeta} style={styles.btnAction} labelStyle={{fontWeight: 'bold', fontSize: 16}}>ADICIONAR META</Button>
                        <Button mode="text" onPress={() => setAddModalVisible(false)} textColor={theme.danger} style={{ marginTop: 5 }}>CANCELAR</Button>
                    </Surface>
                </View>
            </Modal>

            {/* MODAL: EDIÇÃO DE META */}
            {editingMeta && (
                <Modal visible={editModalVisible} transparent animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <Surface style={styles.modalContent} elevation={5}>
                            <Title style={{ color: theme.text, textAlign: 'center', marginBottom: 25 }}>Editar Planejamento</Title>
                            <TextInput style={styles.inputField} placeholder="Nome" value={editingMeta.nome} onChangeText={t => setEditingMeta({...editingMeta, nome: t})} />
                            <TextInput style={styles.inputField} placeholder="Valor Alvo" keyboardType="numeric" value={editingMeta.valor_alvo} onChangeText={t => setEditingMeta({...editingMeta, valor_alvo: t})} />
                            <Button mode="outlined" icon="calendar-edit" onPress={() => setShowEditDatePicker(true)} style={{ marginBottom: 20, borderRadius: 15 }}>{editingMeta.data_limite.toLocaleDateString('pt-BR')}</Button>
                            {showEditDatePicker && <DateTimePicker value={editingMeta.data_limite} mode="date" display="default" onChange={onChangeEditDate} />}
                            <Button mode="contained" onPress={handleUpdateMeta} style={styles.btnAction}>SALVAR ALTERAÇÕES</Button>
                            <Button mode="text" onPress={() => setEditModalVisible(false)} textColor={theme.danger}>VOLTAR</Button>
                        </Surface>
                    </View>
                </Modal>
            )}
        </View>
    );
}
