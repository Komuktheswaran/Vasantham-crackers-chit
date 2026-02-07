import React, { useState, useEffect } from "react";
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
} from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import { schemesAPI, customersAPI } from "../services/api";
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
      setCustomers(customersRes.data.customers || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMembers = async (params = {}) => {
    setLoading(true);
    try {
      const queryParams = {
        page: params.page || pagination.current,
        limit: params.limit || pagination.pageSize,
        ...params,
      };

      // Only add filters if they have values
      if (fundNumber) queryParams.fund_number = fundNumber;
      if (selectedScheme) queryParams.scheme_id = selectedScheme;
      if (selectedCustomer) queryParams.customer_id = selectedCustomer;

      const response = await schemesAPI.getMembers(queryParams);
      setData(response.data.members || []);
      setPagination({
        ...pagination,
        current: response.data.pagination.currentPage,
        total: response.data.pagination.totalRecords,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    let searchTerm = fundNumber;
    // If user enters just a number (e.g. "001"), prepend default prefix
    if (fundNumber && /^\d+$/.test(fundNumber)) {
      // Assuming default year 2026 as per request "fund/2026/001"
      searchTerm = `fund/2026/${fundNumber.padStart(3, "0")}`;
    }
    fetchMembers({ page: 1, fund_number: searchTerm });
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
    fetchMembers({
      page: newPagination.current,
      limit: newPagination.pageSize,
    });
  };

  // Customer search handler for remote select
  const handleCustomerSearch = async (val) => {
    if (val) {
      const res = await customersAPI.getAll({ search: val });
      setCustomers(res.data.customers);
    }
  };

  // Requested Order: Fund No, Customer Name, Phone, Scheme, Monthly Amt, Bonus, Total, Join Status, Status
  // Removed: Maturity Amount
  const columns = [
    {
      title: "Fund Number",
      dataIndex: "Fund_Number",
      key: "Fund_Number",
      render: (text) => <Tag color="blue">{text}</Tag>,
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
      key: "Bonus_Amount",
      render: (_, record) => {
        const bonus = record.Bonus_Percentage
          ? (record.Total_Amount * record.Bonus_Percentage) / 100
          : 0;
        return (
          <div>
            <div>₹{bonus.toFixed(2)}</div>
            {record.Bonus_Percentage && (
              <small className="text-muted">({record.Bonus_Percentage}%)</small>
            )}
          </div>
        );
      },
    },
    {
      title: "Total Amount",
      dataIndex: "Total_Amount",
      key: "Total_Amount",
      render: (amt) => `₹${amt}`,
    },
    {
      title: "Join Date",
      dataIndex: "Join_date",
      key: "Join_date",
      render: (date) => new Date(date).toLocaleDateString(),
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
  ];

  return (
    <div className="page-container scheme-members-container">
      <div className="page-header-row">
        <h2 className="page-title">Assigned Customer or Fund Scheme Report</h2>
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
        pagination={pagination}
        onChange={handleTableChange}
        scroll={{ x: "max-content" }}
      />
    </div>
  );
};

export default SchemeMembers;
