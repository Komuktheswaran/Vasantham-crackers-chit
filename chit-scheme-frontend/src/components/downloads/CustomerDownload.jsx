import React, { useState, useEffect } from 'react';
import { Card, Select, Input, Button, Table, message, Space, Statistic } from 'antd';
import { DownloadOutlined, EyeOutlined, ClearOutlined } from '@ant-design/icons';
import { customersAPI, schemesAPI, statesAPI, districtsAPI, exportsAPI } from '../../services/api';


const { Option } = Select;

const CustomerDownload = () => {
  const [filters, setFilters] = useState({
    state: null,
    district: null,
    area: '',
    scheme_id: null
  });
  
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [allDistricts, setAllDistricts] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recordCount, setRecordCount] = useState(0);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    // Filter districts based on selected state
    if (filters.state && allDistricts.length > 0) {
      const state = states.find(s => s.State_Name === filters.state);
      if (state) {
        const filtered = allDistricts.filter(d => d.State_ID === state.State_ID);
        setDistricts(filtered);
      }
    } else {
      setDistricts(allDistricts);
    }
  }, [filters.state, states, allDistricts]);

  const fetchInitialData = async () => {
    try {
      const [statesRes, districtsRes, schemesRes] = await Promise.all([
        statesAPI.getAll(),
        districtsAPI.getAll(),
        schemesAPI.getAll()
      ]);
      setStates(statesRes.data);
      setAllDistricts(districtsRes.data);
      setDistricts(districtsRes.data);
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
    
    // Clear district if state changes
    if (field === 'state') {
      setFilters(prev => ({ ...prev, district: null }));
    }
  };

  const clearFilters = () => {
    setFilters({
      state: null,
      district: null,
      area: '',
      scheme_id: null
    });
    setPreviewData([]);
    setRecordCount(0);
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.state) params.state = filters.state;
      if (filters.district) params.district = filters.district;
      if (filters.area) params.area = filters.area;
      if (filters.scheme_id) params.scheme_id = filters.scheme_id;
      if (filters.customer_type) params.customer_type = filters.customer_type;
      if (filters.fund_number) params.fund_number = filters.fund_number;

      const response = await customersAPI.getAll({ ...params, limit: 10 });
      setPreviewData(response.data.customers || []);
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
      if (filters.state) params.state = filters.state;
      if (filters.district) params.district = filters.district;
      if (filters.area) params.area = filters.area;
      if (filters.scheme_id) params.scheme_id = filters.scheme_id;
      if (filters.customer_type) params.customer_type = filters.customer_type;
      if (filters.fund_number) params.fund_number = filters.fund_number;

      const response = await exportsAPI.exportCustomers(params);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `customers_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success('Customer data downloaded successfully');
    } catch (error) {
      message.error('Failed to download customer data');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Customer ID', dataIndex: 'Customer_ID', key: 'id' },
    { title: 'Name', key: 'name', render: (_, r) => `${r.First_Name} ${r.Last_Name}` },
    { title: 'Phone', dataIndex: 'Phone_Number', key: 'phone' },
    { title: 'Area', dataIndex: 'Area', key: 'area' },
  ];

  return (
    <div>
      <Card title="Filter Customers" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <Select
              allowClear
              placeholder="Select State"
              value={filters.state}
              onChange={(value) => handleFilterChange('state', value)}
              style={{ width: '100%' }}
            >
              {states.map(s => (
                <Option key={s.State_ID} value={s.State_Name}>{s.State_Name}</Option>
              ))}
            </Select>

            <Select
              allowClear
              placeholder="Select District"
              value={filters.district}
              onChange={(value) => handleFilterChange('district', value)}
              style={{ width: '100%' }}
              disabled={!filters.state}
            >
              {districts.map(d => (
                <Option key={d.District_ID} value={d.District_Name}>{d.District_Name}</Option>
              ))}
            </Select>

            <Input
              placeholder="Search by Area"
              value={filters.area}
              onChange={(e) => handleFilterChange('area', e.target.value)}
              style={{ width: '100%' }}
            />

            <Select
              allowClear
              placeholder="Filter by Scheme"
              value={filters.scheme_id}
              onChange={(value) => handleFilterChange('scheme_id', value)}
              style={{ width: '100%' }}
            >
              {schemes.map(s => (
                <Option key={s.Scheme_ID} value={s.Scheme_ID}>{s.Name}</Option>
              ))}
            </Select>

             <Select
                placeholder="Filter by Type"
                allowClear
                style={{ width: '100%' }}
                value={filters.customer_type}
                onChange={(value) => handleFilterChange('customer_type', value)}
              >
                 <Option value="New">New</Option>
                 <Option value="Regular Customer">Regular</Option>
                 <Option value="Wholesale">Wholesale</Option>
                 <Option value="Giftbox">Giftbox</Option>
                 <Option value="Fund Scheme">Fund Scheme</Option>
              </Select>

             <Input
              placeholder="Search by Fund Number"
              value={filters.fund_number}
              onChange={(e) => handleFilterChange('fund_number', e.target.value)}
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
            suffix="customers"
            style={{ marginBottom: 16 }}
          />
          <Table
            dataSource={previewData}
            columns={columns}
            rowKey="Customer_ID"
            pagination={false}
            size="small"
            scroll={{ x: true }}
          />
          <p style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
            Showing first 10 records. Download will include all {recordCount} matching records.
          </p>
        </Card>
      )}
    </div>
  );
};

export default CustomerDownload;
