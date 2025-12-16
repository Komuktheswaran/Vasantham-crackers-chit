import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Select, Drawer, Descriptions, Progress, Spin } from 'antd';
import { customersAPI, schemesAPI, dashboardAPI } from '../services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from 'recharts';
import { UserOutlined, MoneyCollectOutlined, BarChartOutlined, DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import './css/Dashboard.css';

const { Option } = Select;

const Dashboard = () => {
  const [stats, setStats] = useState({});
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [schemeStats, setSchemeStats] = useState([]);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [loading, setLoading] = useState(true);
  
  // Detail view states
  const [detailType, setDetailType] = useState(null); // 'customer', 'scheme', 'month'
  const [detailData, setDetailData] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  
  // Selection states
  const [allCustomers, setAllCustomers] = useState([]);
  const [allSchemes, setAllSchemes] = useState([]);
  
  // Graph filter states
  // const [selectedCustomerId, setSelectedCustomerId] = useState(null); // Removed filter
  // const [selectedSchemeId, setSelectedSchemeId] = useState(null); // Removed filter

  // Temporary selection states for drawers
  const [customerSelectorValue, setCustomerSelectorValue] = useState(undefined);
  const [schemeSelectorValue, setSchemeSelectorValue] = useState(undefined);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [customersRes, schemesRes] = await Promise.all([
        customersAPI.getAll({ page: 1, limit: 5 }),
        schemesAPI.getAll()
      ]);

      const schemesList = Array.isArray(schemesRes.data?.schemes) ? schemesRes.data.schemes : [];
      const customersList = Array.isArray(customersRes.data?.customers) ? customersRes.data.customers : [];

      setStats({
        totalCustomers: customersRes.data.pagination?.totalRecords || 0,
        totalSchemes: schemesList.length,
        activeSchemes: schemesList.filter(s => s.member_count > 0).length,
      });

      setRecentCustomers(customersList);
      
      // Fetch all customers and schemes for selectors
      const allCustomersRes = await customersAPI.getAll({});
      const allCustomersList = Array.isArray(allCustomersRes.data?.customers) ? allCustomersRes.data.customers : [];
      
      setAllCustomers(allCustomersList);
      setAllSchemes(schemesList);
      
      setSchemeStats(schemesList.map(scheme => ({
        name: scheme.Name,
        members: scheme.member_count || 0,
        amount: scheme.Total_Amount || 0,
        key: scheme.Scheme_ID
      })));

      const monthlyStatsRes = await dashboardAPI.getMonthlyStats(selectedYear, null, null);
      setMonthlyData(monthlyStatsRes.data);
      
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSelect = async (customerId) => {
    try {
      setCustomerSelectorValue(customerId); // Show selection briefly
      const response = await dashboardAPI.getCustomerDetails(customerId);
      setDetailData(response.data);
      setDetailType('customer');
      setDrawerVisible(true);
      setCustomerSelectorValue(undefined); // Clear after loading
    } catch (error) {
      console.error('Error loading customer details:', error);
      setCustomerSelectorValue(undefined); // Clear on error too
    }
  };

  const handleSchemeSelect = async (schemeId) => {
    try {
      setSchemeSelectorValue(schemeId); // Show selection briefly
      const response = await dashboardAPI.getSchemeDetails(schemeId);
      setDetailData(response.data);
      setDetailType('scheme');
      setDrawerVisible(true);
      setSchemeSelectorValue(undefined); // Clear after loading
    } catch (error) {
      console.error('Error loading scheme details:', error);
      setSchemeSelectorValue(undefined); // Clear on error too
    }
  };

  const handleMonthClick = (month) => {
    const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month) + 1;
    fetchMonthDetails(selectedYear, monthIndex);
  };

  const fetchMonthDetails = async (year, month) => {
    try {
      const response = await dashboardAPI.getMonthDetails(year, month);
      setDetailData({ ...response.data, year, month });
      setDetailType('month');
      setDrawerVisible(true);
    } catch (error) {
      console.error('Error loading month details:', error);
    }
  };

  const chartData = [
    { name: 'Active Schemes', value: stats.activeSchemes || 0 },
    { name: 'Inactive Schemes', value: (stats.totalSchemes || 0) - (stats.activeSchemes || 0) },
  ];

  const recentCustomerColumns = [
    { 
      title: 'Customer', 
      key: 'name',
      width: 150,
      ellipsis: true,
      render: (_, record) => record.Name || `${record.First_Name || ''} ${record.Last_Name || ''}`
    },
    { title: 'Phone', dataIndex: 'Phone_Number', key: 'phone', width: 120, render: (text) => `+91 ${text}` },
    { title: 'Area', dataIndex: 'Area', key: 'area', width: 100, ellipsis: true },
  ];

  const schemeStatsColumns = [
    { title: 'Scheme Name', dataIndex: 'name', key: 'name', width: 180, ellipsis: true },
    { title: 'Members', dataIndex: 'members', key: 'members', width: 120 },
    { 
      title: 'Total Amount', 
      dataIndex: 'amount', 
      key: 'amount',
      width: 140,
      render: (val) => `₹${val?.toLocaleString()}`
    },
  ];

  const renderCustomerDetails = () => {
    if (!detailData || !detailData.customer) return null;
    const { customer, schemes, payments } = detailData;

    const schemeColumns = [
      { title: 'Scheme', dataIndex: 'Name', key: 'name' },
      { 
        title: 'Progress', 
        key: 'progress',
        render: (_, record) => {
          const percentage = record.total_dues > 0 ? (record.paid_dues / record.total_dues) * 100 : 0;
          return <Progress percent={Math.round(percentage)} size="small" />;
        }
      },
      { 
        title: 'Paid', 
        dataIndex: 'total_paid_amount', 
        key: 'paid',
        render: (val) => `₹${val?.toLocaleString()}`
      },
      { 
        title: 'Due', 
        dataIndex: 'total_due_amount', 
        key: 'due',
        render: (val) => `₹${val?.toLocaleString()}`
      },
    ];

    const paymentColumns = [
      { title: 'Date', dataIndex: 'Amount_Received_date', key: 'date', render: (val) => dayjs(val).format('DD MMM YYYY') },
      { title: 'Scheme', dataIndex: 'scheme_name', key: 'scheme' },
      { title: 'Amount', dataIndex: 'Amount_Received', key: 'amount', render: (val) => `₹${val?.toLocaleString()}` },
      { title: 'Transaction ID', dataIndex: 'Transaction_ID', key: 'txn' },
    ];

    return (
      <>
        <Descriptions title="Customer Information" column={2} bordered>
          <Descriptions.Item label="Customer ID">{customer.Customer_ID}</Descriptions.Item>
          <Descriptions.Item label="Name">{customer.First_Name} {customer.Last_Name}</Descriptions.Item>
          <Descriptions.Item label="Phone">{customer.Phone_Number}</Descriptions.Item>
          <Descriptions.Item label="Phone 2">{customer.Phone_Number2}</Descriptions.Item>
          <Descriptions.Item label="Address" span={2}>{customer.StreetAddress1}, {customer.Area}</Descriptions.Item>
        </Descriptions>

        <Card title="Schemes" className="mt-16">
          <Table dataSource={schemes} columns={schemeColumns} rowKey="Scheme_ID" pagination={false} />
        </Card>

        <Card title="Payment History" className="mt-16">
          <Table dataSource={payments} columns={paymentColumns} rowKey="Pay_ID" pagination={{ pageSize: 5 }} />
        </Card>
      </>
    );
  };

  const renderSchemeDetails = () => {
    if (!detailData || !detailData.scheme) return null;
    const { scheme, members, monthlyCollection } = detailData;

    const memberColumns = [
      { title: 'Customer', dataIndex: 'customer_name', key: 'name' },
      { title: 'Phone', dataIndex: 'Phone_Number', key: 'phone' },
      { 
        title: 'Progress', 
        key: 'progress',
        render: (_, record) => {
          const percentage = record.total_dues > 0 ? (record.paid_dues / record.total_dues) * 100 : 0;
          return <Progress percent={Math.round(percentage)} size="small" />;
        }
      },
      { 
        title: 'Paid', 
        dataIndex: 'total_paid_amount', 
        key: 'paid',
        render: (val) => `₹${val?.toLocaleString()}`
      },
    ];

    const monthNames = ['','Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartData = monthlyCollection.map(m => ({
      month: `${monthNames[m.month]} ${m.year}`,
      due: m.total_due,
      received: m.total_received
    }));

    return (
      <>
        <Descriptions title="Scheme Information" column={2} bordered>
          <Descriptions.Item label="Scheme Name">{scheme.Name}</Descriptions.Item>
          <Descriptions.Item label="Total Amount">₹{scheme.Total_Amount?.toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="Amount per Month">₹{scheme.Amount_per_month?.toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="Number of Dues">{scheme.Number_of_due}</Descriptions.Item>
          <Descriptions.Item label="Members">{members.length}</Descriptions.Item>
        </Descriptions>

        <Card title="Monthly Collection" className="mt-16">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="due" stroke="#faad14" name="Expected" />
              <Line type="monotone" dataKey="received" stroke="#52c41a" name="Received" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Members" className="mt-16">
          <Table dataSource={members} columns={memberColumns} rowKey="Customer_ID" pagination={false} />
        </Card>
      </>
    );
  };

  const renderMonthDetails = () => {
    if (!detailData || !detailData.summary) return null;
    const { summary, payments, dues, year, month } = detailData;
    const monthNames = ['','Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const paymentColumns = [
      { title: 'Date', dataIndex: 'Amount_Received_date', key: 'date', render: (val) => dayjs(val).format('DD MMM') },
      { title: 'Customer', dataIndex: 'customer_name', key: 'customer' },
      { title: 'Scheme', dataIndex: 'scheme_name', key: 'scheme' },
      { title: 'Amount', dataIndex: 'Amount_Received', key: 'amount', render: (val) => `₹${val?.toLocaleString()}` },
    ];

    const dueColumns = [
      { title: 'Due Date', dataIndex: 'Due_date', key: 'date', render: (val) => dayjs(val).format('DD MMM') },
      { title: 'Customer', dataIndex: 'customer_name', key: 'customer' },
      { title: 'Scheme', dataIndex: 'scheme_name', key: 'scheme' },
      { title: 'Pending', dataIndex: 'pending_amount', key: 'pending', render: (val) => `₹${val?.toLocaleString()}` },
    ];

    return (
      <>
        <h3>{monthNames[month]} {year} Summary</h3>
        <Row gutter={16} className="mb-16">
          <Col span={12}>
            <Card>
              <Statistic 
                title="Payments Received" 
                value={summary.totalPayments} 
                precision={0}
                className="stat-success"
                suffix={`(${summary.paymentsCount})`}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card>
              <Statistic 
                title="Pending Dues" 
                value={summary.totalDues} 
                precision={0}
                className="stat-warning"
                suffix={`(${summary.duesCount})`}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Payments Received" className="mt-16">
          <Table dataSource={payments} columns={paymentColumns} rowKey="Pay_ID" pagination={{ pageSize: 5 }} />
        </Card>

        <Card title="Pending Dues" className="mt-16">
          <Table dataSource={dues} columns={dueColumns} rowKey={(record) => `${record.Customer_ID}_${record.Scheme_ID}_${record.Due_number}`} pagination={{ pageSize: 5 }} />
        </Card>
      </>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" spinning={true}>
          <div className="p-50">Loading dashboard data...</div>
        </Spin>
      </div>
    );
  }

  return (
    <>
      <h2 className="page-title mb-24">Dashboard Overview</h2>
      
      {/* Selection Row */}
      <Row gutter={[16, 16]} className="mb-24">
        <Col xs={24} md={8}>
          <Card title="View Customer Details">
            <Select
              showSearch
              style={{ width: '100%' }}
              placeholder="Select a customer"
              optionFilterProp="children"
              onChange={handleCustomerSelect}
              value={customerSelectorValue}
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {allCustomers.map(c => (
                <Option key={c.Customer_ID} value={c.Customer_ID}>
                  {c.First_Name} {c.Last_Name} ({c.Customer_ID})
                </Option>
              ))}
            </Select>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="View Scheme Details">
            <Select
              style={{ width: '100%' }}
              placeholder="Select a scheme"
              onChange={handleSchemeSelect}
              value={schemeSelectorValue}
            >
              {allSchemes.map(s => (
                <Option key={s.Scheme_ID} value={s.Scheme_ID}>
                  {s.Name}
                </Option>
              ))}
            </Select>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Click on a month in the chart below to view details" />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-24">
        <Col xs={24} sm={12} lg={6}>
          <Card>
              <Statistic
                title="Total Customers"
                value={stats.totalCustomers}
                className="stat-dark-green"
                prefix={<UserOutlined />}
              />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
              <Statistic
                title="Total Schemes"
                value={stats.totalSchemes}
                className="stat-primary"
                prefix={<MoneyCollectOutlined />}
              />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
              <Statistic
                title="Active Schemes"
                value={stats.activeSchemes}
                className="stat-success"
                prefix={<BarChartOutlined />}
              />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
              <Statistic
                title="Total Revenue (Est.)"
                value={schemeStats.reduce((sum, s) => sum + (s.amount * s.members), 0)}
                className="stat-warning"
                prefix={<DollarOutlined />}
                precision={0}
              />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-24">
        <Col span={24}>
          <Card 
            title="Monthly Payment Overview"
            className="dashboard-chart-card"
            extra={
              <div className="flex-gap-8 responsive-filters">
                <Select value={selectedYear} onChange={setSelectedYear} style={{ width: 100 }}>
                  <Option value={2024}>2024</Option>
                  <Option value={2025}>2025</Option>
                </Select>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="payments" 
                  fill="#52c41a" 
                  name="Payments Received" 
                  onClick={(data) => handleMonthClick(data.month)}
                  cursor="pointer"
                />
                <Bar 
                  dataKey="due" 
                  fill="#faad14" 
                  name="Pending Dues" 
                  onClick={(data) => handleMonthClick(data.month)}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={24}>
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
        <Col xs={24} lg={24}>
          <Card title="Recent Customers">
            <Table
              dataSource={recentCustomers}
              columns={recentCustomerColumns}
              rowKey="Customer_ID"
              pagination={false}
              size="small"
              scroll={{ x: true }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={24}>
          <Card title="Scheme Statistics">
            <Table
              dataSource={schemeStats}
              columns={schemeStatsColumns}
              rowKey="key"
              pagination={false}
              size="small"
              scroll={{ x: true, y: 240 }}
            />
          </Card>
        </Col>
      </Row>

      <Drawer
        title={
          detailType === 'customer' ? 'Customer Details' :
          detailType === 'scheme' ? 'Scheme Details' :
          'Month Details'
        }
        placement="right"
        width={window.innerWidth > 768 ? 720 : '100%'}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {detailType === 'customer' && renderCustomerDetails()}
        {detailType === 'scheme' && renderSchemeDetails()}
        {detailType === 'month' && renderMonthDetails()}
      </Drawer>
    </>
  );
};

export default Dashboard;
