import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Input,
  Form,
  Modal,
  Space,
  Row,
  Col,
  Select,
  message,
  Upload,
  Card,
  Tag,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  UploadOutlined,
  DownloadOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import {
  customersAPI,
  statesAPI,
  districtsAPI,
  schemesAPI,
  transportersAPI,
} from "../services/api"; // Assuming api service is structured this way
import Highlighter from "react-highlight-words";
import * as XLSX from "xlsx";
import "./css/Customers.css";

const { Option } = Select;

// Helper to generate unique ID
// Helpers removed - using backend sequential IDs

const Customers = () => {
  const [data, setData] = useState({ customers: [], pagination: {} });
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [idExists, setIdExists] = useState(false);
  const [codeExists, setCodeExists] = useState(false);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [deliveryPoints, setDeliveryPoints] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  const [assignSchemeModalVisible, setAssignSchemeModalVisible] =
    useState(false);

  // Restored Hooks
  const [availableSchemes, setAvailableSchemes] = useState([]);
  const [selectedSchemes, setSelectedSchemes] = useState(null); // Changed to single value
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
      const data = response.data.data || response.data;
      if (data.exists) {
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
      title: "Cust Code",
      dataIndex: "Customer_Code",
      key: "Customer_Code",
      sorter: (a, b) =>
        (a.Customer_Code || "").localeCompare(b.Customer_Code || ""),
    },
    {
      title: "Cust ID",
      dataIndex: "Customer_ID",
      key: "Customer_ID",
      sorter: (a, b) => a.Customer_ID.localeCompare(b.Customer_ID),
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
      title: "Ref Code",
      dataIndex: "Reference_Code",
      key: "Reference_Code",
      render: (text) => text || "-",
    },
    {
      title: "Type",
      dataIndex: "Customer_Type",
      key: "Customer_Type",
      render: (text) => (
        <Space size="small" wrap>
          {text
            ? text.split(",").map((t) => (
                <Tag key={t} color="blue">
                  {t}
                </Tag>
              ))
            : "-"}
        </Space>
      ),
    },
    {
      title: "Address",
      dataIndex: "Address1",
      key: "Address1",
      width: 200,
      ellipsis: true,
      render: (text) => text || "-",
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
        ...params,
      };

      const response = await customersAPI.getAll(queryParams);
      setData(response.data.data || response.data);
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
      setStates(response.data.data || response.data || []);
    } catch (error) {
      console.error("Fetch states error:", error);
    }
  };

  const fetchDistricts = async () => {
    try {
      const response = await districtsAPI.getAll();
      setDistricts(response.data.data || response.data || []);
    } catch (error) {
      console.error("Fetch districts error:", error);
    }
  };

  const fetchAvailableSchemes = async () => {
    try {
      const schemesResponse = await schemesAPI.getAll();
      const data = schemesResponse.data.data || schemesResponse.data || {};
      setAvailableSchemes(
        data.schemes || (Array.isArray(data) ? data : []) || [],
      );
    } catch (error) {
      console.error("Fetch schemes error", error);
    }
  };

  const fetchDeliveryPoints = async () => {
    try {
      const response = await transportersAPI.getAll();
      const transporters = response.data.data || response.data || [];
      // Flatten delivery points
      const points = transporters.flatMap((t) =>
        (t.delivery_points || []).map((dp) => ({
          ...dp,
          Transporter_Name: t.Transporter_Name,
        })),
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
      Customer_Code: record.Customer_Code,
      Name: record.Name,
      Reference_Code: record.Reference_Code,
      Customer_Type: record.Customer_Type || "",
      PhoneNumber: record.Phone_Number,
      PhoneNumber2: record.Phone_Number2,
      Address1: record.Address1,
      Address2: record.Address2,
      State_ID: record.State_ID,
      District_ID: record.District_ID,
      Pincode: record.Pincode,
    });
    setSelectedState(record.State_ID);
    setModalVisible(true);
  };

  const onFinishForm = (values) => {
    if (editingCustomer) {
      submitCustomerData(values, false);
    } else {
      Modal.confirm({
        title: "Create New Customer",
        content: (
          <div>
            <p>Are you sure you want to create this customer?</p>
            <p>Do you want to send a "Welcome" WhatsApp notification?</p>
          </div>
        ),
        okText: "Yes, Create & Send WA",
        cancelText: "No, Create Only",
        maskClosable: false,
        closable: false, // Force choice
        onOk: () => submitCustomerData(values, true),
        onCancel: () => submitCustomerData(values, false),
      });
    }
  };

  const submitCustomerData = async (values, sendWhatsapp) => {
    try {
      const payload = {
        ...values,
        Customer_ID: editingCustomer
          ? editingCustomer.Customer_ID
          : values.Customer_ID,
        Customer_Code: values.Customer_Code,
        Customer_Type: values.Customer_Type || "",
        PhoneNumber2: values.PhoneNumber2 || null,
        Reference_Code: values.Reference_Code || null,
        District_ID: values.District_ID || null,
        State_ID: values.State_ID || null,
        Pincode: values.Pincode || null,
        sendWhatsapp: sendWhatsapp,
        Scheme_ID: values.Scheme_ID || null,
        Fund_Number: values.Fund_Number || null,
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
      message.error(
        "Failed to save customer: " +
          (error.response?.data?.error || error.message),
      );
    }
  };

  const openAssignSchemeModal = async (customerId) => {
    setCurrentCustomerId(customerId);
    setAssignSchemeModalVisible(true);
    try {
      // Fetch currently assigned schemes for this customer
      const assignedResponse = await customersAPI.getSchemes(customerId);
      const data = assignedResponse.data.data || assignedResponse.data || [];
      // Set to single ID (first scheme) or null
      setSelectedSchemes(data.length > 0 ? data[0].Scheme_ID : null);
    } catch (error) {
      console.error("Error fetching schemes:", error);
      message.error("Failed to load schemes.");
    }
  };

  const handleAssignSchemes = async () => {
    // Check if customer already has a scheme
    const hasExistingScheme =
      selectedSchemes !== null && selectedSchemes !== undefined;

    const performAssign = async (sendWhatsapp) => {
      try {
        // Convert single value to array for backend compatibility
        const schemeIds = selectedSchemes ? [selectedSchemes] : [];

        await customersAPI.assignSchemes(
          currentCustomerId,
          schemeIds,
          sendWhatsapp,
        );
        message.success("Scheme assigned successfully!");
        setAssignSchemeModalVisible(false);
        fetchCustomers({
          page: data.pagination.currentPage || 1,
          limit: data.pagination.pageSize || 20,
        });
      } catch (error) {
        console.error("Assign schemes error:", error);
        message.error("Failed to assign scheme.");
      }
    };

    Modal.confirm({
      title: hasExistingScheme
        ? "Replace Existing Scheme?"
        : "Confirm Assignment",
      content: (
        <div>
          {hasExistingScheme && (
            <p style={{ color: "#ff4d4f", fontWeight: "bold" }}>
              ⚠️ This will replace the customer's existing scheme!
            </p>
          )}
          <p>
            Are you sure you want to {hasExistingScheme ? "replace" : "assign"}{" "}
            this scheme?
          </p>
          <p>Do you want to send a WhatsApp notification?</p>
        </div>
      ),
      okText: "Yes, Assign & Send",
      cancelText: "No, Assign Only",
      maskClosable: false,
      closable: false,
      onOk: () => performAssign(true),
      onCancel: () => performAssign(false),
    });
  };

  const handleRemoveScheme = () => {
    if (!selectedSchemes) return;

    Modal.confirm({
      title: "Remove Assigned Scheme?",
      content:
        "Are you sure you want to remove this scheme from the customer? This action cannot be undone.",
      okText: "Yes, Remove",
      okType: "danger",
      onOk: async () => {
        try {
          await customersAPI.removeScheme(currentCustomerId, selectedSchemes);
          message.success("Scheme removed successfully");
          setAssignSchemeModalVisible(false);
          fetchCustomers({
            page: data.pagination.currentPage || 1,
            limit: data.pagination.pageSize || 20,
          });
        } catch (error) {
          console.error("Remove scheme error:", error);
          message.error("Failed to remove scheme");
        }
      },
    });
  };

  const deleteCustomer = (id) => {
    Modal.confirm({
      title: "Are you sure you want to delete this customer?",
      content:
        "Deleting this customer will also delete all their Scheme Memberships, Payments, and Auction history. This action cannot be undone.",
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
    ? districts
        .filter((d) => d.State_ID === selectedState)
        .sort((a, b) => a.District_Name.localeCompare(b.District_Name))
    : [];

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bstr = e.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          message.error("Excel file is empty");
          return;
        }

        // Process uploaded data
        let successCount = 0;
        let failCount = 0;

        Modal.confirm({
          title: "Confirm Bulk Upload",
          content: `Found ${data.length} records. Proceed to upload?`,
          onOk: async () => {
            const hide = message.loading("Uploading records...", 0);
            for (const row of data) {
              // Allow mapping flexible column names if needed, but per request strict "Customer ID" and "Phone Number"?
              // Let's check keys. user said "customer id" and "phone number" only.
              // We'll normalize keys to be safe.
              const record = {};
              for (let key in row) {
                const cleanKey = key
                  .trim()
                  .toLowerCase()
                  .replace(/_/g, "")
                  .replace(/\s/g, "");
                if (
                  cleanKey.includes("customerid") ||
                  cleanKey.includes("custid")
                )
                  record.Customer_ID = row[key];
                if (
                  cleanKey.includes("phonenumber") ||
                  cleanKey.includes("phone")
                )
                  record.Phone_Number = row[key];
                // Optional: Name? "in the excel i need only customer id and phone number only"
                // If Name is mandatory in backend, we might have an issue.
                // Current Form rules: Name required.
                // I'll assume for bulk upload we might need to dummy it or user provides it.
                // Wait, "in the excel i need only customer id and phone number only".
                // Use "Unknown" or Customer ID as name if missing?
                if (cleanKey.includes("name")) record.Name = row[key];
              }

              if (!record.Customer_ID || !record.Phone_Number) {
                // Skipping invalid row
                console.warn("Skipping row, missing ID or Phone", row);
                failCount++;
                continue;
              }

              const payload = {
                Customer_ID: String(record.Customer_ID),
                Phone_Number: String(record.Phone_Number),
                Name: record.Name || `Customer ${record.Customer_ID}`, // Fallback Name
                Customer_Type: "", // Blank as requested
                sendWhatsapp: false, // No WA for bulk likely
              };

              try {
                await customersAPI.create(payload);
                successCount++;
              } catch (err) {
                console.error("Failed to upload", payload, err);
                failCount++;
              }
            }
            hide();
            message.success(
              `Upload Complete. Success: ${successCount}, Failed: ${failCount}`,
            );
            fetchCustomers({ page: 1 });
          },
        });
      } catch (error) {
        console.error("Excel parse error", error);
        message.error("Failed to parse Excel file");
      }
    };
    reader.readAsBinaryString(file);
    return false; // Prevent auto upload
  };

  const downloadSampleFile = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        "Customer ID": "CUST_123456",
        "Phone Number": "9876543210",
        Name: "Optional Name",
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, "customer_upload_sample.xlsx");
  };

  const openCustomerModal = async (customer = null) => {
    setEditingCustomer(customer);
    if (customer) {
      form.setFieldsValue({
        ...customer,
        PhoneNumber: customer.Phone_Number,
        PhoneNumber2: customer.Phone_Number2,
        Reference_Code: customer.Reference_Code,
      });
      setSelectedState(customer.State_ID);
    } else {
      form.resetFields();
      setSelectedState(null);
      try {
        const response = await customersAPI.getNextIds();
        if (response.data.success) {
          form.setFieldsValue({
            Customer_ID: response.data.data.customerId,
            Fund_Number: response.data.data.fundNumber,
          });
        }
      } catch (err) {
        console.error("Failed to fetch next IDs:", err);
        message.error("Failed to generate Customer ID and Fund Number");
      }
    }
    setModalVisible(true);
  };

  return (
    <>
      <div className="page-header-container">
        <Row
          justify="space-between"
          align="middle"
          style={{ marginBottom: 16 }}
        >
          <Col>
            <h2 className="page-title">
              Customer Management ({data.pagination?.totalRecords || 0} total)
            </h2>
          </Col>
          <Col>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={downloadSampleFile}>
                Sample Excel
              </Button>
              <Upload
                beforeUpload={handleFileUpload}
                showUploadList={false}
                accept=".xlsx, .xls"
              >
                <Button icon={<UploadOutlined />}>Upload Excel</Button>
              </Upload>
            </Space>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              block
              onClick={() => openCustomerModal()}
            >
              Add Customer
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6} lg={6}>
            <Input.Search
              placeholder="Search by Name, Phone, Code, ID, or Fund Number"
              allowClear
              enterButton="Search"
              onSearch={(value) => {
                setSearchText(value);
                // Updated to search by Code as well if supported by getAll
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
                if (!e.target.value) {
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
        scroll={{ x: 1200 }}
      />

      <Modal
        title={editingCustomer ? "Edit Customer" : "Add Customer"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingCustomer(null);
          setSelectedSchemeForCreate(null);
          setSelectedState(null); // Clear selected state on modal close
        }}
        onOk={() => form.submit()}
        width="90%"
        style={{ top: 30 }}
        styles={{ body: { minHeight: 500 } }}
        forceRender
      >
        <Form
          form={form}
          onFinish={onFinishForm}
          layout="vertical"
          size="middle"
        >
          <Row gutter={[24, 8]}>
            {/* Customer ID (Auto-generated but visible) */}
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="Customer_ID"
                label="Customer ID"
                rules={[
                  { required: true, message: "Customer ID is required." },
                  { validator: checkId },
                ]}
                validateStatus={idExists ? "error" : ""}
                help={idExists ? "This Customer ID already exists." : ""}
                margin="dense"
              >
                <Input placeholder="Unique Customer ID" readOnly={true} />
              </Form.Item>
            </Col>

            {/* 1. Customer Code (Manual Entry) */}
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="Customer_Code"
                label="Customer Code"
                normalize={(value) => value.toUpperCase()}
                rules={[
                  { required: true, message: "Customer Code is required." },
                ]}
              >
                <Input placeholder="Enter Customer Code" />
              </Form.Item>
            </Col>

            {/* 2. Name */}
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="Name"
                label="Name"
                normalize={(value) => value.toUpperCase()}
              >
                <Input placeholder="Full name" />
              </Form.Item>
            </Col>

            {/* 3. Phone Number */}
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="PhoneNumber"
                label="Phone number"
                rules={[{ required: true, message: "Required" }]}
              >
                <Input type="number" placeholder="10 digit" />
              </Form.Item>
            </Col>

            {/* 4. Secondary Phone (Optional) */}
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="PhoneNumber2" label="Secondary Phone">
                <Input type="number" placeholder="10 digit phone" />
              </Form.Item>
            </Col>

            {/* 5. Customer Type */}
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="Customer_Type"
                label="Customer Type"
                initialValue=""
              >
                <Select
                  placeholder="Select type"
                  showSearch
                  optionFilterProp="children"
                  allowClear
                  popupClassName="bright-highlight"
                >
                  <Option value="New">New</Option>
                  <Option value="Regular Customer">Regular Customer</Option>
                  <Option value="Wholesale">Wholesale</Option>
                  <Option value="Giftbox">Giftbox</Option>
                  <Option value="Fund Scheme">Fund Scheme</Option>
                  <Option value="Guest">Guest</Option>
                  <Option value="All">All</Option>
                </Select>
              </Form.Item>
            </Col>

            {/* 6. Address Line 1 */}
            <Col xs={24} sm={12} md={12}>
              <Form.Item name="Address1" label="Address Line 1">
                <Input placeholder="Address Line 1" />
              </Form.Item>
            </Col>

            {/* 7. Address Line 2 */}
            <Col xs={24} sm={12} md={12}>
              <Form.Item name="Address2" label="Address Line 2">
                <Input placeholder="Address Line 2" />
              </Form.Item>
            </Col>

            {/* 8. State */}
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="State_ID" label="State">
                <Select
                  placeholder="Select a state"
                  showSearch
                  optionFilterProp="children"
                  popupClassName="bright-highlight"
                  onChange={(value) => {
                    setSelectedState(value);
                    form.setFieldsValue({ District_ID: null });
                  }}
                  allowClear
                >
                  {states
                    .sort((a, b) => a.State_Name.localeCompare(b.State_Name))
                    .map((state) => (
                      <Option key={state.State_ID} value={state.State_ID}>
                        {state.State_Name}
                      </Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>

            {/* 9. District */}
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="District_ID" label="District">
                <Select
                  placeholder="Select a district"
                  disabled={!selectedState}
                  showSearch
                  optionFilterProp="children"
                  popupClassName="bright-highlight"
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

            {/* 10. Pincode */}
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="Pincode" label="Pincode">
                <Input type="number" placeholder="6 digit pincode" />
              </Form.Item>
            </Col>

            {/* Reference Code */}
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="Reference_Code" label="Reference Code">
                <Input placeholder="Reference Code" />
              </Form.Item>
            </Col>
          </Row>

          {/* Scheme Assignment Section (Only for New Customers) */}
          {!editingCustomer && (
            <>
              <div
                style={{
                  margin: "10px 0",
                  borderTop: "1px solid #f0f0f0",
                  paddingTop: "10px",
                }}
              >
                <h4 style={{ marginBottom: "10px" }}>
                  Assign Initial Scheme (Optional - Max 1)
                </h4>
              </div>
              <Row gutter={16}>
                <Col xs={24} sm={12} md={12}>
                  <Form.Item name="Scheme_ID" label="Select Scheme">
                    <Select
                      placeholder="Select Scheme"
                      allowClear
                      showSearch
                      popupClassName="bright-highlight"
                      optionFilterProp="children"
                      onSelect={async () => {
                        // Auto-generate fund number if not already set
                        if (!form.getFieldValue("Fund_Number")) {
                          try {
                            const res = await customersAPI.getNextFundNumber();
                            form.setFieldsValue({
                              Fund_Number: res.data.data.fundNumber,
                            });
                          } catch (err) {
                            console.error(
                              "Failed to fetch next fund number:",
                              err,
                            );
                          }
                        }
                      }}
                    >
                      {availableSchemes.map((s) => (
                        <Option key={s.Scheme_ID} value={s.Scheme_ID}>
                          {s.Name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={12}>
                  <Form.Item
                    name="Fund_Number"
                    label="Fund Number"
                    rules={[
                      {
                        required: !!form.getFieldValue("Scheme_ID"),
                        message: "Fund Number required when scheme selected",
                      },
                    ]}
                  >
                    <Input placeholder="Auto-generated or enter custom" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
        </Form>
      </Modal>

      <Modal
        title="Assign Scheme"
        open={assignSchemeModalVisible}
        onCancel={() => setAssignSchemeModalVisible(false)}
        onOk={handleAssignSchemes}
        footer={[
          <Button
            key="cancel"
            onClick={() => setAssignSchemeModalVisible(false)}
          >
            Cancel
          </Button>,
          selectedSchemes && (
            <Button key="remove" danger onClick={handleRemoveScheme}>
              Remove Scheme
            </Button>
          ),
          <Button key="submit" type="primary" onClick={handleAssignSchemes}>
            Assign / Update
          </Button>,
        ]}
      >
        <p>Select scheme to assign to this customer (Max 1):</p>
        <Select
          className="full-width"
          placeholder="Select scheme"
          value={selectedSchemes}
          onChange={setSelectedSchemes}
          popupClassName="scheme-dropdown"
          optionFilterProp="children"
          showSearch
          allowClear
        >
          {availableSchemes.map((scheme) => (
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
