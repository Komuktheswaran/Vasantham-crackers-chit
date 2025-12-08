import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Input,
  Form,
  Modal,
  Space,
  Tag,
  Row,
  Col,
  Select,
  message,
  Dropdown,
  Menu,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import { customersAPI, statesAPI, districtsAPI, schemesAPI } from "../services/api"; // Assuming api service is structured this way
import Highlighter from "react-highlight-words";

const { Option } = Select;

const Customers = () => {
  const [data, setData] = useState({ customers: [], pagination: {} });
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [idExists, setIdExists] = useState(false);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  const [assignSchemeModalVisible, setAssignSchemeModalVisible] = useState(false);
  const [availableSchemes, setAvailableSchemes] = useState([]);
  const [selectedSchemes, setSelectedSchemes] = useState([]);
  const [currentCustomerId, setCurrentCustomerId] = useState(null);



  // Function to check if Customer_ID exists
  const checkId = async (rule, value) => {
    if (!value || editingCustomer) {
      setIdExists(false);
      return Promise.resolve();
    }
    try {
      const response = await customersAPI.checkId(value);
      if (response.data.exists) {
        setIdExists(true);
        return Promise.reject("This Customer ID already exists.");
      }
      setIdExists(false);
      return Promise.resolve();
    } catch (error) {
      console.error("Check ID error:", error);
      // In case of API error, prevent submission
      return Promise.reject("Could not validate Customer ID.");
    }
  };

  const columns = [
    {
      title: "Cust ID",
      dataIndex: "Customer_ID",
      key: "Customer_ID",
      sorter: (a, b) => a.Customer_ID - b.Customer_ID,
    },
    {
      title: "First Name",
      dataIndex: "First_Name",
      key: "First_Name",
      render: (text) => (
        <Highlighter
          highlightStyle={{ backgroundColor: "#fffb00", padding: 0 }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={text}
        />
      ),
    },
    {
      title: "Last Name",
      dataIndex: "Last_Name",
      key: "Last_Name",
    },
    {
      title: "Phone",
      dataIndex: "Phone_Number",
      key: "Phone_Number",
    },
    {
      title: "Area",
      dataIndex: "Area",
      key: "Area",
    },
    {
      title: "District",
      dataIndex: "District_Name",
      key: "District_Name",
    },
    {
      title: "Schemes",
      dataIndex: "total_schemes",
      key: "total_schemes",
      render: (count) => (
        <Tag color={count > 0 ? "green" : "default"}>{count}</Tag>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          <Button
            icon={<EditOutlined />}
            onClick={() => editCustomer(record)}
            size="small"
          />
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => deleteCustomer(record.Customer_ID)}
            size="small"
          />
          <Button
            icon={<UsergroupAddOutlined />}
            onClick={() => openAssignSchemeModal(record.Customer_ID)}
            size="small"
            title="Assign Schemes"
          />
        </Space>
      ),
    },
  ];

  const fetchCustomers = async (params = {}) => {
    setLoading(true);
    try {
      const response = await customersAPI.getAll(params);
      setData(response.data);
    } catch (error) {
      console.error("Fetch customers error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStates = async () => {
    try {
      const response = await statesAPI.getAll();
      setStates(response.data);
    } catch (error) {
      console.error("Fetch states error:", error);
    }
  };

  const fetchDistricts = async () => {
    try {
      const response = await districtsAPI.getAll();
      setDistricts(response.data);
    } catch (error) {
      console.error("Fetch districts error:", error);
    }
  };

  useEffect(() => {
    fetchCustomers({ page: 1, limit: 20 });
    fetchStates();
    fetchDistricts();
  }, []);

  const handleTableChange = (pagination) => {
    fetchCustomers({
      page: pagination.current,
      limit: pagination.pageSize,
      search: searchText,
    });
  };

  const editCustomer = (record) => {
    setEditingCustomer(record);
    form.setFieldsValue({
      ...record,
      State_ID: record.State_ID,
      District_ID: record.District_ID,
    });
    setSelectedState(record.State_ID);
    setModalVisible(true);
  };

  const createCustomer = async (values) => {
    try {
      const payload = {
        ...values,
      };
      if (editingCustomer) {
        await customersAPI.update(editingCustomer.Customer_ID, payload);
      } else {
        await customersAPI.create(payload);
      }
      setModalVisible(false);
      form.resetFields();
      setEditingCustomer(null);
      fetchCustomers({ page: 1, limit: 20 });
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const openAssignSchemeModal = async (customerId) => {
    setCurrentCustomerId(customerId);
    setAssignSchemeModalVisible(true);
    try {
      // Fetch all schemes
      const schemesResponse = await schemesAPI.getAll();
      setAvailableSchemes(schemesResponse.data);

      // Fetch currently assigned schemes for this customer
      const assignedResponse = await customersAPI.getSchemes(customerId);
      setSelectedSchemes(assignedResponse.data);
    } catch (error) {
      console.error("Error fetching schemes:", error);
      message.error("Failed to load schemes.");
    }
  };

  const handleAssignSchemes = async () => {
    try {
      await customersAPI.assignSchemes(currentCustomerId, selectedSchemes);
      message.success("Schemes assigned successfully!");
      setAssignSchemeModalVisible(false);
      fetchCustomers({ page: data.pagination.currentPage, limit: data.pagination.pageSize });
    } catch (error) {
      console.error("Assign schemes error:", error);
      message.error("Failed to assign schemes.");
    }
  };

  const deleteCustomer = (id) => {
    Modal.confirm({
      title: "Are you sure you want to delete this customer?",
      okText: "Yes",
      okType: "danger",
      onOk: async () => {
        try {
          await customersAPI.delete(id);
          message.success("Customer deleted successfully!");
          fetchCustomers({ page: 1, limit: 20 });
        } catch (error) {
          console.error("Delete customer error:", error);
          message.error("Failed to delete customer.");
        }
      },
    });
  };

  const handleDownload = (filtered = false) => {
    let url = `${process.env.REACT_APP_API_URL || 'https://103.38.50.149:5006/api'}/customers/download`;
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

  const filteredDistricts = selectedState
    ? districts.filter((d) => d.State_ID === selectedState)
    : [];

  return (
    <>
      <div className="page-header-row">
        <h2 className="page-title">Customer Management ({data.pagination?.totalRecords || 0} total)</h2>
        <Space>
          <Input.Search
            placeholder="Search customers"
            allowClear
            onSearch={(value) => {
              setSearchText(value);
              fetchCustomers({ search: value });
            }}
            className="search-input"
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingCustomer(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            Add Customer
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
        dataSource={data.customers}
        rowKey="Customer_ID"
        loading={loading}
        pagination={{
          ...data.pagination,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        onChange={handleTableChange}
        scroll={{ x: 800 }}
      />

      <Modal
        title={editingCustomer ? "Edit Customer" : "Add Customer"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingCustomer(null);
        }}
        onOk={() => form.submit()}
        width={800}
      >
        <Form form={form} onFinish={createCustomer} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              {!editingCustomer && (
                <Form.Item
                  name="Customer_ID"
                  label="Customer ID"
                  rules={[
                    { required: true, message: "Customer ID is required." },
                    { validator: checkId },
                  ]}
                  validateStatus={idExists ? "error" : ""}
                  help={idExists ? "This Customer ID already exists." : ""}
                >
                  <Input type="number" placeholder="Unique Customer ID" />
                </Form.Item>
              )}
              <Form.Item
                name="FirstName"
                label="First Name"
                rules={[{ required: true }]}
              >
                <Input placeholder="Customer's first name" />
              </Form.Item>
              <Form.Item
                name="PhoneNumber"
                label="Phone Number"
                rules={[{ required: true }]}
              >
                <Input type="number" placeholder="10 digit phone" />
              </Form.Item>
              <Form.Item name="StreetAddress1" label="Street Address 1">
                <Input placeholder="Street Address 1" />
              </Form.Item>
              <Form.Item name="Area" label="Area">
                <Input placeholder="Customer area" />
              </Form.Item>
              <Form.Item
                name="State_ID"
                label="State"
                rules={[{ required: true }]}
              >
                <Select
                  placeholder="Select a state"
                  onChange={(value) => {
                    setSelectedState(value);
                    form.setFieldsValue({ District_ID: null });
                  }}
                  allowClear
                >
                  {states.map((state) => (
                    <Option key={state.State_ID} value={state.State_ID}>
                      {state.State_Name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="Pincode" label="Pincode">
                <Input type="number" placeholder="6 digit pincode" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="LastName" label="Last Name">
                <Input placeholder="Customer's last name" />
              </Form.Item>
              <Form.Item name="PhoneNumber2" label="Phone Number 2">
                <Input type="number" placeholder="10 digit phone" />
              </Form.Item>

              <Form.Item name="StreetAddress2" label="Street Address 2">
                <Input placeholder="Street Address 2" />
              </Form.Item>
              <Form.Item
                name="District_ID"
                label="District"
                rules={[{ required: true }]}
              >
                <Select
                  placeholder="Select a district"
                  disabled={!selectedState}
                >
                  {filteredDistricts.map((district) => (
                    <Option
                      key={district.District_ID}
                      value={district.District_ID}
                    >
                      {district.District_Name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="Nationality" label="Nationality">
                <Input placeholder="Nationality" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="Assign Schemes"
        open={assignSchemeModalVisible}
        onCancel={() => setAssignSchemeModalVisible(false)}
        onOk={handleAssignSchemes}
      >
        <p>Select schemes to assign to this customer:</p>
        <Select
          mode="multiple"
          className="full-width"
          placeholder="Select schemes"
          value={selectedSchemes}
          onChange={setSelectedSchemes}
          optionFilterProp="children"
        >
          {availableSchemes.map(scheme => (
            <Option key={scheme.Scheme_ID} value={scheme.Scheme_ID}>
              {scheme.Name} (₹{scheme.Total_Amount})
            </Option>
          ))}
        </Select>
      </Modal>
    </>
  );
};

export default Customers;
