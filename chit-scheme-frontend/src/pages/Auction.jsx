import React, { useState } from 'react';
import { Card, Input, Button, Descriptions, Typography, message, Modal, Row, Col, Statistic, Alert, Tag } from 'antd';
import { SearchOutlined, DollarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { customersAPI, paymentsAPI } from '../services/api';
import './css/Auction.css';

const { Title, Text } = Typography;

const Auction = () => {
    const [fundNumber, setFundNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [customerData, setCustomerData] = useState(null);
    const [duesData, setDuesData] = useState([]);
    const [payLoading, setPayLoading] = useState(false);

    const handleSearch = async () => {
        if (!fundNumber) {
            message.warning('Please enter a Fund Number');
            return;
        }

        setLoading(true);
        setCustomerData(null);
        setDuesData([]);

        try {
            // 1. Get Customer & Scheme Basic Info
            const custRes = await customersAPI.getByFundNumber(fundNumber);
            setCustomerData(custRes.data);

            // 2. Get Dues Info (to calculate pending amount)
            const duesRes = await paymentsAPI.getDues(fundNumber);
            setDuesData(duesRes.data);

        } catch (error) {
            console.error(error);
            message.error(error.response?.data?.error || 'Fund Number not found');
        } finally {
            setLoading(false);
        }
    };

    const calculatePendingAmount = () => {
        if (!duesData.length) return 0;
        return duesData.reduce((acc, due) => {
            const pending = due.Due_amount - (due.Recd_amount || 0);
            return acc + (pending > 0 ? pending : 0);
        }, 0);
    };

    const handlePayAll = () => {
        const pendingAmount = calculatePendingAmount();
        if (pendingAmount <= 0) {
            message.info('No pending dues to pay.');
            return;
        }

        Modal.confirm({
            title: 'Confirm Bulk Payment',
            content: (
                <div>
                    <p>Are you sure you want to pay off all remaining dues?</p>
                    <p><strong>Total Amount: ₹{pendingAmount}</strong></p>
                    <p>This will mark all pending dues as PAID.</p>
                </div>
            ),
            okText: 'Pay All & Close',
            okType: 'primary',
            onOk: async () => {
                setPayLoading(true);
                try {
                    const response = await paymentsAPI.payAll({ fundNumber });
                    
                    Modal.success({
                        title: 'Payment Successful',
                        content: (
                            <div>
                                <p>{response.data.message}</p>
                                <p>Transaction ID: <Text copyable>{response.data.transactionId}</Text></p>
                            </div>
                        ),
                    });

                    // Refresh data
                    handleSearch();

                } catch (error) {
                    console.error(error);
                    message.error('Payment failed: ' + (error.response?.data?.error || error.message));
                } finally {
                    setPayLoading(false);
                }
            }
        });
    };

    const pendingTotal = calculatePendingAmount();

    return (
        <div className="page-container">
            <div className="page-header-row">
                <h2 className="page-title">Auction & Bulk Payment</h2>
            </div>

            <div className="search-section">
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Enter Fund Number to begin</Text>
                <Input.Search 
                    placeholder="e.g. 2024_12_1234"
                    enterButton={<Button type="primary" icon={<SearchOutlined />}>Search</Button>}
                    size="large"
                    value={fundNumber}
                    onChange={(e) => setFundNumber(e.target.value)}
                    onSearch={handleSearch}
                    loading={loading}
                    className="full-width"
                />
            </div>

            {customerData && (
                <Card className="details-section" title="Customer & Scheme Details">
                    <Row gutter={[24, 24]}>
                        <Col xs={24} md={12}>
                            <Descriptions column={1} bordered size="small">
                                <Descriptions.Item label="Customer Name"><b>{customerData.Name}</b></Descriptions.Item>
                                <Descriptions.Item label="Customer ID">{customerData.Customer_ID}</Descriptions.Item>
                                <Descriptions.Item label="Phone Number">{customerData.Phone_Number}</Descriptions.Item>
                            </Descriptions>
                        </Col>
                        <Col xs={24} md={12}>
                             <Descriptions column={1} bordered size="small">
                                <Descriptions.Item label="Scheme Name">{customerData.Scheme_Name}</Descriptions.Item>
                                <Descriptions.Item label="Scheme ID">{customerData.Scheme_ID}</Descriptions.Item>
                                <Descriptions.Item label="Fund Number"><Tag color="blue">{customerData.Fund_Number}</Tag></Descriptions.Item>
                            </Descriptions>
                        </Col>
                    </Row>

                    <div className="action-footer">
                        {pendingTotal > 0 ? (
                            <Row align="middle" justify="end" gutter={16}>
                                <Col>
                                    <Statistic 
                                        title="Total Pending Dues" 
                                        value={pendingTotal} 
                                        prefix="₹" 
                                        valueStyle={{ color: '#cf1322' }} 
                                    />
                                </Col>
                                <Col>
                                    <Button 
                                        type="primary" 
                                        danger 
                                        size="large" 
                                        icon={<DollarOutlined />}
                                        loading={payLoading}
                                        onClick={handlePayAll}
                                        style={{ minWidth: 200 }}
                                    >
                                        Pay All Remaining
                                    </Button>
                                </Col>
                            </Row>
                        ) : (
                            <Alert 
                                message="All dues are paid for this customer." 
                                type="success" 
                                showIcon 
                                icon={<CheckCircleOutlined />}
                            />
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default Auction;
