import React, { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import {
  Table,
  Card,
  Input,
  Select,
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  message,
} from "antd";
import { SearchOutlined, ReloadOutlined, WhatsAppOutlined, EditOutlined } from "@ant-design/icons";
import { schemesAPI, customersAPI, remindersAPI, statesAPI, districtsAPI } from "../services/api";
import "./css/SchemeMembers.css";

const { Title } = Typography;
const { Option } = Select;

const SchemeMembers = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Filters
  const [fundNumber, setFundNumber] = useState("");
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [reminderLoading, setReminderLoading] = useState(false);
  // Multi-select list of 'YYYY-MM' values. When non-empty, the table is filtered
  // to members with at least one unpaid due in those months, and the targeted
  // WhatsApp send applies to those months.
  const [selectedDueMonths, setSelectedDueMonths] = useState([]);
  // Selected row keys (Fund_Number) for targeted sends.
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // Build last 24 months as picker options, newest first.
  const monthOptions = useMemo(() => {
    const opts = [];
    const start = dayjs().startOf("month");
    for (let i = 0; i < 24; i++) {
      const m = start.subtract(i, "month");
      opts.push({ value: m.format("YYYY-MM"), label: m.format("MMM YYYY") });
    }
    return opts;
  }, []);

  // Customer edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm] = Form.useForm();
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedState, setSelectedState] = useState(null);

  // Options
  const [schemes, setSchemes] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    fetchOptions();
    fetchMembers();
  }, []);

  const fetchOptions = async () => {
    try {
      const schemesRes = await schemesAPI.getAll();
      setSchemes(schemesRes.data.schemes || []);

      const customersRes = await customersAPI.getAll({ limit: 1000 }); // Get initial batch for select
      // Backend response wrapper: { success: true, data: { customers: [], pagination: {} } }
      // Axios wrapper: response.data
      // So detailed data is in response.data.data
      setCustomers(customersRes.data.data?.customers || []);

      const [stRes, dsRes] = await Promise.all([statesAPI.getAll(), districtsAPI.getAll()]);
      setStates(stRes.data.data || stRes.data || []);
      setDistricts(dsRes.data.data || dsRes.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const openEditCustomer = async (customerId) => {
    try {
      const res = await customersAPI.getById(customerId);
      const cust = res.data.data || res.data;
      if (!cust) {
        message.error("Customer not found");
        return;
      }
      setEditingCustomer(cust);
      setSelectedState(cust.State_ID);
      editForm.setFieldsValue({
        Customer_ID: cust.Customer_ID,
        Customer_Code: cust.Customer_Code,
        Name: cust.Name,
        Reference_Code: cust.Reference_Code,
        Customer_Type: cust.Customer_Type || "",
        PhoneNumber: cust.Phone_Number,
        PhoneNumber2: cust.Phone_Number2,
        Address1: cust.Address1,
        Address2: cust.Address2,
        State_ID: cust.State_ID,
        District_ID: cust.District_ID,
        Pincode: cust.Pincode,
      });
      setEditModalVisible(true);
    } catch (err) {
      console.error("Failed to load customer", err);
      message.error("Failed to load customer");
    }
  };

  const submitEditCustomer = async (values) => {
    try {
      await customersAPI.update(editingCustomer.Customer_ID, {
        ...values,
        Customer_ID: editingCustomer.Customer_ID,
        PhoneNumber2: values.PhoneNumber2 || null,
        Reference_Code: values.Reference_Code || null,
        District_ID: values.District_ID || null,
        State_ID: values.State_ID || null,
        Pincode: values.Pincode || null,
      });
      message.success("Customer updated");
      setEditModalVisible(false);
      setEditingCustomer(null);
      fetchMembers();
    } catch (err) {
      console.error("Update customer failed", err);
      message.error("Failed to update customer");
    }
  };

  const sendReminderForCustomer = (record) => {
    const monthsLabel = selectedDueMonths.length > 0
      ? selectedDueMonths.map((m) => dayjs(m).format("MMM YYYY")).join(", ")
      : "the current month";
    Modal.confirm({
      title: `Send WhatsApp reminder to ${record.Customer_Name || record.Customer_ID}?`,
      content: `Will send reminders for unpaid dues in ${monthsLabel}.`,
      okText: "Yes, Send",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          const payload = { customer_id: record.Customer_ID };
          if (selectedDueMonths.length > 0) payload.due_months = selectedDueMonths;
          else payload.months_overdue = 1;
          const res = await remindersAPI.sendManualReminders(payload);
          const data = res.data?.data || res.data || {};
          message.success(`Sent: ${data.success ?? 0}, Failed: ${data.failed ?? 0}`);
        } catch (err) {
          console.error("Per-customer reminder failed", err);
          message.error("Failed to send reminder");
        }
      },
    });
  };

  // Send to all rows the user has ticked, optionally constrained to the
  // months they've picked. If no months are picked, the backend falls back
  // to the last 1 month of unpaid dues.
  const handleSendTargeted = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("Select one or more rows first.");
      return;
    }
    // Map selected Fund_Numbers back to unique Customer_IDs
    const customerIds = Array.from(
      new Set(
        data
          .filter((r) => selectedRowKeys.includes(r.Fund_Number))
          .map((r) => r.Customer_ID)
          .filter(Boolean),
      ),
    );
    if (customerIds.length === 0) {
      message.warning("No customers resolved from the selection.");
      return;
    }

    const monthsLabel = selectedDueMonths.length > 0
      ? selectedDueMonths.map((m) => dayjs(m).format("MMM YYYY")).join(", ")
      : "the current month";

    Modal.confirm({
      title: `Send WhatsApp to ${customerIds.length} customer(s)?`,
      content: `Reminders for unpaid dues in ${monthsLabel}.`,
      okText: "Yes, Send",
      cancelText: "Cancel",
      onOk: async () => {
        setReminderLoading(true);
        try {
          const payload = { customer_ids: customerIds };
          if (selectedDueMonths.length > 0) payload.due_months = selectedDueMonths;
          else payload.months_overdue = 1;
          const res = await remindersAPI.sendManualReminders(payload);
          const d = res.data?.data || res.data || {};
          message.success(`Sent: ${d.success ?? 0}, Failed: ${d.failed ?? 0}`);
        } catch (err) {
          console.error("Targeted reminder failed", err);
          message.error("Failed to send reminders");
        } finally {
          setReminderLoading(false);
        }
      },
    });
  };

  const fetchMembers = async (params = {}) => {
    setLoading(true);
    try {
      const queryParams = {
        page: params.page ?? pagination.current,
        limit: params.limit ?? pagination.pageSize,
      };

      // Use explicitly passed filter params first; fall back to state values.
      // This prevents params passed by handleSearch from being overwritten.
      queryParams.fund_number = 'fund_number' in params ? params.fund_number : fundNumber;
      if ('scheme_id' in params) {
        if (params.scheme_id) queryParams.scheme_id = params.scheme_id;
      } else if (selectedScheme) {
        queryParams.scheme_id = selectedScheme;
      }
      if ('customer_id' in params) {
        if (params.customer_id) queryParams.customer_id = params.customer_id;
      } else if (selectedCustomer) {
        queryParams.customer_id = selectedCustomer;
      }

      const months = 'due_months' in params ? params.due_months : selectedDueMonths;
      if (months && months.length > 0) {
        queryParams.due_months = Array.isArray(months) ? months.join(',') : months;
      }

      const response = await schemesAPI.getMembers(queryParams);
      const resultData = response.data.data || {};

      // Natural-numeric sort so 101 < 102 < 1011 < 1012, not alphabetical
      const members = (resultData.members || []).sort((a, b) =>
        (a.Fund_Number || '').localeCompare(b.Fund_Number || '', undefined, { numeric: true }),
      );

      setData(members);

      if (resultData.pagination) {
        setPagination((prev) => ({
          ...prev,
          current: resultData.pagination.currentPage,
          total: resultData.pagination.totalRecords,
          pageSize: resultData.pagination.pageSize || prev.pageSize,
        }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchMembers({ page: 1, fund_number: fundNumber });
  };

  const handleReset = () => {
    setFundNumber("");
    setSelectedScheme(null);
    setSelectedCustomer(null);
    setSelectedDueMonths([]);
    setSelectedRowKeys([]);
    fetchMembers({
      page: 1,
      fund_number: "",
      scheme_id: null,
      customer_id: null,
      due_months: [],
    });
  };

  const handleTableChange = (newPagination) => {
    setPagination((prev) => ({ ...prev, pageSize: newPagination.pageSize }));
    fetchMembers({
      page: newPagination.current,
      limit: newPagination.pageSize,
    });
  };

  // Customer search handler for remote select
  const handleCustomerSearch = async (val) => {
    if (val) {
      const res = await customersAPI.getAll({ search: val });
      // API returns { success: true, data: { customers: [], ... } }
      // Fix: Access res.data.data.customers
      setCustomers(res.data.data?.customers || []);
    }
  };

  const handleToggleStatus = (record) => {
    const newStatus = record.Status === "Active" ? "Inactive" : "Active";
    Modal.confirm({
      title: `Set member ${newStatus}?`,
      content: `Change ${record.Customer_Name || record.Customer_ID} (Fund: ${record.Fund_Number}) to ${newStatus}?`,
      okText: `Yes, set ${newStatus}`,
      okType: newStatus === "Inactive" ? "danger" : "primary",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await schemesAPI.updateMemberStatus(record.Customer_ID, record.Scheme_ID, newStatus);
          // Optimistically update local data without full reload
          setData((prev) =>
            prev.map((item) =>
              item.Customer_ID === record.Customer_ID && item.Scheme_ID === record.Scheme_ID
                ? { ...item, Status: newStatus }
                : item,
            ),
          );
        } catch (err) {
          console.error("Failed to update status", err);
        }
      },
    });
  };

  // Manual reminder trigger
  // General "current-month" reminder — sends to ALL active members with
  // unpaid dues in the current month. Independent of the table filter.
  const handleSendReminders = async () => {
    Modal.confirm({
      title: "Send current-month reminder to ALL?",
      content:
        "Sends a WhatsApp reminder to every active member with unpaid dues for the current month.",
      okText: "Yes, Send",
      cancelText: "Cancel",
      onOk: async () => {
        setReminderLoading(true);
        try {
          const response = await remindersAPI.sendManualReminders({
            months_overdue: 1,
          });
          const d = response.data?.data || response.data || {};
          message.success(`Sent: ${d.success ?? 0}, Failed: ${d.failed ?? 0}`);
        } catch (error) {
          console.error("Failed to send reminders:", error);
        } finally {
          setReminderLoading(false);
        }
      },
    });
  };

  // Requested Order: Fund No, Customer Code, Customer Name, Phone, Scheme, Monthly Amt, Bonus, Total, Status
  // Removed: Maturity Amount
  const columns = [
    {
      title: "Fund Number",
      dataIndex: "Fund_Number",
      key: "Fund_Number",
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Customer Code",
      dataIndex: "Customer_Code",
      key: "Customer_Code",
      render: (text) => text || "-",
    },
    {
      title: "Customer Name",
      dataIndex: "Customer_Name",
      key: "Customer_Name",
    },
    {
      title: "Phone",
      dataIndex: "Phone_Number",
      key: "Phone_Number",
    },
    {
      title: "Scheme",
      dataIndex: "Scheme_Name",
      key: "Scheme_Name",
    },
    {
      title: "Monthly Amt",
      dataIndex: "Amount_per_month",
      key: "Amount_per_month",
      render: (amt) => `₹${amt}`,
    },
    {
      title: "Bonus",
      dataIndex: "Bonus_Amount",
      key: "Bonus_Amount",
      render: (amt) => (amt ? `₹${parseFloat(amt).toFixed(2)}` : "₹0.00"),
    },
    {
      title: "Total Amount",
      dataIndex: "Total_Amount",
      key: "Total_Amount",
      render: (amt) => `₹${amt}`,
    },
    {
      title: "Status",
      dataIndex: "Status",
      key: "Status",
      render: (status) => (
        <Tag color={status === "Active" ? "green" : "red"}>
          {status || "Active"}
        </Tag>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => {
        const isActive = (record.Status || "Active") === "Active";
        return (
          <Space size="small" wrap>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditCustomer(record.Customer_ID)}
              title="Edit Customer"
            />
            <Button
              size="small"
              icon={<WhatsAppOutlined />}
              style={{ color: '#25D366', borderColor: '#25D366' }}
              onClick={() => sendReminderForCustomer(record)}
              title={
                selectedDueMonths.length > 0
                  ? `Send WhatsApp reminder for ${selectedDueMonths.length} selected month(s)`
                  : "Send WhatsApp reminder for current month"
              }
            />
            <Button
              size="small"
              type={isActive ? "default" : "primary"}
              danger={isActive}
              onClick={() => handleToggleStatus(record)}
            >
              {isActive ? "Set Inactive" : "Set Active"}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="page-container scheme-members-container">
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
        <h2 className="page-title" style={{ margin: 0 }}>Fund Scheme Report</h2>
        <Space wrap>
          <Button
            icon={<WhatsAppOutlined />}
            onClick={handleSendReminders}
            loading={reminderLoading}
          >
            Current-Month Reminder (All)
          </Button>
        </Space>
      </div>

      <div style={{ background: '#fafafa', padding: 12, borderRadius: 6, marginBottom: 16 }}>
        <Row gutter={[12, 8]} align="middle">
          <Col xs={24} md={14}>
            <Select
              mode="multiple"
              allowClear
              style={{ width: '100%' }}
              placeholder="Filter by unpaid months — pick one or more"
              options={monthOptions}
              value={selectedDueMonths}
              onChange={(vals) => {
                setSelectedDueMonths(vals || []);
                setSelectedRowKeys([]);
                fetchMembers({ page: 1, due_months: vals || [] });
              }}
              maxTagCount="responsive"
              popupClassName="bright-highlight"
            />
          </Col>
          <Col xs={24} md={10} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Typography.Text type="secondary">
                {selectedRowKeys.length > 0
                  ? `${selectedRowKeys.length} selected`
                  : "Select rows to target"}
              </Typography.Text>
              <Button
                type="primary"
                icon={<WhatsAppOutlined />}
                disabled={selectedRowKeys.length === 0}
                loading={reminderLoading}
                onClick={handleSendTargeted}
                style={{ background: '#25D366', borderColor: '#25D366' }}
              >
                Send to Selected
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <div className="filter-section">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={6}>
            <Input
              placeholder="Fund Number (e.g. 001)"
              value={fundNumber}
              onChange={(e) => setFundNumber((e.target.value || "").toUpperCase())}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col xs={24} sm={6}>
            {/* Scheme filter */}
            <Select
              showSearch
              optionFilterProp="children"
              placeholder="Filter by Scheme"
              style={{ width: "100%" }}
              allowClear
              value={selectedScheme}
              onChange={setSelectedScheme}
              popupClassName="bright-highlight"
            >
              {schemes.map((s) => (
                <Option key={s.Scheme_ID} value={s.Scheme_ID}>
                  {s.Name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            {/* Modified Search to include Code, ID, Name only */}
            <Select
              showSearch
              placeholder="Select Customer (Code / ID / Name)"
              style={{ width: "100%" }}
              allowClear
              value={selectedCustomer}
              onChange={setSelectedCustomer}
              onSearch={handleCustomerSearch}
              filterOption={false}
              notFoundContent={null}
              popupClassName="bright-highlight"
            >
              {customers.map((c) => (
                <Option key={c.Customer_ID} value={c.Customer_ID}>
                  {c.Customer_Code ? `${c.Customer_Code} - ` : ""}
                  {c.Customer_ID} - {c.Name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Space>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
              >
                Search
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                Reset
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="Fund_Number"
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          preserveSelectedRowKeys: true,
        }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
        }}
        onChange={handleTableChange}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: "No records found" }}
      />

      <Modal
        title={editingCustomer ? `Edit Customer - ${editingCustomer.Customer_ID}` : "Edit Customer"}
        open={editModalVisible}
        onCancel={() => { setEditModalVisible(false); setEditingCustomer(null); }}
        onOk={() => editForm.submit()}
        okText="Update"
        width="80%"
        forceRender
      >
        <Form form={editForm} layout="vertical" onFinish={submitEditCustomer}>
          <Row gutter={[16, 8]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="Customer_ID" label="Customer ID">
                <Input readOnly style={{ textTransform: "uppercase" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="Customer_Code"
                label="Customer Code"
                normalize={(v) => (v ? v.toUpperCase() : v)}
                rules={[{ required: true, message: "Customer Code is required." }]}
              >
                <Input style={{ textTransform: "uppercase" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="Name" label="Name" normalize={(v) => (v ? v.toUpperCase() : v)}>
                <Input style={{ textTransform: "uppercase" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="PhoneNumber" label="Phone Number" rules={[{ required: true }]}>
                <Input type="number" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="PhoneNumber2" label="Secondary Phone">
                <Input type="number" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="Customer_Type" label="Customer Type">
                <Select allowClear popupClassName="bright-highlight">
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
            <Col xs={24} sm={12}>
              <Form.Item name="Address1" label="Address Line 1" normalize={(v) => (v ? v.toUpperCase() : v)}>
                <Input style={{ textTransform: "uppercase" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="Address2" label="Address Line 2" normalize={(v) => (v ? v.toUpperCase() : v)}>
                <Input style={{ textTransform: "uppercase" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="State_ID" label="State">
                <Select
                  showSearch
                  optionFilterProp="children"
                  allowClear
                  popupClassName="bright-highlight"
                  onChange={(v) => { setSelectedState(v); editForm.setFieldsValue({ District_ID: null }); }}
                >
                  {states.map((s) => (
                    <Option key={s.State_ID} value={s.State_ID}>{s.State_Name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="District_ID" label="District">
                <Select
                  showSearch
                  optionFilterProp="children"
                  allowClear
                  disabled={!selectedState}
                  popupClassName="bright-highlight"
                >
                  {districts
                    .filter((d) => d.State_ID === selectedState)
                    .map((d) => (
                      <Option key={d.District_ID} value={d.District_ID}>{d.District_Name}</Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="Pincode" label="Pincode">
                <Input type="number" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="Reference_Code" label="Reference Code" normalize={(v) => (v ? v.toUpperCase() : v)}>
                <Input style={{ textTransform: "uppercase" }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default SchemeMembers;
