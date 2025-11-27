 
import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { customerAPI } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeSchemes: 0,
    pendingPayments: 0
  });

  useEffect(() => {
    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        const customers = await customerAPI.getAll();
        setStats(prev => ({ ...prev, totalCustomers: customers.data.length }));
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      <h2>Dashboard Overview</h2>
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Customers"
              value={stats.totalCustomers}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        {/* More stats cards */}
      </Row>
    </div>
  );
};

export default Dashboard;
