import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Card, Space, message, Row, Col, List, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { transportersAPI } from '../services/api';
import './css/TransportMaster.css';

const { Title, Text } = Typography;

const TransportMaster = () => {
    const [transporters, setTransporters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [dpModalVisible, setDpModalVisible] = useState(false);
    const [editingTransporter, setEditingTransporter] = useState(null);
    const [selectedTransporter, setSelectedTransporter] = useState(null);
    const [form] = Form.useForm();
    const [dpForm] = Form.useForm();

    useEffect(() => {
        fetchTransporters();
    }, []);

    const fetchTransporters = async () => {
        setLoading(true);
        try {
            const response = await transportersAPI.getAll();
            setTransporters(response.data || []);
        } catch (error) {
            console.error("Error fetching transporters:", error);
            message.error("Failed to fetch transporters");
        } finally {
            setLoading(false);
        }
    };

    // --- Transporter Methods ---

    const handleAddTransporter = () => {
        setEditingTransporter(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEditTransporter = (record) => {
        setEditingTransporter(record);
        form.setFieldsValue(record);
        setModalVisible(true);
    };

    const handleDeleteTransporter = (id) => {
        Modal.confirm({
            title: 'Delete Transporter',
            content: 'Are you sure you want to delete this transporter? This may affect associated delivery points.',
            onOk: async () => {
                try {
                    await transportersAPI.delete(id);
                    message.success('Transporter deleted successfully');
                    fetchTransporters();
                } catch (error) {
                    message.error('Failed to delete transporter');
                }
            }
        });
    };

    const onFinishTransporter = async (values) => {
        try {
            if (editingTransporter) {
                await transportersAPI.update(editingTransporter.Transporter_ID, values);
                message.success('Transporter updated successfully');
            } else {
                await transportersAPI.create(values);
                message.success('Transporter created successfully');
            }
            setModalVisible(false);
            fetchTransporters();
        } catch (error) {
            message.error('Operation failed: ' + (error.response?.data?.error || error.message));
        }
    };

    // --- Delivery Point Methods ---

    const handleManageDP = async (record) => {
        setSelectedTransporter(record);
        // Assuming the record already has delivery_points populated, 
        // OR we need to fetch them. Let's assume fetch for freshness.
        try {
            const response = await transportersAPI.getDeliveryPoints(record.Transporter_ID);
            // We'll store this locally or just update the main list if structure allows.
            // For now, let's just re-fetch main list which hopefully includes them nested,
            // OR use a separate state for the modal list.
            // Let's use a separate state variable for the points in the modal is cleaner.
            // Actually, `getDeliveryPoints` might return just the array.
             setSelectedTransporter({ ...record, delivery_points: response.data || [] });
             setDpModalVisible(true);
        } catch (error) {
             // Fallback if endpoint fails or not ready, use what we have
             setSelectedTransporter({ ...record, delivery_points: record.delivery_points || [] });
             setDpModalVisible(true);
        }
    };

    const handleAddDP = async (values) => {
        try {
            await transportersAPI.addDeliveryPoint(selectedTransporter.Transporter_ID, values);
            message.success('Delivery Point added');
            dpForm.resetFields();
            // Refresh list
            handleManageDP(selectedTransporter);
            fetchTransporters(); // Refresh main background list too
        } catch (error) {
            message.error('Failed to add delivery point');
        }
    };

    const handleDeleteDP = async (pointId) => {
        try {
            await transportersAPI.deleteDeliveryPoint(pointId);
            message.success('Delivery Point removed');
            handleManageDP(selectedTransporter); // Refresh local list
             fetchTransporters();
        } catch (error) {
            message.error('Failed to remove delivery point');
        }
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'Transporter_Name',
            key: 'Transporter_Name',
        },
        {
            title: 'Contact Person',
            dataIndex: 'Contact_Person',
            key: 'Contact_Person',
        },
        {
            title: 'Phone',
            dataIndex: 'Phone_Number',
            key: 'Phone_Number',
        },
        {
            title: 'Delivery Points',
            key: 'delivery_points',
            render: (_, record) => (
                <Space size="small" wrap>
                    {record.delivery_points && record.delivery_points.map(dp => (
                        <span key={dp.Delivery_Point_ID} className="dp-tag">
                            {dp.Place_Name}
                        </span>
                    ))}
                    <Button 
                        type="dashed" 
                        size="small" 
                        icon={<PlusOutlined />} 
                        onClick={() => handleManageDP(record)}
                    >
                        Manage
                    </Button>
                </Space>
            )
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleEditTransporter(record)} />
                    <Button danger icon={<DeleteOutlined />} onClick={() => handleDeleteTransporter(record.Transporter_ID)} />
                </Space>
            )
        }
    ];

    return (
        <div className="transport-master-container">
             <div className="page-header-container">
                 <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                     <Col>
                         <h2 className="page-title">Transport Master</h2>
                     </Col>
                     <Col>
                         <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTransporter}>
                             Add Transporter
                         </Button>
                     </Col>
                 </Row>
             </div>

             <div className="table-container">
                <Table 
                    columns={columns} 
                    dataSource={transporters} 
                    rowKey="Transporter_ID" 
                    loading={loading} 
                />
             </div>

             {/* Transporter Modal */}
             <Modal
                title={editingTransporter ? "Edit Transporter" : "Add Transporter"}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
             >
                 <Form form={form} layout="vertical" onFinish={onFinishTransporter}>
                     <Form.Item name="Transporter_Name" label="Transporter Name" rules={[{ required: true }]}>
                         <Input placeholder="Enter name" />
                     </Form.Item>
                     <Form.Item name="Contact_Person" label="Contact Person">
                         <Input placeholder="Enter contact person name" />
                     </Form.Item>
                     <Form.Item name="Phone_Number" label="Phone Number" rules={[{ required: true }]}>
                         <Input placeholder="Enter phone" />
                     </Form.Item>
                 </Form>
             </Modal>

             {/* Delivery Points Modal */}
             <Modal
                title={`Manage Delivery Points - ${selectedTransporter?.Transporter_Name}`}
                open={dpModalVisible}
                onCancel={() => setDpModalVisible(false)}
                footer={null}
                width={600}
             >
                 <Form form={dpForm} layout="inline" onFinish={handleAddDP} style={{ marginBottom: 16 }}>
                     <Form.Item name="Place_Name" rules={[{ required: true, message: 'Required' }]}>
                         <Input placeholder="New Delivery Point Name" />
                     </Form.Item>
                     <Form.Item>
                         <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>Add</Button>
                     </Form.Item>
                 </Form>

                 <List
                    bordered
                    dataSource={selectedTransporter?.delivery_points || []}
                    renderItem={item => (
                        <List.Item
                            actions={[<Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteDP(item.Delivery_Point_ID)} />]}
                        >
                            <Space>
                                <EnvironmentOutlined />
                                {item.Place_Name}
                            </Space>
                        </List.Item>
                    )}
                 />
             </Modal>
        </div>
    );
};

export default TransportMaster;
