import React, { useState, useEffect } from 'react';
import { Card, Select, DatePicker, Input, Button, message, Space, Statistic, Table } from 'antd';
import { DownloadOutlined, EyeOutlined, ClearOutlined } from '@ant-design/icons';
import { customersAPI, schemesAPI, exportsAPI, paymentsAPI } from '../../services/api';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

const PaymentDownload = () => {
  const [filters, setFilters] = useState({
    date_from: null,
    date_to: null,
    customer_id: null,
    scheme_id: null,
    transaction_id: ''
  });
  
  const [customers, setCustomers] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [recordCount, setRecordCount] = useState(0);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [customersRes, schemesRes] = await Promise.all([
        customersAPI.getAll({}),
        schemesAPI.getAll()
      ]);
      setCustomers(customersRes.data.customers || []);
      setSchemes(schemesRes.data);
    } catch (error) {
      message.error('Failed to load filter options');
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateRangeChange = (dates) => {
    if (dates && dates.length === 2) {
      setFilters(prev => ({
        ...prev,
        date_from: dates[0].format('YYYY-MM-DD'),
        date_to: dates[1].format('YYYY-MM-DD')
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        date_from: null,
        date_to: null
      }));
    }
  };

  const clearFilters = () => {
    setFilters({
      date_from: null,
      date_to: null,
      customer_id: null,
      scheme_id: null,
      transaction_id: ''
    });
    setPreviewData([]);
    setRecordCount(0);
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const params = { limit: 10 };
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.customer_id) params.customer_id = filters.customer_id;
      if (filters.scheme_id) params.scheme_id = filters.scheme_id;
      if (filters.transaction_id) params.transaction_id = filters.transaction_id;

      const response = await paymentsAPI.getAll(params);
      setPreviewData(response.data.payments || []);
      setRecordCount(response.data.pagination?.totalRecords || 0);
    } catch (error) {
      message.error('Failed to preview data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.customer_id) params.customer_id = filters.customer_id;
      if (filters.scheme_id) params.scheme_id = filters.scheme_id;
      if (filters.transaction_id) params.transaction_id = filters.transaction_id;

      const response = await exportsAPI.exportPayments(params);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payments_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success('Payment data downloaded successfully');
    } catch (error) {
      message.error('Failed to download payment data');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Payment ID', dataIndex: 'Pay_ID', key: 'id' },
    { title: 'Customer', dataIndex: 'Customer_Name', key: 'customer' },
    { title: 'Scheme', dataIndex: 'Scheme_Name', key: 'scheme' },
    { title: 'Amount', dataIndex: 'Amount_Received', key: 'amount', render: (val) => `₹${val}` },
    { title: 'Date', dataIndex: 'Amount_Received_date', key: 'date', render: (val) => dayjs(val).format('DD-MM-YYYY') },
    { title: 'Transaction ID', dataIndex: 'Transaction_ID', key: 'transaction_id' },
  ];

  return (
    <div>
      <Card title="Filter Payments" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={handleDateRangeChange}
              placeholder={['Start Date', 'End Date']}
              value={filters.date_from && filters.date_to ? [dayjs(filters.date_from), dayjs(filters.date_to)] : null}
            />

            <Select
              allowClear
              showSearch
              placeholder="Select Customer"
              value={filters.customer_id}
              onChange={(value) => handleFilterChange('customer_id', value)}
              style={{ width: '100%' }}
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {customers.map(c => (
                <Option key={c.Customer_ID} value={c.Customer_ID}>
                  {c.First_Name} {c.Last_Name} ({c.Customer_ID})
                </Option>
              ))}
            </Select>

            <Select
              allowClear
              placeholder="Select Scheme"
              value={filters.scheme_id}
              onChange={(value) => handleFilterChange('scheme_id', value)}
              style={{ width: '100%' }}
            >
              {schemes.map(s => (
                <Option key={s.Scheme_ID} value={s.Scheme_ID}>{s.Name}</Option>
              ))}
            </Select>

            <Input
              placeholder="Search by Transaction ID"
              value={filters.transaction_id}
              onChange={(e) => handleFilterChange('transaction_id', e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button icon={<EyeOutlined />} onClick={handlePreview} loading={loading}>
              Preview
            </Button>
            <Button icon={<ClearOutlined />} onClick={clearFilters}>
              Clear Filters
            </Button>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              onClick={handleDownload} 
              loading={loading}
            >
              Download CSV
            </Button>
          </div>
        </Space>
      </Card>

      {(previewData.length > 0 || recordCount > 0) && (
        <Card title="Preview" style={{ marginBottom: 16 }}>
          <Statistic 
            title="Total Records" 
            value={recordCount} 
            suffix="payments"
            style={{ marginBottom: 16 }}
          />
          <Table
            dataSource={previewData}
            columns={columns}
            rowKey="Pay_ID"
            pagination={false}
            size="small"
          />
          <p style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
            Showing first 10 records. Download will include all {recordCount} matching records.
          </p>
        </Card>
      )}

      <Card>
        <p style={{ color: '#666' }}>
          <strong>Note:</strong> The download will include all payment records matching your filter criteria.
          {filters.date_from && filters.date_to && (
            <> Date range: {filters.date_from} to {filters.date_to}.</>
          )}
          {!filters.date_from && !filters.date_to && (
            <> No date filter applied - all payment records will be included.</>
          )}
        </p>
      </Card>
    </div>
  );
};

export default PaymentDownload;
