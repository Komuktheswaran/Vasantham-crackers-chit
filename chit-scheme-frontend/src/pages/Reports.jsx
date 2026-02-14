import React, { useEffect, useState } from "react";
import { Card, Row, Col, Select, Spin, Typography } from "antd";
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

const { Option } = Select;
const { Title } = Typography;

const Reports = () => {
  const [stats, setStats] = useState({});
  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [loading, setLoading] = useState(true);

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
              >
                {years.map((y) => (
                  <Option key={y} value={y}>
                    {y}
                  </Option>
                ))}
              </Select>
            }
          >
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
                  fill="var(--secondary-color)"
                  name="Payments Received"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="due"
                  fill="var(--warning-color)"
                  name="Pending Dues"
                  radius={[4, 4, 0, 0]}
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
                  >
                    <Cell key="active" fill="var(--secondary-color)" />
                    <Cell key="inactive" fill="var(--danger-color)" />
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
          {/* Placeholder for future specific scheme performance or other stats */}
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
    </div>
  );
};

export default Reports;
