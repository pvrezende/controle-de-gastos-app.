// frontend/screens/ReportsScreen.js
import React, { useState, useCallback, useContext, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    ActivityIndicator, 
    Dimensions, 
    RefreshControl, 
    Alert,
    Platform
} from 'react-native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Title, Paragraph, IconButton, Surface, Divider, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const screenWidth = Dimensions.get('window').width;

/**
 * Função utilitária para geração de cores hexadecimais aleatórias.
 * Garante identidade visual vibrante para as categorias nos gráficos.
 */
const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};

/**
 * TELA: ReportsScreen
 * Finalidade: Dashboard analítico com inteligência de gastos.
 * Funcionalidade: Exibe o dreno real causado por gastos supérfluos (essencial = 0).
 */
export default function ReportsScreen() {
    const { api } = useContext(AuthContext);
    const { theme, isDarkTheme } = useContext(ThemeContext);
    
    // ==========================================
    // 1. ESTADOS DE DADOS ANALÍTICOS
    // ==========================================
    const [chartData, setChartData] = useState([]);
    const [summary, setSummary] = useState({ 
        renda: 0, 
        gastos: 0, 
        economia: 0, 
        rendaExtra: 0, 
        gastosSuperfluos: 0 // Valor real vindo da nova coluna
    });
    const [monthlySpendings, setMonthlySpendings] = useState([]);
    const [categoryDetails, setCategoryDetails] = useState([]);
    
    // ==========================================
    // 2. ESTADOS DE CONTROLE DE INTERFACE
    // ==========================================
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    /**
     * fetchData: Sincroniza informações financeiras do RDS AWS.
     * Lógica: Filtra despesas supérfluas do mês para exibir o dreno financeiro real.
     */
    const fetchData = async (date) => {
        try {
            setLoading(true);
            const mes = date.getMonth() + 1;
            const ano = date.getFullYear();

            // Chamadas paralelas para otimizar a latência da AWS RDS
            const [categoriasRes, usuarioRes, gastosMensaisRes, rendasExtrasRes, todasDespesasRes] = await Promise.all([
                api.get(`/despesas/categorias-mes?mes=${mes}&ano=${ano}`),
                api.get('/usuario'),
                api.get('/despesas/gastos-mensais'),
                api.get(`/rendas-extras?mes=${mes}&ano=${ano}`),
                api.get('/despesas') // Buscamos todas para calcular o supérfluo real baseado na coluna 'essencial'
            ]);
            
            // Cálculos do Resumo Geral
            const rendaBase = parseFloat(usuarioRes.data.renda_mensal) || 0;
            const extrasMes = (rendasExtrasRes.data || []).reduce((sum, d) => sum + parseFloat(d.valor), 0);
            const rendaTotal = rendaBase + extrasMes;
            const gastoTotalMes = (categoriasRes.data || []).reduce((sum, item) => sum + parseFloat(item.total), 0);

            // LÓGICA DE ECONOMIA INTELIGENTE: Filtra gastos não essenciais (essencial = 0) do mês selecionado
            const calculoSuperfluo = (todasDespesasRes.data || []).filter(d => {
                const dataVenc = new Date(d.data_vencimento);
                return (dataVenc.getMonth() + 1) === mes && 
                       dataVenc.getFullYear() === ano && 
                       d.essencial === 0; // Coluna essencial adicionada via MobaXterm
            }).reduce((sum, item) => sum + parseFloat(item.valor), 0);

            setSummary({
                renda: rendaTotal,
                gastos: gastoTotalMes,
                economia: rendaTotal - gastoTotalMes,
                rendaExtra: extrasMes,
                gastosSuperfluos: calculoSuperfluo,
            });

            // 1. Processamento do Gráfico de Pizza (Gastos por Categoria)
            const pieData = (categoriasRes.data || []).map(item => ({
                name: item.categoria,
                population: parseFloat(item.total),
                color: getRandomColor(),
                legendFontColor: theme.text,
                legendFontSize: 12,
            }));
            setChartData(pieData);

            const detailsColors = (categoriasRes.data || []).map((item, index) => ({
                ...item,
                color: pieData[index]?.color || getRandomColor(),
            }));
            setCategoryDetails(detailsColors);

            // 2. Ordenação do Histórico de Gastos (Barras Multicoloridas)
            const sortedMonthly = (gastosMensaisRes.data || []).sort((a, b) => 
                new Date(a.ano, a.mes - 1) - new Date(b.ano, b.mes - 1)
            );
            setMonthlySpendings(sortedMonthly);

        } catch (error) {
            console.error('Erro na carga dos relatórios:', error);
            Alert.alert('Erro RDS', 'Não foi possível ler as estatísticas do servidor.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (selectedDate) fetchData(selectedDate);
    }, [selectedDate]);

    useFocusEffect(useCallback(() => { setSelectedDate(new Date()); }, []));
    
    const onRefresh = () => {
        setRefreshing(true);
        fetchData(selectedDate);
    };

    const handlePreviousMonth = () => {
        const d = new Date(selectedDate);
        d.setMonth(d.getMonth() - 1);
        setSelectedDate(d);
    };

    const handleNextMonth = () => {
        const d = new Date(selectedDate);
        d.setMonth(d.getMonth() + 1);
        setSelectedDate(d);
    };

    /**
     * Configuração visual dos gráficos.
     * Ajustado para eliminar fundos brancos residuais.
     */
    const chartBaseConfig = {
        backgroundColor: theme.cardBackground,
        backgroundGradientFrom: isDarkTheme ? '#1a1a1a' : '#ffffff',
        backgroundGradientTo: isDarkTheme ? '#1a1a1a' : '#ffffff',
        decimalPlaces: 0,
        color: (opacity = 1) => theme.primary,
        labelColor: (opacity = 1) => theme.text,
        style: { borderRadius: 16 },
        fillShadowGradient: theme.primary,
        fillShadowGradientOpacity: 1,
    };

    const formatLabel = (label) => {
        const [m, y] = label.split('/');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${monthNames[m - 1]}/${y.slice(2)}`;
    };

    // ==========================================
    // 3. ESTILOS INTERNOS PERSONALIZADOS
    // ==========================================
    const styles = StyleSheet.create({
        main: { flex: 1, backgroundColor: theme.background },
        loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        headerSurface: { padding: 25, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, alignItems: 'center' },
        scrollContent: { padding: 20, paddingBottom: 130 },
        navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 15 },
        navTxt: { fontSize: 16, fontWeight: 'bold', color: theme.text, letterSpacing: 0.5 },
        metricContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
        cardStat: { width: '48%', marginBottom: 15, borderRadius: 20, borderLeftWidth: 8, elevation: 5, backgroundColor: theme.cardBackground },
        statLabel: { fontSize: 10, fontWeight: 'bold', color: theme.subText, textTransform: 'uppercase' },
        statValue: { fontSize: 18, fontWeight: '900', marginTop: 4 },
        // ESTILO DO CARD DE SUPÉRFLUOS
        cardSuperfluo: { width: '100%', marginVertical: 15, borderRadius: 25, borderLeftWidth: 12, borderLeftColor: '#FF9800', elevation: 8, backgroundColor: theme.cardBackground, overflow: 'hidden' },
        chartBox: { padding: 15, borderRadius: 25, backgroundColor: theme.cardBackground, marginBottom: 25, elevation: 4, alignItems: 'center' },
        chartHeader: { fontSize: 14, fontWeight: 'bold', color: theme.text, marginBottom: 15 },
        detailBox: { padding: 20, borderRadius: 25, backgroundColor: theme.cardBackground, marginBottom: 30, elevation: 4 },
        detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: theme.subText + '20' },
        colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 }
    });

    if (loading && !refreshing) return <View style={styles.loadingCenter}><ActivityIndicator size="large" color={theme.primary} /><Text style={{color: theme.subText, marginTop: 15}}>Calculando Inteligência...</Text></View>;

    return (
        <View style={styles.main}>
            {/* CABEÇALHO ANALÍTICO */}
            <Surface style={[styles.headerSurface, { backgroundColor: isDarkTheme ? '#151515' : '#f5f5f5' }]} elevation={2}>
                <Title style={{ color: theme.text, fontSize: 24, fontWeight: 'bold' }}>Relatórios de Gastos</Title>
                <Paragraph style={{ color: theme.subText, fontSize: 12 }}>Análise baseada em suas marcações de "Essencial"</Paragraph>
            </Surface>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
            >
                {/* NAVEGAÇÃO DE DATA */}
                <View style={styles.navRow}>
                    <IconButton icon="chevron-left-circle" size={32} iconColor={theme.primary} onPress={handlePreviousMonth} />
                    <Text style={styles.navTxt}>
                        {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toLocaleUpperCase()}
                    </Text>
                    <IconButton icon="chevron-right-circle" size={32} iconColor={theme.primary} onPress={handleNextMonth} />
                </View>

                {/* MÉTRICAS PRINCIPAIS */}
                <View style={styles.metricContainer}>
                    <Card style={[styles.cardStat, { borderLeftColor: '#4CAF50' }]}>
                        <Card.Content>
                            <Text style={styles.statLabel}>Renda Total</Text>
                            <Text style={[styles.statValue, { color: '#4CAF50' }]}>R$ {summary.renda.toFixed(2)}</Text>
                        </Card.Content>
                    </Card>
                    <Card style={[styles.cardStat, { borderLeftColor: theme.danger }]}>
                        <Card.Content>
                            <Text style={styles.statLabel}>Gasto Mensal</Text>
                            <Text style={[styles.statValue, { color: theme.danger }]}>R$ {summary.gastos.toFixed(2)}</Text>
                        </Card.Content>
                    </Card>
                    <Card style={[styles.cardStat, { borderLeftColor: summary.economia >= 0 ? theme.secondary : theme.danger }]}>
                        <Card.Content>
                            <Text style={styles.statLabel}>Economia</Text>
                            <Text style={[styles.statValue, { color: summary.economia >= 0 ? theme.secondary : theme.danger }]}>R$ {summary.economia.toFixed(2)}</Text>
                        </Card.Content>
                    </Card>
                    <Card style={[styles.cardStat, { borderLeftColor: '#BB86FC' }]}>
                        <Card.Content>
                            <Text style={styles.statLabel}>Extra Mês</Text>
                            <Text style={[styles.statValue, { color: '#BB86FC' }]}>R$ {summary.rendaExtra.toFixed(2)}</Text>
                        </Card.Content>
                    </Card>
                </View>

                {/* CARD DE ECONOMIA INTELIGENTE: GASTOS SUPÉRFLUOS (ESTE É O CARD QUE VOCÊ QUER VER) */}
                <Card style={styles.cardSuperfluo}>
                    <Card.Content style={{ flexDirection: 'row', alignItems: 'center', padding: 15 }}>
                        <Avatar.Icon size={50} icon="alert-decagram" color="#FF9800" style={{ backgroundColor: '#FF980015' }} />
                        <View style={{ marginLeft: 15, flex: 1 }}>
                            <Text style={styles.statLabel}>Dreno Financeiro Real</Text>
                            <Title style={{ color: theme.text, fontWeight: '900', fontSize: 26 }}>R$ {summary.gastosSuperfluos.toFixed(2)}</Title>
                            <Paragraph style={{ color: theme.subText, fontSize: 11, lineHeight: 14 }}>
                                Total gasto em itens marcados como <Text style={{fontWeight: 'bold', color: '#FF9800'}}>não essenciais</Text> neste mês.
                            </Paragraph>
                        </View>
                    </Card.Content>
                </Card>

                {/* GRÁFICO 1: DISTRIBUIÇÃO */}
                <Surface style={styles.chartBox} elevation={3}>
                    <Text style={styles.chartHeader}>Gastos por Categoria</Text>
                    {chartData.length > 0 ? (
                        <PieChart
                            data={chartData}
                            width={screenWidth - 60}
                            height={200}
                            chartConfig={chartBaseConfig}
                            accessor={"population"}
                            backgroundColor={"transparent"}
                            paddingLeft={"15"}
                            absolute
                        />
                    ) : (
                        <View style={{ padding: 40 }}><Text style={{ color: theme.subText }}>Nenhum dado registrado.</Text></View>
                    )}
                </Surface>

                {/* GRÁFICO 2: HISTÓRICO MULTICOLORIDO */}
                {monthlySpendings.length > 0 && (
                    <Surface style={styles.chartBox} elevation={3}>
                        <Text style={styles.chartHeader}>Evolução Mensal (Barras Coloridas)</Text>
                        <BarChart
                            data={{
                                labels: monthlySpendings.map(item => formatLabel(`${item.mes}/${item.ano}`)),
                                datasets: [{ 
                                    data: monthlySpendings.map(item => parseFloat(item.total)),
                                    colors: monthlySpendings.map(() => (opacity = 1) => getRandomColor())
                                }],
                            }}
                            width={screenWidth - 60}
                            height={220}
                            yAxisLabel="R$ "
                            chartConfig={{ ...chartBaseConfig, barPercentage: 0.5, flatColor: true, useShadowColorFromDataset: false }}
                            fromZero
                            showBarTops={false}
                            withCustomBarColorFromData={true} 
                            style={{ borderRadius: 16, marginTop: 10 }}
                        />
                    </Surface>
                )}

                {/* DETALHAMENTO FINAL */}
                {categoryDetails.length > 0 && (
                    <Surface style={styles.detailBox} elevation={3}>
                        <Title style={{ color: theme.text, fontSize: 18, marginBottom: 15 }}>Detalhamento por Item</Title>
                        {categoryDetails.map((item) => (
                            <View key={item.categoria} style={styles.detailRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                                    <Text style={{ color: theme.text, fontSize: 15 }}>{item.categoria}</Text>
                                </View>
                                <Text style={{ color: theme.text, fontWeight: 'bold' }}>
                                    R$ {parseFloat(item.total).toFixed(2)}
                                </Text>
                            </View>
                        ))}
                    </Surface>
                )}
            </ScrollView>
        </View>
    );
}
