import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Select, Spin, Typography } from 'antd';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { schemesAPI, dashboardAPI } from '../services/api';
import dayjs from 'dayjs';

const { Option } = Select;
const { Title } = Typography;

const Reports = () => {
    const [stats, setStats] = useState({});
    const [monthlyData, setMonthlyData] = useState([]);
    const [selectedYear, setSelectedYear] = useState(dayjs().year());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [selectedYear]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [schemesRes, monthlyStatsRes] = await Promise.all([
                schemesAPI.getAll(),
                dashboardAPI.getMonthlyStats(selectedYear, null, null)
            ]);

            const schemesList = Array.isArray(schemesRes.data?.schemes) ? schemesRes.data.schemes : [];
            
            setStats({
                totalSchemes: schemesList.length,
                activeSchemes: schemesList.filter(s => s.member_count > 0).length,
                totalRevenueEst: schemesList.reduce((sum, s) => sum + (s.Total_Amount * (s.member_count || 0)), 0),
            });

            setMonthlyData(monthlyStatsRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const pieData = [
        { name: 'Active Schemes', value: stats.activeSchemes || 0 },
        { name: 'Inactive Schemes', value: (stats.totalSchemes || 0) - (stats.activeSchemes || 0) },
    ];

    if (loading) return <div className="loading-container"><Spin size="large" /></div>;

    return (
        <div style={{ padding: 24 }}>
            <Title level={2}>Reports & Analytics</Title>

            <Row gutter={[16, 16]} className="mb-24">
                <Col span={24}>
                    <Card 
                        title="Monthly Payment Overview" 
                        extra={
                             <Select value={selectedYear} onChange={setSelectedYear} style={{ width: 100 }}>
                                  <Option value={2023}>2023</Option>
                                  <Option value={2024}>2024</Option>
                                  <Option value={2025}>2025</Option>
                             </Select>
                        }
                    >
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="payments" fill="#52c41a" name="Payments Received" />
                                <Bar dataKey="due" fill="#faad14" name="Pending Dues" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <Card title="Scheme Distribution">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    <Cell key="active" fill="#52c41a" />
                                    <Cell key="inactive" fill="#f5222d" />
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
                {/* Additional charts can be added here */}
            </Row>
        </div>
    );
};

export default Reports;
