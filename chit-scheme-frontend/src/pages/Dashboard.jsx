import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table } from 'antd';
import { customersAPI, schemesAPI } from '../services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { UserOutlined, MoneyCollectOutlined, BarChartOutlined } from '@ant-design/icons';

const Dashboard = () => {
  const [stats, setStats] = useState({});
  const [recentCustomers, setRecentCustomers] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [customersRes, schemesRes] = await Promise.all([
        customersAPI.getAll({ page: 1, limit: 5 }),
        schemesAPI.getAll()
      ]);

      setStats({
        totalCustomers: customersRes.data.pagination?.totalRecords || 0,
        totalSchemes: schemesRes.data.length || 0,
        activeSchemes: schemesRes.data.filter(s => s.member_count > 0).length || 0,
      });

      setRecentCustomers(customersRes.data.customers || []);
    } catch (error) {
      console.error('Dashboard error:', error);
    }
  };

  const chartData = [
    { name: 'Active Schemes', value: stats.activeSchemes || 0 },
    { name: 'Inactive Schemes', value: (stats.totalSchemes || 0) - (stats.activeSchemes || 0) },
  ];

  const columns = [
    { title: 'Customer', dataIndex: 'Name', key: 'name' },
    { title: 'Phone', dataIndex: 'Phone_Number', key: 'phone', render: (text) => `+91 ${text}` },
    { title: 'Area', dataIndex: 'Area', key: 'area' },
  ];

  return (
    <>
      <h2>Dashboard Overview</h2>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Customers"
              value={stats.totalCustomers}
              valueStyle={{ color: '#3f8600' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Schemes"
              value={stats.totalSchemes}
              valueStyle={{ color: '#1890ff' }}
              prefix={<MoneyCollectOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Schemes"
              value={stats.activeSchemes}
              valueStyle={{ color: '#52c41a' }}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="Scheme Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
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
        <Col span={12}>
          <Card title="Recent Customers">
            <Table
              dataSource={recentCustomers}
              columns={columns}
              rowKey="Customer_ID"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default Dashboard;
