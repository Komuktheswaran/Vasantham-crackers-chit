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
  UsergroupAddOutlined,
} from "@ant-design/icons";
import { customersAPI, statesAPI, districtsAPI, schemesAPI } from "../services/api"; // Assuming api service is structured this way
import Highlighter from "react-highlight-words";

const { Option } = Select;

// Helper to generate unique ID
const generateCustomerId = () => `CUST_${Date.now()}`;

// Helper to generate Fund Number
const generateFundNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${year}_${month}_${random}`;
};

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
  
  // Restored Hooks
  const [availableSchemes, setAvailableSchemes] = useState([]);
  const [selectedSchemes, setSelectedSchemes] = useState([]);
  const [currentCustomerId, setCurrentCustomerId] = useState(null);
  const [selectedSchemeForCreate, setSelectedSchemeForCreate] = useState(null);
  // Filter States
  const [fundNumberSearch, setFundNumberSearch] = useState("");

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
      title: "Name",
      dataIndex: "Name",
      key: "Name",
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
      title: "Phone",
      dataIndex: "Phone_Number",
      key: "Phone_Number",
    },
    {
      title: "Type",
      dataIndex: "Customer_Type",
      key: "Customer_Type",
      render: (text) => (
        <Space size="small" wrap>
            {text ? text.split(',').map(t => <Tag key={t} color="blue">{t}</Tag>) : '-'}
        </Space>
      )
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
        <Space size="small" wrap>
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
      // Merge current state with params overrides
      const queryParams = {
        page: data.pagination?.currentPage || 1,
        limit: data.pagination?.pageSize || 20,
        search: searchText,
        fund_number: fundNumberSearch,
        ...params
      };
      
      const response = await customersAPI.getAll(queryParams);
      setData(response.data);
    } catch (error) {
      console.error("Fetch customers error:", error);
      message.error("Failed to fetch customers");
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

  const fetchAvailableSchemes = async () => {
    try {
        const schemesResponse = await schemesAPI.getAll();
        setAvailableSchemes(schemesResponse.data.schemes || schemesResponse.data || []);
    } catch (error) {
        console.error("Fetch schemes error", error);
    }
  }

  useEffect(() => {
    fetchCustomers({ page: 1, limit: 20 });
    fetchStates();
    fetchDistricts();
    fetchAvailableSchemes();
  }, []);

  const handleTableChange = (pagination) => {
    fetchCustomers({
      page: pagination.current,
      limit: pagination.pageSize,
    });
  };

  const editCustomer = (record) => {
    setEditingCustomer(record);
    form.setFieldsValue({
      Customer_ID: record.Customer_ID,
      Name: record.Name,
      Reference_Name: record.Reference_Name,
      Customer_Type: record.Customer_Type ? record.Customer_Type.split(',') : [],
      PhoneNumber: record.Phone_Number,
      PhoneNumber2: record.Phone_Number2,
      Address1: record.Address1,
      Address2: record.Address2,
      Area: record.Area,
      State_ID: record.State_ID,
      District_ID: record.District_ID,
      Pincode: record.Pincode
    });
    setSelectedState(record.State_ID);
    setModalVisible(true);
  };

  const createCustomer = async (values) => {
    try {
      // Join Customer Types for storage
      const payload = {
        ...values,
        Customer_ID: editingCustomer ? editingCustomer.Customer_ID : values.Customer_ID,
        Customer_Type: Array.isArray(values.Customer_Type) ? values.Customer_Type.join(',') : values.Customer_Type,
      };

      if (editingCustomer) {
        await customersAPI.update(editingCustomer.Customer_ID, payload);
          message.success("Customer updated successfully");
      } else {
        await customersAPI.create(payload);
          message.success("Customer created successfully");
      }
      setModalVisible(false);
      form.resetFields();
      setEditingCustomer(null);
      setSelectedSchemeForCreate(null); // Reset scheme selection
      fetchCustomers({ page: 1, limit: 20 });
    } catch (error) {
      console.error("Save error:", error);
      message.error("Failed to save customer: " + (error.response?.data?.error || error.message));
    }
  };

  const openAssignSchemeModal = async (customerId) => {
    setCurrentCustomerId(customerId);
    setAssignSchemeModalVisible(true);
    try {
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
      fetchCustomers({ page: data.pagination.currentPage || 1, limit: data.pagination.pageSize || 20 });
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



  const filteredDistricts = selectedState
    ? districts.filter((d) => d.State_ID === selectedState)
    : [];

  return (
    <>
      <div className="page-header-container">
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
             <Col>
                 <h2 className="page-title">Customer Management ({data.pagination?.totalRecords || 0} total)</h2>
             </Col>
        </Row>
        
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6} lg={5}>
              <Input.Search
                placeholder="Search customers"
                allowClear
                onSearch={(value) => {
                  setSearchText(value);
                  fetchCustomers({ search: value });
                }}
                className="full-width-mobile"
                style={{ width: '100%' }}
              />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8}>
               <Input.Search
                placeholder="Search Fund Number"
                allowClear
                onSearch={(value) => {
                  setFundNumberSearch(value);
                  fetchCustomers({ fund_number: value, page: 1 });
                }}
                onChange={(e) => {
                    if(!e.target.value) {
                        setFundNumberSearch("");
                        fetchCustomers({ fund_number: "", page: 1 });
                    }
                }}
                style={{ width: '100%' }}
              />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8}>
               <Button
                type="primary"
                icon={<PlusOutlined />}
                block
                onClick={() => {
                  setEditingCustomer(null);
                  form.resetFields();
                  setTimeout(() => {
                      form.setFieldsValue({
                          Customer_ID: generateCustomerId()
                      });
                  }, 100);
                  setModalVisible(true);
                }}
              >
                Add Customer
              </Button>
          </Col>
        </Row>
      </div>

      <Table
        columns={columns}
        dataSource={data.customers}
        rowKey="Customer_ID"
        loading={loading}
        pagination={{
          ...data.pagination,
          total: data.pagination?.totalRecords || 0,
          current: data.pagination?.currentPage || 1,
          pageSize: data.pagination?.pageSize || 20,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1000 }} // Increased scroll width for responsive table
      />

      <Modal
        title={editingCustomer ? "Edit Customer" : "Add Customer"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingCustomer(null);
          setSelectedSchemeForCreate(null);
        }}
        onOk={() => form.submit()}
        width="100%"
        style={{ top: 20, maxWidth: 800 }}
      >
        <Form form={form} onFinish={createCustomer} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={12}>
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
                  <Input placeholder="Unique Customer ID" />
                </Form.Item>
              )}
              <Form.Item
                name="Name"
                label="Full Name"
                rules={[{ required: true, message: "Please enter full name" }]}
              >
                <Input placeholder="Customer's full name" />
              </Form.Item>
               <Form.Item
                name="Reference_Name"
                label="Reference Name"
              >
                <Input placeholder="Reference name" />
              </Form.Item>
              <Form.Item
                name="Customer_Type"
                label="Customer Type"
                rules={[{ required: true, message: "Select at least one customer type" }]}
              >
                <Select mode="multiple" placeholder="Select type(s)">
                    <Option value="New">New</Option>
                    <Option value="Regular Customer">Regular Customer</Option>
                    <Option value="Wholesale">Wholesale</Option>
                    <Option value="Giftbox">Giftbox</Option>
                    <Option value="Fund Scheme">Fund Scheme</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="PhoneNumber"
                label="Phone Number"
                rules={[{ required: true, message: "Please enter phone number" }]}
              >
                <Input type="number" placeholder="10 digit phone" />
              </Form.Item>
              <Form.Item name="Address1" label="Address Line 1">
                <Input placeholder="Address Line 1" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
                <Form.Item name="PhoneNumber2" label="Secondary Phone">
                    <Input type="number" placeholder="10 digit phone (Optional)" />
                </Form.Item>
                <Form.Item name="Address2" label="Address Line 2">
                    <Input placeholder="Address Line 2" />
                </Form.Item>
               <Form.Item name="Area" label="Area">
                <Input placeholder="Customer area" />
              </Form.Item>
              <Form.Item
                name="State_ID"
                label="State"
                rules={[{ required: true, message: "Please select state" }]}
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
              <Form.Item
                name="District_ID"
                label="District"
                // District removed from mandatory
              >
                <Select
                  placeholder="Select a district"
                  disabled={!selectedState}
                  allowClear
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
              <Form.Item name="Pincode" label="Pincode">
                <Input type="number" placeholder="6 digit pincode" />
              </Form.Item>
            </Col>
          </Row>
          
          {/* Scheme Assignment Section (Only for New Customers) */}
          {!editingCustomer && (
              <>
                <div style={{ margin: '10px 0', borderTop: '1px solid #f0f0f0', paddingTop: '10px' }}>
                    <h4 style={{marginBottom: '10px'}}>Assign Initial Scheme (Optional)</h4>
                </div>
                <Row gutter={16}>
                    <Col xs={24} md={12}>
                        <Form.Item name="Scheme_ID" label="Select Scheme">
                             <Select 
                                placeholder="Select a scheme to assign"
                                allowClear
                                onChange={(val) => {
                                    setSelectedSchemeForCreate(val);
                                    if(val) {
                                        const newFundNum = generateFundNumber();
                                        form.setFieldsValue({ Fund_Number: newFundNum });
                                    } else {
                                        form.setFieldsValue({ Fund_Number: null });
                                    }
                                }}
                             >
                                {availableSchemes.map(s => (
                                    <Option key={s.Scheme_ID} value={s.Scheme_ID}>{s.Name} (₹{s.Total_Amount})</Option>
                                ))}
                             </Select>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        {selectedSchemeForCreate && (
                             <Form.Item 
                                name="Fund_Number" 
                                label="Fund Number"
                                rules={[{ required: true, message: "Fund Number is required for scheme assignment" }]}
                             >
                                <Input placeholder="YYYY_MM_RAND" />
                             </Form.Item>
                        )}
                    </Col>
                </Row>
              </>
          )}

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
