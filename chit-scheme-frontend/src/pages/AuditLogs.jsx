import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Tag,
  Row,
  Col,
  Drawer,
  Typography,
  message,
} from "antd";
import { SearchOutlined, ReloadOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { auditLogsAPI } from "../services/api";

const { Option } = Select;
const { Text } = Typography;

const statusColor = (code) => {
  if (code >= 500) return "red";
  if (code >= 400) return "orange";
  if (code >= 300) return "geekblue";
  if (code >= 200) return "green";
  return "default";
};

const AuditLogs = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  const [filters, setFilters] = useState({
    user: "",
    endpoint: "",
    method: null,
    status: "",
    ip: "",
    date_from: null,
    date_to: null,
  });
  const [drawerLog, setDrawerLog] = useState(null);

  const fetchLogs = useCallback(async (overrides = {}) => {
    setLoading(true);
    try {
      const merged = { ...filters, ...overrides };
      const params = {
        page: overrides.page ?? pagination.current,
        limit: overrides.limit ?? pagination.pageSize,
      };
      if (merged.user) params.user = merged.user;
      if (merged.endpoint) params.endpoint = merged.endpoint;
      if (merged.method) params.method = merged.method;
      if (merged.status) params.status = merged.status;
      if (merged.ip) params.ip = merged.ip;
      if (merged.date_from) params.date_from = merged.date_from.format("YYYY-MM-DD HH:mm:ss");
      if (merged.date_to) params.date_to = merged.date_to.format("YYYY-MM-DD HH:mm:ss");

      const res = await auditLogsAPI.getAll(params);
      const result = res.data?.data || res.data || {};
      setData(result.logs || []);
      setPagination((prev) => ({
        ...prev,
        current: result.pagination?.currentPage || prev.current,
        pageSize: result.pagination?.pageSize || prev.pageSize,
        total: result.pagination?.totalRecords || 0,
      }));
    } catch (err) {
      console.error("Audit logs fetch failed", err);
      message.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.current, pagination.pageSize]);

  useEffect(() => {
    fetchLogs({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => fetchLogs({ page: 1 });

  const handleReset = () => {
    const cleared = {
      user: "",
      endpoint: "",
      method: null,
      status: "",
      ip: "",
      date_from: null,
      date_to: null,
    };
    setFilters(cleared);
    fetchLogs({ ...cleared, page: 1 });
  };

  const handleTableChange = (p) => {
    fetchLogs({ page: p.current, limit: p.pageSize });
  };

  const columns = [
    {
      title: "Time",
      dataIndex: "Timestamp",
      width: 170,
      render: (v) => (v ? dayjs(v).format("DD-MM-YYYY HH:mm:ss") : "-"),
    },
    { title: "User", dataIndex: "User_Name", width: 140 },
    {
      title: "Method",
      dataIndex: "Action_Type",
      width: 90,
      render: (v) => <Tag>{v}</Tag>,
    },
    {
      title: "Endpoint",
      dataIndex: "Endpoint",
      ellipsis: true,
    },
    {
      title: "Status",
      dataIndex: "Status_Code",
      width: 90,
      render: (v) => <Tag color={statusColor(v)}>{v}</Tag>,
    },
    { title: "IP", dataIndex: "IP_Address", width: 130 },
    {
      title: "",
      width: 60,
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setDrawerLog(record)}
          title="View payload"
        />
      ),
    },
  ];

  return (
    <div className="page-container">
      <h2 className="page-title" style={{ marginBottom: 16 }}>Audit Logs</h2>

      <div style={{ background: "#fafafa", padding: 12, borderRadius: 6, marginBottom: 16 }}>
        <Row gutter={[8, 8]}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="User name"
              value={filters.user}
              onChange={(e) => setFilters((f) => ({ ...f, user: e.target.value }))}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Endpoint contains…"
              value={filters.endpoint}
              onChange={(e) => setFilters((f) => ({ ...f, endpoint: e.target.value }))}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col xs={12} sm={8} md={3}>
            <Select
              placeholder="Method"
              allowClear
              style={{ width: "100%" }}
              value={filters.method}
              onChange={(v) => setFilters((f) => ({ ...f, method: v }))}
              popupClassName="bright-highlight"
            >
              <Option value="GET">GET</Option>
              <Option value="POST">POST</Option>
              <Option value="PUT">PUT</Option>
              <Option value="DELETE">DELETE</Option>
              <Option value="PATCH">PATCH</Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} md={3}>
            <Input
              placeholder="Status code"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              onPressEnter={handleSearch}
              type="number"
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="IP"
              value={filters.ip}
              onChange={(e) => setFilters((f) => ({ ...f, ip: e.target.value }))}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <DatePicker
              showTime
              style={{ width: "100%" }}
              placeholder="From"
              value={filters.date_from}
              onChange={(v) => setFilters((f) => ({ ...f, date_from: v }))}
              format="DD-MM-YYYY HH:mm"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <DatePicker
              showTime
              style={{ width: "100%" }}
              placeholder="To"
              value={filters.date_to}
              onChange={(v) => setFilters((f) => ({ ...f, date_to: v }))}
              format="DD-MM-YYYY HH:mm"
            />
          </Col>
          <Col xs={24} md={12} style={{ textAlign: "right" }}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>Reset</Button>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                Search
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="Log_ID"
        loading={loading}
        size="small"
        pagination={{
          ...pagination,
          showSizeChanger: true,
          pageSizeOptions: ["20", "50", "100", "200"],
        }}
        onChange={handleTableChange}
        scroll={{ x: "max-content" }}
      />

      <Drawer
        title={drawerLog ? `Log #${drawerLog.Audit_ID}` : "Log details"}
        open={!!drawerLog}
        onClose={() => setDrawerLog(null)}
        width={520}
      >
        {drawerLog && (
          <div style={{ fontSize: 13 }}>
            <p><Text strong>Time:</Text> {dayjs(drawerLog.Timestamp).format("DD-MM-YYYY HH:mm:ss")}</p>
            <p><Text strong>User:</Text> {drawerLog.User_Name} ({drawerLog.User_ID ?? "—"})</p>
            <p><Text strong>Endpoint:</Text> {drawerLog.Action_Type} {drawerLog.Endpoint}</p>
            <p><Text strong>Status:</Text> <Tag color={statusColor(drawerLog.Status_Code)}>{drawerLog.Status_Code}</Tag></p>
            <p><Text strong>IP:</Text> {drawerLog.IP_Address}</p>
            <p><Text strong>Resource:</Text> {drawerLog.Resource_ID || "—"}</p>
            <p><Text strong>Payload:</Text></p>
            <pre style={{ background: "#f6f8fa", padding: 12, borderRadius: 6, overflow: "auto", fontSize: 12 }}>
              {(() => {
                try { return JSON.stringify(JSON.parse(drawerLog.Payload || "{}"), null, 2); }
                catch { return drawerLog.Payload || "{}"; }
              })()}
            </pre>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default AuditLogs;
