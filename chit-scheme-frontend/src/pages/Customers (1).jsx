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
import { customersAPI, statesAPI, districtsAPI, schemesAPI, transportersAPI } from "../services/api"; // Assuming api service is structured this way
import Highlighter from "react-highlight-words";
import './css/Customers.css';

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
  const [deliveryPoints, setDeliveryPoints] = useState([]);
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
      title: "Delivery Point",
      dataIndex: "Delivery_Point",
      key: "Delivery_Point",
      width: 150,
      ellipsis: true,
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

  const fetchDeliveryPoints = async () => {
      try {
          const response = await transportersAPI.getAll();
          const transporters = response.data || [];
          // Flatten delivery points
          const points = transporters.flatMap(t => 
              (t.delivery_points || []).map(dp => ({
                  ...dp, 
                  Transporter_Name: t.Transporter_Name
              }))
          );
          setDeliveryPoints(points);
      } catch (error) {
          console.error("Fetch delivery points error", error);
      }
  };

  useEffect(() => {
    fetchCustomers({ page: 1, limit: 20 });
    fetchStates();
    fetchDistricts();
    fetchAvailableSchemes();
    fetchDeliveryPoints();
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
      Reference_Phone: record.Reference_Phone,
      Customer_Type: record.Customer_Type ? record.Customer_Type.split(',') : [],
      PhoneNumber: record.Phone_Number,
      PhoneNumber2: record.Phone_Number2,
      Address1: record.Address1,
      Address2: record.Address2,
      Delivery_Point_ID: record.Delivery_Point_ID,
      State_ID: record.State_ID,
      District_ID: record.District_ID,
      Pincode: record.Pincode
    });
    setSelectedState(record.State_ID);
    setModalVisible(true);
  };

  const createCustomer = async (values) => {
    const performCreate = async (sendWhatsapp) => {
      try {
        // Join Customer Types for storage
        const payload = {
          ...values,
          Customer_ID: editingCustomer ? editingCustomer.Customer_ID : values.Customer_ID,
          Customer_Type: Array.isArray(values.Customer_Type) ? values.Customer_Type.join(',') : values.Customer_Type,
          PhoneNumber2: values.PhoneNumber2 ? values.PhoneNumber2 : null,
          Reference_Name: values.Reference_Name || null,
          District_ID: values.District_ID || null,
          State_ID: values.State_ID || null,
          Pincode: values.Pincode || null,
          sendWhatsapp: sendWhatsapp // Pass flag
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
    
    // Check if it's a new customer (ID exists check handled by validator, but redundancy is fine)
    // Confirm with WhatsApp option
    Modal.confirm({
      title: editingCustomer ? 'Update Customer' : 'Create New Customer',
      content: (
        <div>
           <p>Are you sure you want to {editingCustomer ? 'update' : 'create'} this customer?</p>
           {!editingCustomer && <p>Do you want to send a "Welcome" WhatsApp notification?</p>}
        </div>
      ),
      okText: editingCustomer ? 'Update' : 'Yes, Create & Send WA',
      cancelText: editingCustomer ? 'Cancel' : 'No, Create Only',
      maskClosable: false,
      closable: true,
      onOk: () => performCreate(true), // For update, we might not send WA, but passing true is harmless if backend checks context or we can strictly control it. 
      // Actually backend only sends WA on Create (PhoneNumber check loop) or Assign Scheme.
      // For Update, backend logic for WA isn't there in `updateCustomer`. So simplified:
      // If editing, just do it. If creating, ask.
      onCancel: (close) => {
         // If editing, generic cancel. If creating, specific "No" action?
         // Modal.confirm onCancel handling is tricky with close vs cancel button. 
         // For now, if creating, we want "No, Create Only" button to trigger create(false).
         if (!editingCustomer) performCreate(false);
      }
    });

    // RE-THINK: Modal.confirm onCancel is triggered by X and Cancel button. 
    // If user clicks X, they expect "Do Nothing".
    // If they click "No, Create Only", they expect "Create without WA".
    // Antd Modal.confirm doesn't distinguish easily. 
    // BETTER: Use custom logic or just force it for now (as per user request "cancel button" does the operation).
    // If editing, we just call performCreate(false) to be safe (no WA on update usually).
    if (editingCustomer) {
       // logic above has side effect.
       // Let's rewrite this block cleanly.
       return; 
    }
  };
  
  // Clean implementation replacing the above entirely
  const onFinishForm = (values) => {
      if (editingCustomer) {
          // No WhatsApp prompt for updates currently needed/requested? 
          // User said "all operations which include whatsapp messaging". 
          // `updateCustomer` in backend DOES NOT send WA. So standard save.
          submitCustomerData(values, false);
      } else {
           Modal.confirm({
              title: 'Create New Customer',
              content: (
                <div>
                   <p>Are you sure you want to create this customer?</p>
                   <p>Do you want to send a "Welcome" WhatsApp notification?</p>
                </div>
              ),
              okText: 'Yes, Create & Send WA',
              cancelText: 'No, Create Only',
              maskClosable: false,
              closable: false, // Force choice
              onOk: () => submitCustomerData(values, true),
              onCancel: () => submitCustomerData(values, false)
           });
      }
  };

  const submitCustomerData = async (values, sendWhatsapp) => {
      try {
        const payload = {
          ...values,
          Customer_ID: editingCustomer ? editingCustomer.Customer_ID : values.Customer_ID,
          Customer_Type: Array.isArray(values.Customer_Type) ? values.Customer_Type.join(',') : values.Customer_Type,
          PhoneNumber2: values.PhoneNumber2 ? values.PhoneNumber2 : null,
          Reference_Name: values.Reference_Name || null,
          District_ID: values.District_ID || null,
          State_ID: values.State_ID || null,
          Pincode: values.Pincode || null,
          sendWhatsapp: sendWhatsapp
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
        setSelectedSchemeForCreate(null); 
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
      // Map to just IDs for the Select component
      setSelectedSchemes(assignedResponse.data.map(s => s.Scheme_ID));
    } catch (error) {
      console.error("Error fetching schemes:", error);
      message.error("Failed to load schemes.");
    }
  };

  const handleAssignSchemes = async () => {
    const performAssign = async (sendWhatsapp) => {
        try {
          // API call now needs to support body if customersAPI.assignSchemes uses POST with body
          // Check api.js: assignSchemes: (id, schemeIds) => api.post(`/customers/${id}/schemes`, { schemeIds }),
          // We need to update api.js or pass extra arg?
          // Wait, I can't change api.js signature easily without breaking other calls if any, but this is the only one.
          // Better to update customersAPI.assignSchemes in api.js OR just send manual axios here? 
          // Let's assume I updated api.js or I will update the call to pass an object.
          // Check api.js content again...
          // It is `assignSchemes: (id, schemeIds) => api.post(...)`
          // I should modify api.js first or inline the modification? 
          // I'll assume I can change api.js or the current call.
          // Since I can't change api.js in this tool call, I will pass the object assuming I will fix api.js next.
          // Actually, I should inspect `api.js` again.
          // It's `assignSchemes: (id, schemeIds) => api.post(`/customers/${id}/schemes`, { schemeIds }),`
          // I will update api.js in a separate step or just use `customersAPI.assignSchemes(currentCustomerId, selectedSchemes, sendWhatsapp)` 
          // and update api.js to forward it.
          
          await customersAPI.assignSchemes(currentCustomerId, selectedSchemes, sendWhatsapp);
          message.success("Schemes assigned successfully!");
          setAssignSchemeModalVisible(false);
          fetchCustomers({ page: data.pagination.currentPage || 1, limit: data.pagination.pageSize || 20 });
        } catch (error) {
          console.error("Assign schemes error:", error);
          message.error("Failed to assign schemes.");
        }
    };

    Modal.confirm({
        title: 'Confirm Assignment',
        content: (
            <div>
                <p>Are you sure you want to assign these schemes?</p>
                <p>Do you want to send a WhatsApp notification?</p>
            </div>
        ),
        okText: 'Yes, Assign & Send',
        cancelText: 'No, Assign Only',
        maskClosable: false,
        closable: false,
        onOk: () => performAssign(true),
        onCancel: () => performAssign(false)
    });
  };

  const deleteCustomer = (id) => {
    Modal.confirm({
      title: "Are you sure you want to delete this customer?",
      content: "Deleting this customer will also delete all their Scheme Memberships, Payments, and Auction history. This action cannot be undone.",
      okText: "Yes, Delete It",
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
          <Col xs={24} sm={12} md={6} lg={6}>
              <Input.Search
                placeholder="Search customers"
                allowClear
                enterButton="Search"
                onSearch={(value) => {
                  setSearchText(value);
                  fetchCustomers({ search: value });
                }}
                  className="search-input"
              />
          </Col>
          <Col xs={24} sm={12} md={6} lg={6}>
               <Input.Search
                placeholder="Search Fund Number"
                allowClear
                enterButton="Search"
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
                className="search-input"
              />
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
        <Form form={form} onFinish={onFinishForm} layout="vertical">
          {/* Primary Details Section */}
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} md={8}>
              {!editingCustomer && (
                <Form.Item
                  name="Customer_ID"
                  label="Customee id"
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
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="Name"
                label="Name"
                rules={[{ required: true, message: "Please enter full name" }]}
              >
                <Input placeholder="Customer's full name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="PhoneNumber"
                label="Phone number"
                rules={[{ required: true, message: "Please enter phone number" }]}
              >
                <Input type="number" placeholder="10 digit phone" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="PhoneNumber2" label="Optional secondary number">
                <Input type="number" placeholder="10 digit phone (Optional)" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="Address1" label="Address">
                <Input placeholder="Address Line 1" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="Delivery_Point_ID" 
                label="Delivery point" 
                rules={[{ required: true, message: 'Delivery Point is required' }]}
              >
                <Select placeholder="Select Delivery Point" showSearch optionFilterProp="children">
                   {deliveryPoints.map(dp => (
                       <Option key={dp.Delivery_Point_ID} value={dp.Delivery_Point_ID}>
                           {dp.Place_Name} ({dp.Transporter_Name})
                       </Option>
                   ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="Reference_Name" label="Reference Name">
                <Input placeholder="Reference name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="Reference_Phone" label="Reference Phone">
                <Input type="number" placeholder="Reference Phone Number" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="Address2" label="Address Line 2">
                <Input placeholder="Address Line 2" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="Pincode" label="Pincode">
                <Input type="number" placeholder="6 digit pincode" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="State_ID"
                label="State"
                // strict requirement removed as per plan
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
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="District_ID"
                label="District"
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
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="Customer_Type"
                label="Customer Type"
                initialValue={['New']} // Default to New if not set
              >
                <Select mode="multiple" placeholder="Select type(s)">
                    <Option value="New">New</Option>
                    <Option value="Regular Customer">Regular Customer</Option>
                    <Option value="Wholesale">Wholesale</Option>
                    <Option value="Giftbox">Giftbox</Option>
                    <Option value="Fund Scheme">Fund Scheme</Option>
                    <Option value="All">All</Option>
                </Select>
              </Form.Item>
            </Col>

          </Row>
          
          {/* Scheme Assignment Section (Only for New Customers) */}
          {!editingCustomer && (
              <>
                <div style={{ margin: '10px 0', borderTop: '1px solid #f0f0f0', paddingTop: '10px' }}>
                    <h4 style={{marginBottom: '10px'}}>Assign Initial Schemes (Optional)</h4>
                </div>
                <Form.List name="Schemes">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, fieldKey, ...restField }) => (
                        <Row gutter={16} key={key} align="middle">
                          <Col xs={24} md={11}>
                            <Form.Item
                              {...restField}
                              name={[name, 'schemeId']}
                              fieldKey={[fieldKey, 'schemeId']}
                              label="Select Scheme"
                              rules={[{ required: true, message: 'Missing scheme' }]}
                            >
                              <Select placeholder="Select Scheme">
                                {availableSchemes.map(s => (
                                  <Option key={s.Scheme_ID} value={s.Scheme_ID}>{s.Name}</Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={11}>
                            <Form.Item
                              {...restField}
                              name={[name, 'fundNumber']}
                              fieldKey={[fieldKey, 'fundNumber']}
                              label="Fund Number"
                              initialValue={generateFundNumber()}
                              rules={[{ required: true, message: 'Missing Fund Number' }]}
                            >
                              <Input placeholder="Fund Number" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={2}>
                            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ marginTop: 30 }} />
                          </Col>
                        </Row>
                      ))}
                      <Form.Item>
                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                          Add Scheme
                        </Button>
                      </Form.Item>
                    </>
                  )}
                </Form.List>
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
        <p>Select schemes to assign to this customer (Max 1):</p>
        <Select
          mode="multiple"
          maxCount={1}
          className="full-width"
          placeholder="Select schemes"
          value={selectedSchemes}
          onChange={setSelectedSchemes}
          optionFilterProp="children"
        >
          {availableSchemes.map(scheme => (
            <Option key={scheme.Scheme_ID} value={scheme.Scheme_ID}>
              {scheme.Name}
            </Option>
          ))}
        </Select>
      </Modal>
    </>
  );
};

export default Customers;
