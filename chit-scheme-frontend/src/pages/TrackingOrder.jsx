import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, DatePicker,
  InputNumber, message, Space, Row, Col, Tag
} from 'antd';
import {
  EditOutlined, DeleteOutlined, SearchOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { orderTrackingAPI, customersAPI } from '../services/api';
import dayjs from 'dayjs';

const { Option } = Select;

const TrackingOrder = () => {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [form] = Form.useForm();
  
  // Search state
  const [searchText, setSearchText] = useState('');
  
  // Options
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
  }, []);

  const fetchCustomers = async (search = '') => {
    try {
      const res = await customersAPI.getAll({ search, limit: 50 });
      setCustomers(res.data.customers || []);
    } catch (error) {
      console.error('Fetch customers error:', error);
    }
  };

  const fetchOrders = async (params = {}) => {
    setLoading(true);
    try {
      const queryParams = {
        page: params.page || pagination.current,
        limit: params.limit || pagination.pageSize,
        search: searchText,
        ...params
      };

      const response = await orderTrackingAPI.getAll(queryParams);
      setOrders(response.data.orders || []);
      setPagination({
        ...pagination,
        current: response.data.pagination.currentPage,
        total: response.data.pagination.totalRecords
      });
    } catch (error) {
      console.error('Fetch orders error:', error);
      message.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (newPagination) => {
    fetchOrders({ page: newPagination.current, limit: newPagination.pageSize });
  };

  const handleOk = async (values) => {
    try {
      if (editingOrder) {
        await orderTrackingAPI.update(editingOrder.Tracking_ID, values);
        message.success('Order updated successfully');
      } else {
        await orderTrackingAPI.create(values);
        message.success('Order created successfully');
      }
      setModalVisible(false);
      fetchOrders();
      form.resetFields();
    } catch (error) {
      console.error('Save order error:', error);
      message.error('Failed to save order');
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete Order',
      content: 'Are you sure you want to delete this order tracking record?',
      okText: 'Yes',
      okType: 'danger',
      onOk: async () => {
        try {
          await orderTrackingAPI.delete(id);
          message.success('Order deleted successfully');
          fetchOrders();
        } catch (error) {
          message.error('Failed to delete order');
        }
      }
    });
  };

  const openModal = (order = null) => {
    setEditingOrder(order);
    if (order) {
      form.setFieldsValue({
        ...order,
        Order_Received_Date: order.Order_Received_Date ? dayjs(order.Order_Received_Date) : null,
        Payment_Received_Date: order.Payment_Received_Date ? dayjs(order.Payment_Received_Date) : null,
      });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  // Debounced customer search
  let timeout;
  const handleCustomerSearch = (val) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      fetchCustomers(val);
    }, 300);
  };

  const columns = [
    {
      title: 'Tracking No',
      dataIndex: 'Tracking_Number',
      key: 'Tracking_Number',
      render: (text) => <b>{text || '-'}</b>
    },
    {
      title: 'Order No',
      dataIndex: 'Order_Number',
      key: 'Order_Number',
    },
    {
      title: 'Customer',
      dataIndex: 'Customer_Name',
      key: 'Customer_Name',
      render: (text, record) => text ? `${text} (${record.Phone_Number})` : '-'
    },
    {
      title: 'Fund No',
      dataIndex: 'Fund_Number',
      key: 'Fund_Number',
    },
    {
      title: 'Order Date',
      dataIndex: 'Order_Received_Date',
      key: 'Order_Received_Date',
      render: (date) => date ? new Date(date).toLocaleDateString() : '-'
    },
    {
      title: 'Amount',
      dataIndex: 'Payment_Amount',
      key: 'Payment_Amount',
      render: (amt) => amt ? `₹${parseFloat(amt).toLocaleString()}` : '-'
    },
    {
      title: 'Source',
      dataIndex: 'Source',
      key: 'Source',
      render: (text) => text ? <Tag color="blue">{text}</Tag> : '-'
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openModal(record)} />
          <Button icon={<DeleteOutlined />} size="small" danger onClick={() => handleDelete(record.Tracking_ID)} />
        </Space>
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header-row">
        <h2 className="page-title">Order Tracking ({pagination.total})</h2>
        <div className="page-action-bar">
          <Space>
            <Input 
              placeholder="Search..." 
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={() => fetchOrders({ page: 1 })}
              style={{ width: 200 }}
              suffix={<SearchOutlined onClick={() => fetchOrders({ page: 1 })} />}
            />
            <Button icon={<ReloadOutlined />} onClick={() => { setSearchText(''); fetchOrders({ page: 1, search: '' }); }}>
                Reset
            </Button>
            <Button type="primary" onClick={() => openModal()}>
              + New Order
            </Button>
          </Space>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={orders}
        rowKey="Tracking_ID"
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={editingOrder ? 'Edit Order' : 'New Order'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleOk}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="Tracking_Number" label="Tracking / LLM Number">
                <Input placeholder="Enter Tracking / LLM No" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="Order_Number" label="Order Number">
                <Input placeholder="Enter Order No" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="Customer_ID" label="Customer">
                <Select
                  showSearch
                  placeholder="Select Customer"
                  filterOption={false}
                  onSearch={handleCustomerSearch}
                  allowClear
                >
                  {customers.map(c => (
                    <Option key={c.Customer_ID} value={c.Customer_ID}>
                      {c.Name} ({c.Phone_Number})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="Fund_Number" label="Fund Number">
                <Input placeholder="Enter Fund No (Optional)" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="Order_Received_Date" label="Order Received Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="Payment_Received_Date" label="Payment Received Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="Payment_Amount" label="Payment Amount">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="Transporter_Name" label="Transporter Name">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="Transporter_Contact" label="Transporter Contact">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="Source" label="Source">
                 <Select placeholder="Select Source">
                    <Option value="Website">Website</Option>
                    <Option value="Whatsapp">Whatsapp</Option>
                    <Option value="In Store">In Store</Option>
                 </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default TrackingOrder;
