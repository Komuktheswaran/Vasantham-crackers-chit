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
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { schemesAPI } from "../services/api";
import dayjs from "dayjs";

const Schemes = () => {
  const [schemes, setSchemes] = useState([]);
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

  const handleDownload = (filtered = false) => {
    let url = `${process.env.REACT_APP_API_URL || 'https://103.38.50.149:5006/api'}/schemes/download`;
    if (filtered && searchText) {
      url += `?search=${encodeURIComponent(searchText)}`;
    }
    window.open(url, '_blank');
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
      const response = await schemesAPI.getAll(params);
      setSchemes(response.data || []);
    } catch (error) {
      console.error("Fetch schemes error:", error);
      message.error("Failed to fetch schemes.");
    } finally {
      setLoading(false);
    }
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
      okText: "Yes",
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
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <h2>Chit Schemes</h2>
        <Space>
          <Input.Search
            placeholder="Search schemes"
            allowClear
            onSearch={(value) => {
              setSearchText(value);
              fetchSchemes({ search: value });
            }}
            style={{ width: 200 }}
          />
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

      <Table
        columns={columns}
        dataSource={schemes}
        rowKey="Scheme_ID"
        loading={loading}
        pagination={{ pageSize: 15 }}
        scroll={{ x: 800 }}
      />

      <Modal
        title={editingScheme ? "Edit Scheme" : "Create New Scheme"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleOk} layout="vertical">
          <Form.Item
            name="Name"
            label="Scheme Name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="Total_Amount"
            label="Total Amount"
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="Amount_per_month"
            label="Amount Per Month"
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="Period"
            label="Period (in months)"
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="Number_of_due"
            label="Number of Dues"
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="Month_from"
            label="Start Month"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="Month_to"
            label="End Month"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
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

