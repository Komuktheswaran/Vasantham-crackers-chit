import React, { useState, useEffect } from "react";
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
} from "antd";
import { SearchOutlined, ReloadOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { schemesAPI, customersAPI, remindersAPI } from "../services/api";
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
    } catch (error) {
      console.error(error);
    }
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
    fetchMembers({
      page: 1,
      fund_number: "",
      scheme_id: null,
      customer_id: null,
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
  const handleSendReminders = async () => {
    Modal.confirm({
      title: "Send Payment Reminders",
      content: "This will send WhatsApp reminders for the CURRENT MONTH to all active members with pending dues. Do you want to proceed?",
      okText: "Yes, Send",
      cancelText: "Cancel",
      onOk: async () => {
        setReminderLoading(true);
        try {
          const response = await remindersAPI.sendManualReminders();
          // API interceptor shows success message if available
          console.log("Reminders result:", response.data);
          fetchMembers(); // Refresh to see any updates if applicable
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
          <Button
            size="small"
            type={isActive ? "default" : "primary"}
            danger={isActive}
            onClick={() => handleToggleStatus(record)}
          >
            {isActive ? "Set Inactive" : "Set Active"}
          </Button>
        );
      },
    },
  ];

  return (
    <div className="page-container scheme-members-container">
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 className="page-title" style={{ margin: 0 }}>Fund Scheme Report</h2>
        <Button 
          type="primary" 
          icon={<WhatsAppOutlined />} 
          onClick={handleSendReminders}
          loading={reminderLoading}
          style={{ background: '#25D366', borderColor: '#25D366' }}
        >
          Send WhatsApp Reminders
        </Button>
      </div>

      <div className="filter-section">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={6}>
            <Input
              placeholder="Fund Number (e.g. 001)"
              value={fundNumber}
              onChange={(e) => setFundNumber(e.target.value)}
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
        pagination={{
          ...pagination,
          showSizeChanger: true,
        }}
        onChange={handleTableChange}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: "No records found" }}
      />
    </div>
  );
};

export default SchemeMembers;
