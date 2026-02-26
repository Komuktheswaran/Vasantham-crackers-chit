import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Select,
  Spin,
  Typography,
  Modal,
  Table,
  Button,
  message,
  Tag,
} from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { schemesAPI, dashboardAPI } from "../services/api";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import "./css/Reports.css";

const { Option } = Select;
const { Title } = Typography;

const MONTH_MAP = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

const Reports = () => {
  const [stats, setStats] = useState({});
  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [loading, setLoading] = useState(true);

  // Bar click modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalData, setModalData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalType, setModalType] = useState(""); // "paid", "unpaid", "active-schemes", "inactive-schemes"

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schemesRes, monthlyStatsRes] = await Promise.all([
        schemesAPI.getAll(),
        dashboardAPI.getMonthlyStats(selectedYear, null, null),
      ]);

      const schemesData = schemesRes.data.data || schemesRes.data || {};
      const schemesList = Array.isArray(schemesData.schemes)
        ? schemesData.schemes
        : Array.isArray(schemesData)
          ? schemesData
          : [];

      setStats({
        totalSchemes: schemesList.length,
        activeSchemes: schemesList.filter((s) => s.member_count > 0).length,
        totalRevenueEst: schemesList.reduce(
          (sum, s) => sum + s.Total_Amount * (s.member_count || 0),
          0,
        ),
      });

      const monthlyStatsData =
        monthlyStatsRes.data.data || monthlyStatsRes.data || [];
      setMonthlyData(Array.isArray(monthlyStatsData) ? monthlyStatsData : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle bar click — fetch paid or unpaid customer details
  const handleBarClick = async (barData, barType) => {
    if (!barData || !barData.payload) return;

    const monthName = barData.payload.month;
    const monthNum = MONTH_MAP[monthName];
    if (!monthNum) return;

    const isPaid = barType === "paid";
    setModalType(isPaid ? "paid" : "unpaid");
    setModalTitle(
      isPaid
        ? `Paid Customers — ${monthName} ${selectedYear}`
        : `Unpaid Customers — ${monthName} ${selectedYear}`,
    );
    setModalVisible(true);
    setModalLoading(true);

    try {
      const res = await dashboardAPI.getMonthDetails(selectedYear, monthNum);
      const result = res.data.data || res.data || {};

      if (isPaid) {
        setModalData(result.payments || []);
      } else {
        setModalData(result.dues || []);
      }
    } catch (error) {
      console.error("Failed to fetch month details:", error);
      message.error("Failed to fetch customer details for this month");
      setModalData([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handlePieClick = async (pieSlice) => {
    const sliceName = pieSlice.name;
    const isActive = sliceName === "Active Schemes";
    setModalType(isActive ? "active-schemes" : "inactive-schemes");
    setModalTitle(isActive ? "Active Schemes" : "Inactive Schemes");
    setModalVisible(true);
    setModalLoading(true);

    try {
      const res = await dashboardAPI.getSchemeDistributionDetails();
      const allSchemes = res.data.data || res.data || [];
      const filtered = allSchemes.filter(
        (s) => s.status === (isActive ? "Active" : "Inactive"),
      );
      setModalData(filtered);
    } catch (error) {
      console.error("Failed to fetch distribution details:", error);
      message.error("Failed to fetch scheme distribution details");
      setModalData([]);
    } finally {
      setModalLoading(false);
    }
  };

  // Download modal data as Excel
  const downloadExcel = () => {
    if (modalData.length === 0) {
      message.warning("No data to download");
      return;
    }

    let exportData;
    if (modalType === "paid") {
      exportData = modalData.map((row) => ({
        "Customer ID": row.Customer_ID,
        "Customer Code": row.Customer_Code || "-",
        "Customer Name": row.customer_name,
        "Scheme Name": row.scheme_name,
        "Fund Number": row.Fund_Number,
        "Due Number": row.Due_number,
        "Amount Received": row.Amount_Received,
        "Payment Mode": row.Payment_Mode || "Cash",
        "Payment Date": row.Amount_Received_date
          ? dayjs(row.Amount_Received_date).format("DD-MM-YYYY")
          : "-",
        "Ref No": row.Payment_Transaction_ID || row.Transaction_ID || "-",
      }));
    } else if (modalType === "unpaid") {
      exportData = modalData.map((row) => ({
        "Customer ID": row.Customer_ID,
        "Customer Code": row.Customer_Code || "-",
        "Customer Name": row.customer_name,
        "Scheme Name": row.scheme_name,
        "Fund Number": row.Fund_Number,
        "Due Number": row.Due_number,
        "Due Amount": row.Due_amount,
        "Pending Amount": row.pending_amount,
        "Due Date": row.Due_date
          ? dayjs(row.Due_date).format("DD-MM-YYYY")
          : "-",
      }));
    } else {
      // Scheme distribution export
      exportData = modalData.map((row) => ({
        "Scheme ID": row.Scheme_ID,
        "Scheme Name": row.scheme_name,
        "Total Members": row.total_members,
        "Paid Members": row.paid_members,
        "Unpaid Members": row.unpaid_members,
        Status: row.status,
      }));
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    let sheetName = "Data";
    if (modalType === "paid") sheetName = "Paid";
    else if (modalType === "unpaid") sheetName = "Unpaid";
    else sheetName = "Schemes";

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(
      wb,
      `${modalType}_${modalTitle.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`,
    );
  };

  // Table columns for paid customers
  const paidColumns = [
    {
      title: "Customer ID",
      dataIndex: "Customer_ID",
      key: "Customer_ID",
      width: 100,
    },
    {
      title: "Customer Code",
      dataIndex: "Customer_Code",
      key: "Customer_Code",
      width: 120,
      render: (text) => text || "-",
    },
    {
      title: "Customer Name",
      dataIndex: "customer_name",
      key: "customer_name",
    },
    { title: "Scheme", dataIndex: "scheme_name", key: "scheme_name" },
    {
      title: "Fund No.",
      dataIndex: "Fund_Number",
      key: "Fund_Number",
      width: 100,
    },
    { title: "Due No.", dataIndex: "Due_number", key: "Due_number", width: 80 },
    {
      title: "Amount",
      dataIndex: "Amount_Received",
      key: "Amount_Received",
      width: 100,
      render: (val) => `₹${parseFloat(val || 0).toLocaleString()}`,
    },
    {
      title: "Mode",
      dataIndex: "Payment_Mode",
      key: "Payment_Mode",
      width: 90,
      render: (val) => val || "Cash",
    },
    {
      title: "Date",
      dataIndex: "Amount_Received_date",
      key: "Amount_Received_date",
      width: 110,
      render: (val) => (val ? dayjs(val).format("DD-MM-YYYY") : "-"),
    },
    {
      title: "Payment Transaction ID",
      dataIndex: "Payment_Transaction_ID",
      key: "Payment_Transaction_ID",
      width: 120,
      render: (val, record) => val || record.Transaction_ID || "-",
    },
  ];

  // Table columns for unpaid customers
  const unpaidColumns = [
    {
      title: "Customer ID",
      dataIndex: "Customer_ID",
      key: "Customer_ID",
      width: 100,
    },
    {
      title: "Customer Code",
      dataIndex: "Customer_Code",
      key: "Customer_Code",
      width: 120,
      render: (text) => text || "-",
    },
    {
      title: "Customer Name",
      dataIndex: "customer_name",
      key: "customer_name",
    },
    { title: "Scheme", dataIndex: "scheme_name", key: "scheme_name" },
    {
      title: "Fund No.",
      dataIndex: "Fund_Number",
      key: "Fund_Number",
      width: 100,
    },
    { title: "Due No.", dataIndex: "Due_number", key: "Due_number", width: 80 },
    {
      title: "Due Amount",
      dataIndex: "Due_amount",
      key: "Due_amount",
      width: 110,
      render: (val) => `₹${parseFloat(val || 0).toLocaleString()}`,
    },
    {
      title: "Pending",
      dataIndex: "pending_amount",
      key: "pending_amount",
      width: 110,
      render: (val) => (
        <span
          style={{ color: "var(--danger-color, #ff4d4f)", fontWeight: 600 }}
        >
          ₹{parseFloat(val || 0).toLocaleString()}
        </span>
      ),
    },
    {
      title: "Due Date",
      dataIndex: "Due_date",
      key: "Due_date",
      width: 110,
      render: (val) => (val ? dayjs(val).format("DD-MM-YYYY") : "-"),
    },
  ];

  // Table columns for scheme distribution details
  const distributionColumns = [
    {
      title: "Scheme ID",
      dataIndex: "Scheme_ID",
      key: "Scheme_ID",
      width: 100,
    },
    { title: "Scheme Name", dataIndex: "scheme_name", key: "scheme_name" },
    {
      title: "Total Members",
      dataIndex: "total_members",
      key: "total_members",
      width: 130,
    },
    {
      title: "Paid Members",
      dataIndex: "paid_members",
      key: "paid_members",
      width: 130,
    },
    {
      title: "Unpaid Members",
      dataIndex: "unpaid_members",
      key: "unpaid_members",
      width: 130,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (val) => (
        <Tag color={val === "Active" ? "green" : "red"}>{val}</Tag>
      ),
    },
  ];

  const pieData = [
    { name: "Active Schemes", value: stats.activeSchemes || 0 },
    {
      name: "Inactive Schemes",
      value: (stats.totalSchemes || 0) - (stats.activeSchemes || 0),
    },
  ];

  // Generate year options
  const currentYear = dayjs().year();
  const years = [
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1,
  ];

  if (loading)
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );

  return (
    <div className="page-container">
      <Title level={2} className="page-title mb-24">
        Reports & Analytics
      </Title>

      <Row gutter={[24, 24]} className="mb-24">
        <Col span={24}>
          <Card
            title="Monthly Payment Overview"
            extra={
              <Select
                value={selectedYear}
                onChange={setSelectedYear}
                style={{ width: 100 }}
                showSearch
                optionFilterProp="children"
                classNames={{ popup: { root: "bright-highlight" } }}
              >
                {years.map((y) => (
                  <Option key={y} value={y}>
                    {y}
                  </Option>
                ))}
              </Select>
            }
          >
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              💡 Click on any bar to view customer details
            </p>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={monthlyData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-color)"
                />
                <XAxis dataKey="month" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-color)",
                    color: "var(--text-main)",
                  }}
                  cursor={{ fill: "rgba(255, 255, 255, 0.1)" }}
                />
                <Legend wrapperStyle={{ color: "var(--text-main)" }} />
                <Bar
                  dataKey="payments"
                  fill="#3b82f6"
                  name="Payments Received"
                  radius={[4, 4, 0, 0]}
                  onClick={(data) => handleBarClick(data, "paid")}
                  style={{ cursor: "pointer" }}
                />
                <Bar
                  dataKey="due"
                  fill="#f59e0b"
                  name="Pending Dues"
                  radius={[4, 4, 0, 0]}
                  onClick={(data) => handleBarClick(data, "unpaid")}
                  style={{ cursor: "pointer" }}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={12} lg={10}>
          <Card title="Scheme Distribution">
            <div
              style={{
                height: 350,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    onClick={handlePieClick}
                    style={{ cursor: "pointer" }}
                  >
                    <Cell key="active" fill="#10b981" />
                    <Cell key="inactive" fill="#f43f5e" />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-card)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-main)",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ color: "var(--text-main)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12} lg={14}>
          <Card title="Summary Statistics" style={{ height: "100%" }}>
            <Row gutter={[16, 24]}>
              <Col span={12}>
                <div style={{ textAlign: "center" }}>
                  <Typography.Text type="secondary">
                    Total Schemes
                  </Typography.Text>
                  <Title
                    level={3}
                    style={{ margin: "8px 0", color: "var(--primary-color)" }}
                  >
                    {stats.totalSchemes || 0}
                  </Title>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ textAlign: "center" }}>
                  <Typography.Text type="secondary">Active</Typography.Text>
                  <Title
                    level={3}
                    style={{ margin: "8px 0", color: "var(--secondary-color)" }}
                  >
                    {stats.activeSchemes || 0}
                  </Title>
                </div>
              </Col>
              <Col span={24}>
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <Typography.Text type="secondary">
                    Total Estimated Revenue
                  </Typography.Text>
                  <Title
                    level={3}
                    style={{ margin: "8px 0", color: "var(--text-main)" }}
                  >
                    ₹ {(stats.totalRevenueEst || 0).toLocaleString()}
                  </Title>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Bar Click Detail Modal */}
      <Modal
        title={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingRight: 24,
            }}
          >
            <span>{modalTitle}</span>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={downloadExcel}
              disabled={modalData.length === 0}
              size="small"
            >
              Download Excel
            </Button>
          </div>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setModalData([]);
        }}
        footer={null}
        width="90%"
        style={{ top: 40 }}
        styles={{ body: { maxHeight: "70vh", overflow: "auto" } }}
      >
        <Table
          columns={
            modalType === "paid"
              ? paidColumns
              : modalType === "unpaid"
                ? unpaidColumns
                : distributionColumns
          }
          dataSource={modalData}
          loading={modalLoading}
          rowKey={(record, index) =>
            `${record.Customer_ID || record.Scheme_ID}_${record.Scheme_ID || record.scheme_name}_${record.Due_number || index}`
          }
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showTotal: (total) => `Total: ${total} records`,
          }}
          scroll={{ x: 900 }}
          size="small"
          summary={() => {
            if (modalData.length === 0 || modalType.includes("schemes"))
              return null;
            return (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell
                    index={0}
                    colSpan={modalType === "paid" ? 6 : 6}
                  >
                    <strong>Total ({modalData.length} records)</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <strong
                      style={{
                        color:
                          modalType === "paid"
                            ? "var(--secondary-color, #52c41a)"
                            : "var(--danger-color, #ff4d4f)",
                      }}
                    >
                      ₹
                      {modalData
                        .reduce(
                          (sum, r) =>
                            sum +
                            parseFloat(
                              modalType === "paid"
                                ? r.Amount_Received || 0
                                : r.Due_amount || 0,
                            ),
                          0,
                        )
                        .toLocaleString()}
                    </strong>
                  </Table.Summary.Cell>
                  {modalType === "unpaid" && (
                    <Table.Summary.Cell index={2}>
                      <strong style={{ color: "var(--danger-color, #ff4d4f)" }}>
                        ₹
                        {modalData
                          .reduce(
                            (sum, r) => sum + parseFloat(r.pending_amount || 0),
                            0,
                          )
                          .toLocaleString()}
                      </strong>
                    </Table.Summary.Cell>
                  )}
                  <Table.Summary.Cell
                    index={modalType === "paid" ? 2 : 3}
                    colSpan={2}
                  />
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </Modal>
    </div>
  );
};

export default Reports;
