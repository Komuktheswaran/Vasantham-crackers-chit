import React, { useState, useEffect } from 'react';
import { 
  Card, Typography, Select, Table, Button, Form, Input, 
  DatePicker, message, Row, Col, Tag 
} from 'antd';
import { customersAPI, paymentsAPI, schemesAPI } from '../services/api';
import dayjs from 'dayjs';
import './css/Payments.css';

const { Title, Text } = Typography;
const { Option } = Select;

const Payments = () => {
  const [form] = Form.useForm();
  const [customers, setCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [schemes, setSchemes] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [selectedFundNumber, setSelectedFundNumber] = useState(null);
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState('Cash');

  // Load all customers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await customersAPI.getAll({ has_scheme: 'true', limit: 1000 });
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
      c.Name?.toLowerCase().includes(value.toLowerCase()) ||
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
      // Response now contains detailed scheme objects with Fund Number
      setSchemes(response.data);
    } catch (error) {
      console.error("Error fetching customer schemes:", error);
      message.error("Failed to load customer schemes.");
    }
  };

  // Handle scheme selection
  const handleSchemeSelect = async (schemeId, option) => {
    setSelectedScheme(schemeId);
    // Option value is Scheme_ID, but we can access the full object from state or option if stored
    // Better way: Find scheme in schemes array
    const scheme = schemes.find(s => s.Scheme_ID === schemeId);
    if(scheme){
        setSelectedFundNumber(scheme.Fund_Number);
        fetchDues(scheme.Fund_Number);
    }
  };

  const fetchDues = async (fundNumber) => {
    setLoading(true);
    try {
      const response = await paymentsAPI.getDues(fundNumber);
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
        Fund_Number: selectedFundNumber,
        Due_number: values.dueNumber,
        Transaction_ID: values.transactionId,
        Amount_Received: values.amount,
        Payment_Date: values.date.format('YYYY-MM-DD'),
        Payment_Mode: values.paymentMode,
        UPI_Phone_Number: values.upiPhone
      };

      await paymentsAPI.create(payload);
      message.success("Payment recorded successfully!");
      form.resetFields(['dueNumber', 'amount', 'transactionId', 'date', 'paymentMode']);
      setPaymentMode('Cash');
      fetchDues(selectedFundNumber); // Refresh dues
    } catch (error) {
      console.error("Payment error:", error);
      message.error("Failed to record payment.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const columns = [
    { title: 'Due #', dataIndex: 'Due_number', key: 'Due_number', width: 80 },
    { 
      title: 'Due Date', 
      dataIndex: 'Due_date', 
      key: 'Due_date',
      width: 120,
      render: (text) => text ? dayjs(text).format('DD-MM-YYYY') : 'N/A'
    },
    { 
      title: 'Due Amount', 
      dataIndex: 'Due_amount', 
      key: 'Due_amount',
      width: 100,
      render: (val) => `₹${val}`
    },
    { 
      title: 'Received', 
      dataIndex: 'Recd_amount', 
      key: 'Recd_amount',
      width: 100,
      render: (val) => <Text type={val >= 0 ? "success" : "warning"}>₹{val || 0}</Text>
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_, record) => {
        const due = parseFloat(record.Due_amount || 0);
        const recd = parseFloat(record.Recd_amount || 0);
        return recd >= due ? <Tag color="green">Paid</Tag> : <Tag color="red">Pending</Tag>;
      }
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
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
                date: dayjs(),
                paymentMode: 'Cash'
              });
              setPaymentMode('Cash');
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
        <Col xs={24} md={8}>
          <Card title="Select Customer & Scheme">
            <Form layout="vertical">
             {/* NEW: Search by Fund Number */}
              <Form.Item label="Search by Fund Number">
                <Input.Search
                  placeholder="Enter Fund Number (e.g. 2024_12_1234)"
                  enterButton="Search"
                  onSearch={async (value) => {
                    if (!value) return;
                    try {
                      const response = await customersAPI.getByFundNumber(value);
                      const { Customer_ID, Scheme_ID, Fund_Number } = response.data;
                      
                      // 1. Set Customer
                      await handleCustomerSelect(Customer_ID);
                      
                      // 2. Set Scheme & Dues
                      // Small timeout to allow state updates (or better, make handleCustomerSelect return promise)
                       setTimeout(() => {
                         setSelectedScheme(Scheme_ID);
                         setSelectedFundNumber(Fund_Number);
                         fetchDues(Fund_Number);
                         form.setFieldsValue({
                            schemeId: Scheme_ID // If this field exists in form
                         });
                         message.success("Fund Number Found!");
                       }, 500);
                      
                    } catch (error) {
                      console.error("Fund Search Error:", error);
                      message.error("Fund Number not found.");
                    }
                  }}
                />
              </Form.Item>

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
                      [{d.Customer_ID}] {d.Name} - {d.Phone_Number} 
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
                        {s.Scheme_Name} (Fund: {s.Fund_Number})
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
                  name="paymentMode"
                  label="Payment Mode"
                  rules={[{ required: true, message: 'Please select payment mode' }]}
                  initialValue="Cash"
                >
                  <Select onChange={setPaymentMode}>
                    <Option value="Cash">Cash</Option>
                    <Option value="UPI">UPI</Option>
                    <Option value="Bank Transfer">Bank Transfer</Option>
                    <Option value="Cheque">Cheque</Option>
                  </Select>
                </Form.Item>

                {paymentMode !== 'Cash' && (
                  <>
                    <Form.Item 
                      name="transactionId" 
                      label="Transaction / Reference No" 
                      rules={[{ required: true, message: 'Transaction ID is required for non-cash payments' }]}
                    >
                      <Input placeholder="Enter Ref No / Cheque No" />
                    </Form.Item>

                    {paymentMode === 'UPI' && (
                      <Form.Item
                        name="upiPhone"
                        label="Phone Number"
                        rules={[
                          { required: true, message: 'Phone Number is required for UPI' },
                          { pattern: /^[0-9]{10}$/, message: 'Please enter a valid 10-digit phone number' }
                        ]}
                      >
                       <Input placeholder="Enter UPI Phone Number" maxLength={10} />
                      </Form.Item>
                    )}
                  </>
                )}

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

        <Col xs={24} md={16}>
          <Card title="Scheme Dues">
            <Table 
              columns={columns} 
              dataSource={dues} 
              rowKey="Due_number"
              loading={loading}
              pagination={false}
              scroll={{ x: 600, y: 500 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Payments;
