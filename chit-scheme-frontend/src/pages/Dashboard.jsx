import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Modal,
  Descriptions,
  Input,
  Button,
  message,
  Spin,
  Table,
  Progress,
} from "antd";
import { customersAPI, schemesAPI, dashboardAPI } from "../services/api";
import {
  UserOutlined,
  BarChartOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "./css/Dashboard.css";

const Dashboard = () => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Detail view states
  const [detailData, setDetailData] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailType, setDetailType] = useState(null); // 'customer'
  const [searchCustId, setSearchCustId] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchFundNo, setSearchFundNo] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [customersRes, schemesRes] = await Promise.all([
        customersAPI.getAll({ limit: 1 }), // Minimal data needed
        schemesAPI.getAll(),
      ]);

      const customersData = customersRes.data.data || customersRes.data || {};
      const schemesData = schemesRes.data.data || schemesRes.data || {};

      const schemesList = Array.isArray(schemesData.schemes)
        ? schemesData.schemes
        : Array.isArray(schemesData)
          ? schemesData
          : [];

      // Calculate total fund members from schemes
      const totalFundMembers = schemesList.reduce(
        (sum, scheme) => sum + (scheme.member_count || 0),
        0,
      );

      setStats({
        totalCustomers: customersData.pagination?.totalRecords || 0,
        totalFundMembers: totalFundMembers,
        activeSchemes: schemesList.filter((s) => s.member_count > 0).length,
        activeSchemesList: schemesList, // Pass full list for graph
      });
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (type, value) => {
    if (!value) return;
    setLoading(true);
    try {
      let customerData = null;

      if (type === "fundNo") {
        const res = await customersAPI.getByFundNumber(value);
        const data = res.data.data || res.data || {};
        const customers = data.customers || (Array.isArray(data) ? data : (data.Customer_ID ? [data] : []));

        if (customers && customers.length > 0) {
          const detailRes = await dashboardAPI.getCustomerDetails(
            customers[0].Customer_ID,
          );
          customerData = detailRes.data.data || detailRes.data;
        }
      } else if (type === "custId") {
        // Use new API for code search
        const res = await customersAPI.getByCode(value);
        const data = res.data.data || res.data || {};

        if (data && data.Customer_ID) {
          const detailRes = await dashboardAPI.getCustomerDetails(
            data.Customer_ID,
          );
          customerData = detailRes.data.data || detailRes.data;
        } else {
          message.warning("Customer Code not found");
        }
      } else if (type === "phone") {
        const res = await customersAPI.getAll({ search: value });
        const data = res.data.data || res.data || {};
        const customers = data.customers || (Array.isArray(data) ? data : []);

        if (customers && customers.length > 0) {
          // Ideally filter deeper if multiple match, but taking first for now
          const cust = customers[0];
          const detailRes = await dashboardAPI.getCustomerDetails(
            cust.Customer_ID,
          );
          customerData = detailRes.data.data || detailRes.data;
        } else {
          message.warning("Customer not found");
        }
      }

      if (customerData) {
        setDetailData(customerData);
        setDetailType("customer");
        setModalVisible(true);
      } else {
        message.warning("No details found");
      }
    } catch (error) {
      console.error("Search Error", error);
      message.error("Search failed or not found");
    } finally {
      setLoading(false);
    }
  };

  const renderCustomerDetails = () => {
    if (!detailData || !detailData.customer) return null;
    const { customer, schemes, payments } = detailData;

    const schemeColumns = [
      { title: "Scheme", dataIndex: "Name", key: "name" },
      {
        title: "Progress",
        key: "progress",
        render: (_, record) => {
          const percentage =
            record.total_dues > 0
              ? (record.paid_dues / record.total_dues) * 100
              : 0;
          return <Progress percent={Math.round(percentage)} size="small" />;
        },
      },
      {
        title: "Paid",
        dataIndex: "total_paid_amount",
        key: "paid",
        render: (val) => `₹${val?.toLocaleString()}`,
      },
      {
        title: "Due",
        dataIndex: "total_due_amount",
        key: "due",
        render: (val) => `₹${val?.toLocaleString()}`,
      },
    ];

    const paymentColumns = [
      {
        title: "Date",
        dataIndex: "Amount_Received_date",
        key: "date",
        render: (val) => dayjs(val).format("DD MMM YYYY"),
      },
      { title: "Scheme", dataIndex: "scheme_name", key: "scheme" },
      {
        title: "Amount",
        dataIndex: "Amount_Received",
        key: "amount",
        render: (val) => `₹${val?.toLocaleString()}`,
      },
      { title: "Transaction ID", dataIndex: "Transaction_ID", key: "txn" },
    ];

    return (
      <>
        <Descriptions
          title="Customer Information"
          column={2}
          bordered
          size="small"
        >
          <Descriptions.Item label="Customer ID">
            {customer.Customer_ID}
          </Descriptions.Item>
          <Descriptions.Item label="Name">{customer.Name}</Descriptions.Item>
          <Descriptions.Item label="Phone">
            {customer.Phone_Number}
          </Descriptions.Item>
          <Descriptions.Item label="Alt Phone">
            {customer.Phone_Number2 || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Address" span={2}>
            {[
              customer.Address1,
              customer.Address2,
              customer.District_Name,
              customer.State_Name,
              customer.Pincode,
            ]
              .filter(Boolean)
              .join(", ")}
          </Descriptions.Item>
        </Descriptions>
        <Card title="Schemes" className="mt-16">
          <Table
            dataSource={schemes}
            columns={schemeColumns}
            rowKey="Scheme_ID"
            pagination={false}
          />
        </Card>
        <Card title="Payment History" className="mt-16">
          <Table
            dataSource={payments}
            columns={paymentColumns}
            rowKey="Pay_ID"
            pagination={{ pageSize: 5 }}
          />
        </Card>
      </>
    );
  };

  if (loading && !detailData) {
    // Only full screen load on initial
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <h2 className="page-title mb-24" style={{ marginBottom: "16px" }}>Dashboard</h2>

      <div style={{ height: "16px" }} />

      {/* Search Section */}
      <Card
        className="mb-24 search-section-card"
        title="Quick Search"
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <h4 style={{ marginBottom: 12 }}>Search by Customer Code / ID</h4>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Input
                placeholder="Enter Customer Code or ID"
                value={searchCustId}
                onChange={(e) => setSearchCustId(e.target.value)}
                onPressEnter={() => handleSearch("custId", searchCustId)}
              />
              <Button
                type="primary"
                onClick={() => handleSearch("custId", searchCustId)}
                className="ant-input-search-button"
              >
                Search
              </Button>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <h4 style={{ marginBottom: 12 }}>Search by Phone Number</h4>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Input
                placeholder="Enter Phone Number"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                onPressEnter={() => handleSearch("phone", searchPhone)}
              />
              <Button
                type="primary"
                onClick={() => handleSearch("phone", searchPhone)}
                className="ant-input-search-button"
              >
                Search
              </Button>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <h4 style={{ marginBottom: 12 }}>Search by Fund Number</h4>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Input
                placeholder="Enter Fund Number"
                value={searchFundNo}
                onChange={(e) => setSearchFundNo(e.target.value)}
                onPressEnter={() => handleSearch("fundNo", searchFundNo)}
              />
              <Button
                type="primary"
                onClick={() => handleSearch("fundNo", searchFundNo)}
                className="ant-input-search-button"
              >
                Search
              </Button>
            </div>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card className="glossy-stat-card">
            <Statistic
              title="Total Customers"
              value={stats.totalCustomers}
              className="stat-vibrant-emerald"
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="glossy-stat-card">
            <Statistic
              title="Total Fund Members"
              value={stats.totalFundMembers}
              className="stat-vibrant-blue"
              prefix={<UsergroupAddOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="glossy-stat-card">
            <Statistic
              title="Active Schemes"
              value={stats.activeSchemes}
              className="stat-vibrant-amber"
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title="Customer Details"
        width="100%"
        style={{ top: 20, maxWidth: 900 }}
        onCancel={() => setModalVisible(false)}
        open={modalVisible}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            Close
          </Button>,
        ]}
      >
        <div style={{ maxHeight: "80vh", overflowY: "auto", padding: "10px" }}>
          {detailType === "customer" && renderCustomerDetails()}
        </div>
      </Modal>
    </>
  );
};

export default Dashboard;
