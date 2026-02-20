import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Select, Drawer, Descriptions, Input, Button, message, Spin, Table, Progress } from 'antd';
import { customersAPI, schemesAPI, dashboardAPI } from '../services/api';
import { UserOutlined, MoneyCollectOutlined, BarChartOutlined, DollarOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import './css/Dashboard.css';

const { Option } = Select;

const Dashboard = () => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Search state
  const [searchType, setSearchType] = useState('phone'); // phone, custId, fundNo
  const [searchValue, setSearchValue] = useState('');
  
  // Detail view states
  const [detailData, setDetailData] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [detailType, setDetailType] = useState(null); // 'customer'

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [customersRes, schemesRes] = await Promise.all([
        customersAPI.getAll({ limit: 1 }), // Minimal data needed
        schemesAPI.getAll()
      ]);

      const schemesList = Array.isArray(schemesRes.data?.schemes) ? schemesRes.data.schemes : [];
      // Calculate total fund members from schemes
      const totalFundMembers = schemesList.reduce((sum, scheme) => sum + (scheme.member_count || 0), 0);

      setStats({
        totalCustomers: customersRes.data.pagination?.totalRecords || 0,
        totalFundMembers: totalFundMembers,
        activeSchemes: schemesList.filter(s => s.member_count > 0).length,
      });
      
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
      if(!searchValue) return;
      setLoading(true);
      try {
          let customerData = null;
          
          if(searchType === 'fundNo') {
               const res = await customersAPI.getByFundNumber(searchValue);
               // getByFundNumber returns { Customer_ID, ... }
               // We then fetch full details
               if(res.data && res.data.Customer_ID) {
                   const detailRes = await dashboardAPI.getCustomerDetails(res.data.Customer_ID);
                   customerData = detailRes.data;
               }
          } else if (searchType === 'custId') {
               const detailRes = await dashboardAPI.getCustomerDetails(searchValue);
               customerData = detailRes.data;
          } else if (searchType === 'phone') {
               // Need to find customer by phone first.
               // Assuming customersAPI.getAll supports search by phone or general search
               const res = await customersAPI.getAll({ search: searchValue });
               if(res.data.customers && res.data.customers.length > 0) {
                   const cust = res.data.customers[0];
                   const detailRes = await dashboardAPI.getCustomerDetails(cust.Customer_ID);
                   customerData = detailRes.data;
               } else {
                   message.warning('Customer not found');
               }
          }

          if (customerData) {
              setDetailData(customerData);
              setDetailType('customer');
              setDrawerVisible(true);
          } else {
              message.warning('No details found');
          }

      } catch (error) {
          console.error("Search Error", error);
          message.error('Search failed or not found');
      } finally {
          setLoading(false);
      }
  };

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
      { title: 'Paid', dataIndex: 'total_paid_amount', key: 'paid', render: (val) => `₹${val?.toLocaleString()}` },
      { title: 'Due', dataIndex: 'total_due_amount', key: 'due', render: (val) => `₹${val?.toLocaleString()}` },
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

  if (loading && !detailData) { // Only full screen load on initial
    return <div className="loading-container"><Spin size="large" /></div>;
  }

  return (
    <>
      <h2 className="page-title mb-24">Dashboard</h2>
      
      {/* Search Section */}
      <Card className="mb-24" title="Quick Search">
          <Row gutter={16}>
              <Col xs={24} md={6}>
                  <Select value={searchType} onChange={setSearchType} style={{ width: '100%' }}>
                      <Option value="phone">Phone Number</Option>
                      <Option value="custId">Customer ID</Option>
                      <Option value="fundNo">Fund Number</Option>
                  </Select>
              </Col>
              <Col xs={24} md={12}>
                  <Input 
                    placeholder={`Enter ${searchType === 'phone' ? 'Phone Number' : searchType === 'custId' ? 'Customer ID' : 'Fund Number'}`}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onPressEnter={handleSearch}
                  />
              </Col>
              <Col xs={24} md={6}>
                  <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} block>
                      Search
                  </Button>
              </Col>
          </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
              <Statistic
                title="Total Customers"
                value={stats.totalCustomers}
                className="stat-dark-green"
                prefix={<UserOutlined />}
              />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
              <Statistic
                title="Total Fund Members"
                value={stats.totalFundMembers}
                className="stat-primary"
                prefix={<UsergroupAddOutlined />}
              />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
              <Statistic
                title="Active Schemes"
                value={stats.activeSchemes}
                className="stat-success"
                prefix={<BarChartOutlined />}
              />
          </Card>
        </Col>
      </Row>

      <Drawer
        title="Customer Details"
        placement="right"
        width={window.innerWidth > 768 ? 720 : '100%'}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {detailType === 'customer' && renderCustomerDetails()}
      </Drawer>
    </>
  );
};

export default Dashboard;
