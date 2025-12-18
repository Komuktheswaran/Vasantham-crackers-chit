import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Upload,
  message,
  Space,
  Dropdown,
  Menu,
  Row,
  Col,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { schemesAPI, exportsAPI } from "../services/api";
import dayjs from "dayjs";
import './css/Schemes.css';

const Schemes = () => {
  const [schemes, setSchemes] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [form] = Form.useForm();

  const uploadProps = {
    name: 'file',
    action: `${process.env.REACT_APP_API_URL || 'https://103.38.50.149:5006/api'}/schemes/upload`,
    accept: '.csv',
    onChange(info) {
      if (info.file.status === 'done') {
        message.success(`${info.file.name} file uploaded successfully`);
        setUploadModalVisible(false);
        fetchSchemes();
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} file upload failed.`);
      }
    },
  };

  const handleDownload = async (filtered = false) => {
    setLoading(true);
    try {
      const filters = {};
      if (filtered && searchText) {
        filters.search = searchText;
      }
      
      const response = await exportsAPI.exportSchemes(filters);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `schemes_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success('Schemes exported successfully');
    } catch (error) {
       console.error("Export error:", error);
       message.error("Failed to export schemes.");
    } finally {
       setLoading(false);
    }
  };

  const downloadMenu = (
    <Menu>
      <Menu.Item key="1" onClick={() => handleDownload(false)}>
        Download All
      </Menu.Item>
      <Menu.Item key="2" onClick={() => handleDownload(true)}>
        Download Filtered
      </Menu.Item>
    </Menu>
  );

  useEffect(() => {
    fetchSchemes();
  }, []);

  const fetchSchemes = async (params = {}) => {
    setLoading(true);
    try {
      const queryParams = {
        page: params.page || pagination.current,
        limit: params.limit || pagination.pageSize,
        search: searchText,
        ...params
      };
      
      const response = await schemesAPI.getAll(queryParams);
      // Handle both old array format (fallback) and new object format
      if (Array.isArray(response.data)) {
         setSchemes(response.data);
      } else {
         setSchemes(response.data.schemes || []);
         setPagination({
            current: response.data.page || 1,
            pageSize: response.data.limit || 15,
            total: response.data.total || 0,
         });
      }
    } catch (error) {
      console.error("Fetch schemes error:", error);
      message.error("Failed to fetch schemes.");
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (newPagination) => {
    fetchSchemes({
      page: newPagination.current,
      limit: newPagination.pageSize,
    });
  };

  const handleOk = async (values) => {
    try {
      if (editingScheme) {
        await schemesAPI.update(editingScheme.Scheme_ID, values);
        message.success("Scheme updated successfully!");
      } else {
        await schemesAPI.create(values);
        message.success("Scheme created successfully!");
      }
      setModalVisible(false);
      fetchSchemes();
      form.resetFields();
    } catch (error) {
      console.error("Save scheme error:", error);
      message.error("Failed to save scheme.");
    }
  };

  const handleDelete = (schemeId) => {
    Modal.confirm({
      title: "Are you sure you want to delete this scheme?",
      content: "This scheme may have members and payments associated with it. Deleting it will PERMANENTLY DELETE all associated Member and Payment records. This action cannot be undone.",
      okText: "Yes, Delete It",
      okType: "danger",
      onOk: async () => {
        try {
          await schemesAPI.delete(schemeId);
          message.success("Scheme deleted successfully!");
          fetchSchemes();
        } catch (error) {
          console.error("Delete scheme error:", error);
          message.error("Failed to delete scheme.");
        }
      },
    });
  };

  const openModal = (scheme = null) => {
    setEditingScheme(scheme);
    if (scheme) {
      form.setFieldsValue({
        ...scheme,
        Month_from: scheme.Month_from ? dayjs(scheme.Month_from) : null,
        Month_to: scheme.Month_to ? dayjs(scheme.Month_to) : null,
      });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const columns = [
    { title: "Scheme Name", dataIndex: "Name", key: "Name" },
    {
      title: "Total Amount",
      dataIndex: "Total_Amount",
      key: "Total_Amount",
      render: (text) => `₹${parseFloat(text).toLocaleString()}`,
    },
    {
      title: "Monthly Amount",
      dataIndex: "Amount_per_month",
      key: "Amount_per_month",
      render: (text) => `₹${parseFloat(text).toLocaleString()}`,
    },
    {
      title: "Members",
      dataIndex: "member_count",
      key: "member_count",
      render: (count) => (
        <span style={{ color: count > 0 ? "#52c41a" : "#f5222d" }}>
          {count || 0}
        </span>
      ),
    },
    {
      title: "Period",
      dataIndex: "Period",
      key: "Period",
      render: (period) => `${period} months`,
    },
    {
      title: "Start Date",
      dataIndex: "Month_from",
      key: "Month_from",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "End Date",
      dataIndex: "Month_to",
      key: "Month_to",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          <Button
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
            size="small"
          />
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.Scheme_ID)}
            size="small"
          />
        </Space>
      ),
    },
  ];

  return (
    <>
    <div className="page-container">
      <div className="page-header-row">
        <h2 className="page-title">Chit Schemes</h2>
        <div className="page-action-bar">
          <Input.Search
            placeholder="Search schemes"
            allowClear
            onSearch={(value) => {
              setSearchText(value);
              fetchSchemes({ search: value });
            }}
            className="search-input"
          />
          <Space wrap>
            <Button type="primary" onClick={() => openModal()}>
                + New Scheme
            </Button>
            <Button onClick={() => setUploadModalVisible(true)}>
                <UploadOutlined /> Upload
            </Button>
            <Dropdown overlay={downloadMenu}>
                <Button>
                <DownloadOutlined /> Download
                </Button>
            </Dropdown>
          </Space>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={schemes}
        rowKey="Scheme_ID"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
        }}
        onChange={handleTableChange}
        scroll={{ x: 'max-content' }}
      />
    </div>

      <Modal
        title={editingScheme ? "Edit Scheme" : "Create New Scheme"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width="100%"
        style={{ top: 20, maxWidth: 600 }}
      >
        <Form form={form} onFinish={handleOk} layout="vertical">
          <Form.Item
            name="Name"
            label="Scheme Name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          
          <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                    name="Total_Amount"
                    label="Total Amount"
                    rules={[{ required: true }]}
                >
                    <InputNumber 
                        style={{ width: "100%" }} 
                        onChange={(val) => {
                            const period = form.getFieldValue('Period');
                            if (period && val) {
                                form.setFieldsValue({ Amount_per_month: (val / period).toFixed(2) });
                            }
                        }}
                    />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                    name="Period"
                    label="Period (Months)"
                    rules={[{ required: true }]}
                >
                    <InputNumber 
                        style={{ width: "100%" }} 
                        onChange={(val) => {
                            // 1. Calculate Amount Per Month
                            const total = form.getFieldValue('Total_Amount');
                            if (total && val) {
                                form.setFieldsValue({ Amount_per_month: (total / val).toFixed(2) });
                            }
                            // 2. Sync Number of Due
                            form.setFieldsValue({ Number_of_due: val });
                            
                            // 3. Calculate End Date
                            const start = form.getFieldValue('Month_from');
                            if (start && val) {
                                form.setFieldsValue({ Month_to: dayjs(start).add(val, 'month') });
                            }
                        }}
                    />
                </Form.Item>
              </Col>
          </Row>

          <Row gutter={16}>
             <Col xs={24} sm={12}>
                <Form.Item
                    name="Amount_per_month"
                    label="Amount Per Month"
                    rules={[{ required: true }]}
                >
                    <InputNumber style={{ width: "100%" }} readOnly />
                </Form.Item>
             </Col>
             <Col xs={24} sm={12}>
                 <Form.Item
                    name="Number_of_due"
                    label="Number of Dues"
                    rules={[{ required: true }]}
                >
                    <InputNumber style={{ width: "100%" }} />
                </Form.Item>
             </Col>
          </Row>

          <Row gutter={16}>
             <Col xs={24} sm={12}>
                <Form.Item
                    name="Month_from"
                    label="Start Month"
                    rules={[{ required: true }]}
                >
                    <DatePicker 
                        style={{ width: "100%" }} 
                        onChange={(date) => {
                            const period = form.getFieldValue('Period');
                            if (period && date) {
                                form.setFieldsValue({ Month_to: dayjs(date).add(period, 'month') });
                            }
                        }}
                    />
                </Form.Item>
             </Col>
             <Col xs={24} sm={12}>
                <Form.Item
                    name="Month_to"
                    label="End Month"
                    rules={[{ required: true }]}
                >
                    <DatePicker style={{ width: "100%" }} disabled />
                </Form.Item>
             </Col>
          </Row>

        </Form>
      </Modal>

      <Modal
        title="Bulk Upload Schemes"
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
      >
        <Upload.Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">Click or drag CSV file to this area to upload</p>
        </Upload.Dragger>
      </Modal>
    </>
  );
};

export default Schemes;

