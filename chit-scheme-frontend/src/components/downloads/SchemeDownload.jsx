import React, { useState } from 'react';
import { Card, Button, message, Space, Radio, Table, Statistic } from 'antd';
import { DownloadOutlined, ClearOutlined, EyeOutlined } from '@ant-design/icons';
import { exportsAPI, schemesAPI } from '../../services/api';

const SchemeDownload = () => {
  const [filters, setFilters] = useState({
    active_only: 'all'
  });
  
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [recordCount, setRecordCount] = useState(0);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      active_only: 'all'
    });
    setPreviewData([]);
    setRecordCount(0);
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.active_only === 'active') params.active_only = 'true';
      if (filters.active_only === 'inactive') params.active_only = 'false';

      const response = await schemesAPI.getAll(params);
      const schemes = response.data?.schemes || response.data || response || [];
      
      // Apply active filter on frontend if needed
      let filteredSchemes = schemes;
      if (filters.active_only === 'active') {
        filteredSchemes = schemes.filter(s => s.member_count > 0);
      } else if (filters.active_only === 'inactive') {
        filteredSchemes = schemes.filter(s => s.member_count === 0);
      }

      setPreviewData(filteredSchemes.slice(0, 10));
      setRecordCount(filteredSchemes.length);
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
      if (filters.active_only === 'active') params.active_only = 'true';
      if (filters.active_only === 'inactive') params.active_only = 'false';

      const response = await exportsAPI.exportSchemes (params);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `schemes_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success('Scheme data downloaded successfully');
    } catch (error) {
      message.error('Failed to download scheme data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Card title="Filter Schemes" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Scheme Status:
            </label>
            <Radio.Group 
              value={filters.active_only} 
              onChange={(e) => handleFilterChange('active_only', e.target.value)}
            >
              <Radio.Button value="all">All Schemes</Radio.Button>
              <Radio.Button value="active">Active Only</Radio.Button>
              <Radio.Button value="inactive">Inactive Only</Radio.Button>
            </Radio.Group>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
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
            suffix="schemes"
            style={{ marginBottom: 16 }}
          />
          <Table
            dataSource={previewData}
            columns={[
              { title: 'Scheme ID', dataIndex: 'Scheme_ID', key: 'id' },
              { title: 'Name', dataIndex: 'Name', key: 'name' },
              { title: 'Total Amount', dataIndex: 'Total_Amount', key: 'total', render: (val) => `₹${val?.toLocaleString()}` },
              { title: 'Members', dataIndex: 'member_count', key: 'members' },
              { 
                title: 'Status', 
                key: 'status', 
                render: (_, record) => record.member_count > 0 ? 'Active' : 'Inactive' 
              },
            ]}
            rowKey="Scheme_ID"
            pagination={false}
            size="small"
          />
          <p style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
            Showing first 10 records. Download will include all {recordCount} matching records.
          </p>
        </Card>
      )}

      <Card>
        <div>
          <h4>Export Details:</h4>
          <ul style={{ color: '#666', lineHeight: '1.8' }}>
            <li>
              <strong>Status Filter:</strong>{' '}
              {filters.active_only === 'all' && 'All schemes (active and inactive)'}
              {filters.active_only === 'active' && 'Active schemes only (schemes with members)'}
              {filters.active_only === 'inactive' && 'Inactive schemes only (schemes without members)'}
            </li>
            <li>
              <strong>Export Fields:</strong> Scheme ID, Name, Total Amount, Amount Per Month, Number of Dues, 
              Period, Total Members, Status, Start Month, End Month
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default SchemeDownload;
