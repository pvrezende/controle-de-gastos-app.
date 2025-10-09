// frontend/screens/ReportsScreen.js
import React, { useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, RefreshControl, Alert } from 'react-native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Title, Paragraph, IconButton } from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

// Função para gerar cores aleatórias para o gráfico
const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};

export default function ReportsScreen() {
    const { api } = useContext(AuthContext);
    const { theme, isDarkTheme } = useContext(ThemeContext);
    const [chartData, setChartData] = useState([]);
    const [summary, setSummary] = useState({ renda: 0, gastos: 0, economia: 0, rendaExtra: 0, projeçãoGastos: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [monthlySpendings, setMonthlySpendings] = useState([]);
    const [categoryDetails, setCategoryDetails] = useState([]);

    const fetchData = async (date) => {
        setLoading(true);
        try {
            const mes = date.getMonth() + 1;
            const ano = date.getFullYear();

            const [categoriasRes, usuarioRes, gastosMensaisRes, rendasExtrasRes, projecaoRes] = await Promise.all([
                api.get(`/despesas/categorias-mes?mes=${mes}&ano=${ano}`),
                api.get('/usuario'),
                api.get('/despesas/gastos-mensais'),
                api.get(`/rendas-extras?mes=${mes}&ano=${ano}`),
                api.get('/despesas/projecao'),
            ]);
            
            const rendaMensal = parseFloat(usuarioRes.data.renda_mensal) || 0;
            const rendasExtrasDoMes = rendasExtrasRes.data.reduce((sum, d) => sum + parseFloat(d.valor), 0);
            const rendaTotal = rendaMensal + rendasExtrasDoMes;

            const totalGastoMes = categoriasRes.data.reduce((sum, item) => sum + parseFloat(item.total), 0);

            const projeçãoGastos = projecaoRes.data.totalProjetado;

            setSummary({
                renda: rendaTotal,
                gastos: totalGastoMes,
                economia: rendaTotal - totalGastoMes,
                rendaExtra: rendasExtrasDoMes,
                projeçãoGastos: projeçãoGastos,
            });

            // GERAÇÃO DE CORES CONSISTENTES PARA O GRÁFICO E A LISTA
            const pieChartData = categoriasRes.data.map(item => ({
                name: item.categoria,
                population: parseFloat(item.total),
                color: getRandomColor(),
                legendFontColor: isDarkTheme ? theme.text : '#7F7F7F',
                legendFontSize: 15,
            }));
            setChartData(pieChartData);

            // Adicionar a cor gerada a cada item para a lista de detalhes
            const detailsWithColors = categoriasRes.data.map((item, index) => ({
                ...item,
                color: pieChartData[index].color,
            }));
            setCategoryDetails(detailsWithColors);

            const sortedMonthlyData = gastosMensaisRes.data.sort((a, b) => new Date(a.ano, a.mes - 1) - new Date(b.ano, b.mes - 1));
            setMonthlySpendings(sortedMonthlyData);

        } catch (error) {
            console.error('Erro ao buscar dados para os relatórios:', error);
            Alert.alert('Erro', 'Não foi possível carregar os relatórios.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    React.useEffect(() => {
        if (selectedDate) {
            fetchData(selectedDate);
        }
    }, [selectedDate]);

    useFocusEffect(
        React.useCallback(() => {
            setSelectedDate(new Date());
        }, [])
    );
    
    const onRefresh = () => {
        setRefreshing(true);
        fetchData(selectedDate);
    };

    const handlePreviousMonth = () => {
        setSelectedDate(currentDate => {
            const newDate = new Date(currentDate);
            newDate.setMonth(newDate.getMonth() - 1);
            return newDate;
        });
    };

    const handleNextMonth = () => {
        setSelectedDate(currentDate => {
            const newDate = new Date(currentDate);
            newDate.setMonth(newDate.getMonth() + 1);
            return newDate;
        });
    };

    // Definição dos estilos DINÂMICOS dentro do componente
    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        title: { fontSize: 28, fontWeight: 'bold', marginVertical: 20, textAlign: 'center', color: theme.text },
        monthNavigator: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 10,
            marginBottom: 20,
        },
        monthText: {
            fontSize: 18,
            fontWeight: 'bold',
            color: theme.text,
        },
        summaryContainer: {
            flexDirection: 'row',
            justifyContent: 'space-around',
            flexWrap: 'wrap',
            marginHorizontal: 10,
            marginBottom: 20,
        },
        summaryCard: {
            width: '46%',
            marginBottom: 10,
            alignItems: 'center',
            elevation: 2,
            backgroundColor: theme.cardBackground,
        },
        summaryText: { fontSize: 16, color: theme.subText },
        summaryValue: { fontSize: 24, fontWeight: 'bold', color: theme.text },
        chartContainer: { alignItems: 'center', marginBottom: 20 },
        chartTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: theme.text },
        noDataContainer: {
            padding: 20,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 50,
        },
        noDataText: { fontSize: 16, textAlign: 'center', color: theme.subText },
        detailsContainer: {
            backgroundColor: theme.cardBackground,
            marginHorizontal: 10,
            borderRadius: 8,
            padding: 15,
            elevation: 2,
            marginBottom: 20,
        },
        detailsTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            marginBottom: 10,
            color: theme.text,
        },
        detailRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 8,
        },
        detailText: {
            fontSize: 16,
            color: theme.text,
        },
        detailValue: {
            fontSize: 16,
            fontWeight: 'bold',
            color: theme.text,
        },
        colorIndicator: {
            width: 12,
            height: 12,
            borderRadius: 6,
            marginRight: 10,
        },
    });

    const screenWidth = Dimensions.get('window').width;

    // Configuração do gráfico de barras para o tema escuro
    const barChartConfig = {
      backgroundColor: isDarkTheme ? theme.background : '#e26a00',
      backgroundGradientFrom: isDarkTheme ? theme.background : '#fb8c00',
      backgroundGradientTo: isDarkTheme ? theme.background : '#ffa726',
      decimalPlaces: 2,
      color: (opacity = 1) => isDarkTheme ? theme.text : `rgba(255, 255, 255, ${opacity})`,
      labelColor: (opacity = 1) => isDarkTheme ? theme.text : `rgba(255, 255, 255, ${opacity})`,
    };

    // Função para formatar o rótulo do mês no gráfico de barras
    const formatLabel = (label) => {
        const [month, year] = label.split('/');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const shortYear = year.slice(2);
        return `${monthNames[month - 1]}/${shortYear}`;
    };

    if (loading) {
        return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.text} /></View>;
    }

    return (
        <ScrollView 
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />}
        >
            <Text style={styles.title}>Relatórios de Gastos</Text>
            
            <View style={styles.monthNavigator}>
                <IconButton icon="chevron-left" size={28} onPress={handlePreviousMonth} iconColor={theme.text} />
                <Text style={styles.monthText}>
                    {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toLocaleUpperCase()}
                </Text>
                <IconButton icon="chevron-right" size={28} onPress={handleNextMonth} iconColor={theme.text} />
            </View>

            <View style={styles.summaryContainer}>
                <Card style={styles.summaryCard}>
                    <Card.Content>
                        <Paragraph style={styles.summaryText}>Renda Total</Paragraph>
                        <Title style={[styles.summaryValue, {color: 'green'}]}>R$ {summary.renda.toFixed(2)}</Title>
                    </Card.Content>
                </Card>
                <Card style={styles.summaryCard}>
                    <Card.Content>
                        <Paragraph style={styles.summaryText}>Gasto do Mês</Paragraph>
                        <Title style={[styles.summaryValue, {color: theme.danger}]}>R$ {summary.gastos.toFixed(2)}</Title>
                    </Card.Content>
                </Card>
                <Card style={styles.summaryCard}>
                    <Card.Content>
                        <Paragraph style={styles.summaryText}>Economia</Paragraph>
                        <Title style={[styles.summaryValue, {color: summary.economia >= 0 ? theme.secondary : theme.danger}]}>R$ {summary.economia.toFixed(2)}</Title>
                    </Card.Content>
                </Card>
                <Card style={styles.summaryCard}>
                    <Card.Content>
                        <Paragraph style={styles.summaryText}>Extra do Mês</Paragraph>
                        <Title style={[styles.summaryValue, {color: 'purple'}]}>R$ {summary.rendaExtra.toFixed(2)}</Title>
                    </Card.Content>
                </Card>
                <Card style={styles.summaryCard}>
                    <Card.Content>
                        <Paragraph style={styles.summaryText}>Estimativa de Gastos Desnecessários</Paragraph>
                        <Title style={[styles.summaryValue, {color: 'gray'}]}>R$ {summary.projeçãoGastos.toFixed(2)}</Title>
                    </Card.Content>
                </Card>
            </View>

            {chartData.length > 0 ? (
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>Distribuição dos Gastos</Text>
                    <PieChart
                        data={chartData}
                        width={screenWidth}
                        height={220}
                        chartConfig={{
                            backgroundColor: isDarkTheme ? theme.cardBackground : '#e26a00',
                            backgroundGradientFrom: isDarkTheme ? theme.cardBackground : '#fb8c00',
                            backgroundGradientTo: isDarkTheme ? theme.cardBackground : '#ffa726',
                            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                        }}
                        accessor={"population"}
                        backgroundColor={"transparent"}
                        paddingLeft={"15"}
                        absolute
                    />
                </View>
            ) : (
                <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>Não há gastos pagos no mês selecionado para exibir no gráfico.</Text>
                </View>
            )}

            {monthlySpendings.length > 0 && (
                 <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>Histórico de Gastos (Últimos 12 meses)</Text>
                    <BarChart
                        data={{
                            labels: monthlySpendings.map(item => formatLabel(`${item.mes}/${item.ano}`)),
                            datasets: [{
                                data: monthlySpendings.map(item => parseFloat(item.total)),
                            }],
                        }}
                        width={screenWidth}
                        height={220}
                        chartConfig={{...barChartConfig,
                            propsForBackgroundLines: {
                                strokeDasharray: "",
                                stroke: isDarkTheme ? theme.text : 'rgba(0, 0, 0, 0.2)',
                            },
                            propsForLabels: {
                                fill: isDarkTheme ? theme.text : 'black',
                            },
                            barPercentage: 0.5,
                        }}
                        style={{
                            marginVertical: 8,
                            borderRadius: 16,
                            backgroundColor: isDarkTheme ? theme.cardBackground : '#fff',
                        }}
                    />
                 </View>
            )}

            {categoryDetails.length > 0 && (
                <View style={styles.detailsContainer}>
                    <Text style={styles.detailsTitle}>Detalhes de Gastos por Categoria</Text>
                    {categoryDetails.map((item, index) => (
                        <View key={item.categoria} style={styles.detailRow}>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <View style={[styles.colorIndicator, {backgroundColor: item.color}]} />
                                <Text style={styles.detailText}>{item.categoria}</Text>
                            </View>
                            <Text style={styles.detailValue}>R$ {parseFloat(item.total).toFixed(2)}</Text>
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}