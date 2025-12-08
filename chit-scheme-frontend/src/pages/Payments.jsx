import React, { useState, useEffect } from 'react';
import { 
  Card, Typography, Select, Table, Button, Form, Input, 
  DatePicker, message, Row, Col, Tag 
} from 'antd';
import { customersAPI, paymentsAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const Payments = () => {
  const [form] = Form.useForm();
  const [customers, setCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [schemes, setSchemes] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Load all customers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await customersAPI.getAll({});
        setAllCustomers(response.data.customers);
        setCustomers(response.data.customers);
      } catch (error) {
        console.error("Error loading customers:", error);
      }
    };
    fetchCustomers();
  }, []);

  // Filter customers by search value
  const handleSearch = (value) => {
    if (!value) {
      setCustomers(allCustomers);
      return;
    }
    
    const filtered = allCustomers.filter(c => 
      c.Customer_ID?.toLowerCase().includes(value.toLowerCase()) ||
      c.First_Name?.toLowerCase().includes(value.toLowerCase()) ||
      c.Last_Name?.toLowerCase().includes(value.toLowerCase()) ||
      c.Phone_Number?.includes(value)
    );
    setCustomers(filtered);
  };

  // Handle customer selection
  const handleCustomerSelect = async (customerId) => {
    setSelectedCustomer(customerId);
    setSelectedScheme(null);
    setDues([]);
    form.resetFields(['schemeId', 'dueNumber', 'amount', 'transactionId', 'date']);
    
    try {
      const response = await customersAPI.getSchemes(customerId);
      // Fetch full scheme details for the dropdown (name, etc.)
      // Note: The current getSchemes returns IDs only. 
      // Ideally we should fetch full details or map IDs to names if we have them.
      // For now, let's assume we need to fetch scheme details separately or update getSchemes.
      // Let's use what we have:
      // We'll fetch all schemes to map names (inefficient but works for now)
      // OR better: Update getSchemes to return objects. 
      // For this step, I'll assume getSchemes returns objects or I'll fetch all schemes.
      // Let's fetch all schemes to map.
      const allSchemesRes = await import('../services/api').then(m => m.schemesAPI.getAll());
      const assignedIds = response.data;
      const assignedSchemes = allSchemesRes.data.filter(s => assignedIds.includes(s.Scheme_ID));
      setSchemes(assignedSchemes);
    } catch (error) {
      console.error("Error fetching customer schemes:", error);
      message.error("Failed to load customer schemes.");
    }
  };

  // Handle scheme selection
  const handleSchemeSelect = async (schemeId) => {
    setSelectedScheme(schemeId);
    fetchDues(selectedCustomer, schemeId);
  };

  const fetchDues = async (customerId, schemeId) => {
    setLoading(true);
    try {
      const response = await paymentsAPI.getDues(customerId, schemeId);
      setDues(response.data);
    } catch (error) {
      console.error("Error fetching dues:", error);
      message.error("Failed to load dues.");
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    setPaymentLoading(true);
    try {
      const payload = {
        Scheme_ID: selectedScheme,
        Customer_ID: selectedCustomer,
        Due_number: values.dueNumber,
        Transaction_ID: values.transactionId,
        Amount_Received: values.amount,
        Payment_Date: values.date.format('YYYY-MM-DD'),
      };

      await paymentsAPI.create(payload);
      message.success("Payment recorded successfully!");
      form.resetFields(['dueNumber', 'amount', 'transactionId', 'date']);
      fetchDues(selectedCustomer, selectedScheme); // Refresh dues
    } catch (error) {
      console.error("Payment error:", error);
      message.error("Failed to record payment.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const columns = [
    { title: 'Due #', dataIndex: 'Due_number', key: 'Due_number' },
    { 
      title: 'Due Date', 
      dataIndex: 'Due_date', 
      key: 'Due_date',
      render: (text) => text ? dayjs(text).format('DD-MM-YYYY') : 'N/A'
    },
    { 
      title: 'Due Amount', 
      dataIndex: 'Due_amount', 
      key: 'Due_amount',
      render: (val) => `₹${val}`
    },
    { 
      title: 'Received', 
      dataIndex: 'Recd_amount', 
      key: 'Recd_amount',
      render: (val) => <Text type={val >= 0 ? "success" : "warning"}>₹{val || 0}</Text>
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        const due = parseFloat(record.Due_amount || 0);
        const recd = parseFloat(record.Recd_amount || 0);
        return recd >= due ? <Tag color="green">Paid</Tag> : <Tag color="red">Pending</Tag>;
      }
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => {
        const due = parseFloat(record.Due_amount || 0);
        const recd = parseFloat(record.Recd_amount || 0);
        if (recd >= due) return null;
        
        return (
          <Button 
            type="link" 
            onClick={() => {
              form.setFieldsValue({
                dueNumber: record.Due_number,
                amount: due - recd,
                date: dayjs()
              });
            }}
          >
            Pay
          </Button>
        );
      }
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Payment Management</Title>
      
      <Row gutter={24}>
        <Col span={8}>
          <Card title="Select Customer & Scheme">
            <Form layout="vertical">
              <Form.Item label="Search Customer">
                <Select
                  showSearch
                  placeholder="Search by Customer ID, name or phone"
                  defaultActiveFirstOption={false}
                  showArrow={true}
                  filterOption={false}
                  onSearch={handleSearch}
                  onChange={handleCustomerSelect}
                  notFoundContent={null}
                  allowClear
                >
                  {customers.map(d => (
                    <Option key={d.Customer_ID} value={d.Customer_ID}>
                      [{d.Customer_ID}] {d.First_Name} {d.Last_Name} - {d.Phone_Number}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {selectedCustomer && (
                <Form.Item label="Select Scheme">
                  <Select 
                    placeholder="Select a scheme"
                    onChange={handleSchemeSelect}
                    value={selectedScheme}
                  >
                    {schemes.map(s => (
                      <Option key={s.Scheme_ID} value={s.Scheme_ID}>
                        {s.Name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
            </Form>
          </Card>

          {selectedScheme && (
            <Card title="Record Payment" style={{ marginTop: 16 }}>
              <Form form={form} layout="vertical" onFinish={onFinish}>
                <Form.Item 
                  name="dueNumber" 
                  label="Due Number" 
                  rules={[{ required: true }]}
                >
                  <Input readOnly />
                </Form.Item>

                <Form.Item 
                  name="amount" 
                  label="Amount Received" 
                  rules={[{ required: true }]}
                >
                  <Input type="number" prefix="₹" />
                </Form.Item>

                <Form.Item 
                  name="transactionId" 
                  label="Transaction ID" 
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Cash / UPI Ref / Cheque No" />
                </Form.Item>

                <Form.Item 
                  name="date" 
                  label="Payment Date" 
                  rules={[{ required: true }]}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>

                <Button type="primary" htmlType="submit" block loading={paymentLoading}>
                  Record Payment
                </Button>
              </Form>
            </Card>
          )}
        </Col>

        <Col span={16}>
          <Card title="Scheme Dues">
            <Table 
              columns={columns} 
              dataSource={dues} 
              rowKey="Due_number"
              loading={loading}
              pagination={false}
              scroll={{ y: 500 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Payments;
