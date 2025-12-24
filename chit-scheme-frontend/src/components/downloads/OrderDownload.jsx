import React, { useState, useEffect } from 'react';
import { Card, Select, Input, Button, Table, message, Space, DatePicker, Statistic } from 'antd';
import { DownloadOutlined, EyeOutlined, ClearOutlined } from '@ant-design/icons';
import { orderTrackingAPI, exportsAPI } from '../../services/api';

const { Option } = Select;
const { RangePicker } = DatePicker;

const OrderDownload = () => {
    const [filters, setFilters] = useState({
        dateRange: null,
        source: null,
        search: ''
    });

    const [previewData, setPreviewData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [recordCount, setRecordCount] = useState(0);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const clearFilters = () => {
        setFilters({
            dateRange: null,
            source: null,
            search: ''
        });
        setPreviewData([]);
        setRecordCount(0);
    };

    const getParams = () => {
        const params = {};
        if (filters.dateRange) {
            params.date_from = filters.dateRange[0].format('YYYY-MM-DD');
            params.date_to = filters.dateRange[1].format('YYYY-MM-DD');
        }
        if (filters.source) params.source = filters.source;
        if (filters.search) params.search = filters.search;
        return params;
    };

    const handlePreview = async () => {
        setLoading(true);
        try {
            const params = getParams();
            const response = await orderTrackingAPI.getAll({ ...params, limit: 10 });
            setPreviewData(response.data.orders || []);
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
            const params = getParams();
            const response = await exportsAPI.exportOrders(params);

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            message.success('Order data downloaded successfully');
        } catch (error) {
            message.error('Failed to download order data');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { title: 'Tracking No', dataIndex: 'Tracking_Number', key: 'Tracking_Number' },
        { title: 'Order No', dataIndex: 'Order_Number', key: 'Order_Number' },
        { title: 'Customer', dataIndex: 'Customer_Name', key: 'Customer_Name' },
        { title: 'Received Date', dataIndex: 'Order_Received_Date', key: 'Order_Received_Date', render: (date) => date ? new Date(date).toLocaleDateString() : '-' },
        { title: 'Amount', dataIndex: 'Payment_Amount', key: 'Payment_Amount' },
    ];

    return (
        <div>
            <Card title="Filter Orders" style={{ marginBottom: 16 }}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <RangePicker 
                            style={{ width: '100%' }}
                            value={filters.dateRange}
                            onChange={(dates) => handleFilterChange('dateRange', dates)}
                            placeholder={['Start Date', 'End Date']}
                        />

                        <Select
                            placeholder="Select Source"
                            allowClear
                            style={{ width: '100%' }}
                            value={filters.source}
                            onChange={(value) => handleFilterChange('source', value)}
                        >
                            <Option value="Website">Website</Option>
                            <Option value="Whatsapp">Whatsapp</Option>
                            <Option value="In Store">In Store</Option>
                        </Select>

                        <Input
                            placeholder="Search Tracking / Order Number / Customer"
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
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
                        suffix="orders"
                        style={{ marginBottom: 16 }}
                    />
                    <Table
                        dataSource={previewData}
                        columns={columns}
                        rowKey="Tracking_ID"
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

export default OrderDownload;
