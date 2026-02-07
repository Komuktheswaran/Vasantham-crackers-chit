import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Card,
  Space,
  message,
  Row,
  Col,
  List,
  Typography,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { transportersAPI } from "../services/api";
import "./css/TransportMaster.css";

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
      title: "Delete Transporter",
      content:
        "Are you sure you want to delete this transporter? This may affect associated delivery points.",
      onOk: async () => {
        try {
          await transportersAPI.delete(id);
          message.success("Transporter deleted successfully");
          fetchTransporters();
        } catch (error) {
          message.error("Failed to delete transporter");
        }
      },
    });
  };

  const onFinishTransporter = async (values) => {
    try {
      if (editingTransporter) {
        await transportersAPI.update(editingTransporter.Transporter_ID, values);
        message.success("Transporter updated successfully");
      } else {
        await transportersAPI.create(values);
        message.success("Transporter created successfully");
      }
      setModalVisible(false);
      fetchTransporters();
    } catch (error) {
      message.error(
        "Operation failed: " + (error.response?.data?.error || error.message),
      );
    }
  };

  // --- Delivery Point Methods ---

  const handleManageDP = async (record) => {
    setSelectedTransporter(record);
    setDpModalVisible(true);
    // Fetch fresh list
    try {
      const response = await transportersAPI.getDeliveryPoints(
        record.Transporter_ID,
      );
      // We need to store this in a state that the modal uses
      // Let's rely on selectedTransporter.delivery_points update
      setSelectedTransporter((prev) => ({
        ...prev,
        delivery_points: response.data || [],
      }));
    } catch (error) {
      console.error("Failed to fetch DPs", error);
    }
  };

  const handleAddDP = async (values) => {
    try {
      await transportersAPI.addDeliveryPoint(
        selectedTransporter.Transporter_ID,
        values,
      );
      message.success("Delivery Point added");
      dpForm.resetFields();
      // Refresh list
      handleManageDP(selectedTransporter);
      fetchTransporters(); // Refresh main background list too
    } catch (error) {
      message.error("Failed to add delivery point");
    }
  };

  const handleDeleteDP = async (pointId) => {
    try {
      await transportersAPI.deleteDeliveryPoint(pointId);
      message.success("Delivery Point removed");
      handleManageDP(selectedTransporter); // Refresh local list
      fetchTransporters();
    } catch (error) {
      message.error("Failed to remove delivery point");
    }
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "Transporter_Name",
      key: "Transporter_Name",
    },
    {
      title: "Contact Person",
      dataIndex: "Contact_Person",
      key: "Contact_Person",
    },
    {
      title: "Phone",
      dataIndex: "Phone_Number",
      key: "Phone_Number",
    },
    {
      title: "Delivery Points",
      key: "delivery_points",
      render: (_, record) => (
        <Button size="small" onClick={() => handleManageDP(record)}>
          View Details
        </Button>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEditTransporter(record)}
          />
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteTransporter(record.Transporter_ID)}
          />
        </Space>
      ),
    },
  ];

  // Search state for DP modal
  const [dpSearch, setDpSearch] = useState("");

  const filteredDeliveryPoints =
    selectedTransporter?.delivery_points?.filter((dp) =>
      dp.Place_Name.toLowerCase().includes(dpSearch.toLowerCase()),
    ) || [];

  const dpColumns = [
    {
      title: "Branch Details",
      key: "details",
      render: (text, record) => (
        <div>
          <strong>{record.Place_Name}</strong>
          <br />
          <small>{record.Branch_Address}</small>
          <br />
          <small>Phone: {record.Branch_Phone}</small>
        </div>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 80,
      render: (text, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteDP(record.Delivery_Point_ID)}
        />
      ),
    },
  ];

  return (
    <div className="transport-master-container">
      <div className="page-header-container">
        <Row
          justify="space-between"
          align="middle"
          style={{ marginBottom: 16 }}
        >
          <Col>
            <h2 className="page-title">Transport Master</h2>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddTransporter}
            >
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
          <Form.Item
            name="Transporter_Name"
            label="Transporter Name"
            rules={[{ required: true }]}
          >
            <Input placeholder="Enter name" />
          </Form.Item>
          <Form.Item name="Contact_Person" label="Contact Person">
            <Input placeholder="Enter contact person name" />
          </Form.Item>
          <Form.Item
            name="Phone_Number"
            label="Phone Number"
            rules={[{ required: true }]}
          >
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
        width={800}
      >
        <div
          style={{
            marginBottom: 16,
            borderBottom: "1px solid #f0f0f0",
            paddingBottom: 16,
          }}
        >
          <h4>Add New Branch</h4>
          <Form form={dpForm} layout="vertical" onFinish={handleAddDP}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="Place_Name"
                  label="Branch Name"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input placeholder="Branch Name" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="Branch_Phone" label="Branch Phone">
                  <Input placeholder="Phone Number" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label=" ">
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<PlusOutlined />}
                    block
                  >
                    Add Branch
                  </Button>
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col span={24}>
                <Form.Item name="Branch_Address" label="Branch Address">
                  <Input.TextArea rows={2} placeholder="Address" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>

        <div>
          <Row
            justify="space-between"
            align="middle"
            style={{ marginBottom: 8 }}
          >
            <Col>
              <h4>Existing Branches</h4>
            </Col>
            <Col>
              <Input.Search
                placeholder="Search Branch Name"
                onSearch={(val) => setDpSearch(val)}
                onChange={(e) => setDpSearch(e.target.value)}
                style={{ width: 200 }}
              />
            </Col>
          </Row>

          <Table
            dataSource={filteredDeliveryPoints}
            columns={dpColumns}
            rowKey="Delivery_Point_ID"
            pagination={{ pageSize: 5 }}
            size="small"
          />
        </div>
      </Modal>
    </div>
  );
};

export default TransportMaster;
