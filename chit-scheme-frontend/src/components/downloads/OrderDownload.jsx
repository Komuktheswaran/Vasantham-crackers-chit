import React, { useState } from "react";
import {
  Card,
  Select,
  Input,
  Button,
  Table,
  message,
  Space,
  DatePicker,
  Statistic,
} from "antd";
import {
  DownloadOutlined,
  EyeOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { orderTrackingAPI, exportsAPI } from "../../services/api";
import dayjs from "dayjs";

const { Option } = Select;

const OrderDownload = () => {
  const [filters, setFilters] = useState({
    date_from: null,
    date_to: null,
    source: null,
    search: "",
  });

  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recordCount, setRecordCount] = useState(0);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      date_from: null,
      date_to: null,
      source: null,
      search: "",
    });
    setPreviewData([]);
    setRecordCount(0);
  };

  const handleSingleDateChange = (field) => (date) => {
    setFilters((prev) => ({
      ...prev,
      [field]: date ? date.format("YYYY-MM-DD") : null,
    }));
  };

  const getParams = () => {
    const params = {};
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.source) params.source = filters.source;
    if (filters.search) params.search = filters.search;
    return params;
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const params = getParams();
      const response = await orderTrackingAPI.getAll({ ...params, limit: 10 });
      setPreviewData(response.data.data?.orders || response.data.orders || []);
      setRecordCount(
        response.data.data?.pagination?.totalRecords ||
          response.data.pagination?.totalRecords ||
          0,
      );
    } catch (error) {
      message.error("Failed to preview data");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const params = getParams();
      const response = await exportsAPI.exportOrders(params);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `orders_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();

      message.success("Order data downloaded successfully");
    } catch (error) {
      message.error("Failed to download order data");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "Tracking No",
      dataIndex: "Tracking_Number",
      key: "Tracking_Number",
    },
    { title: "Order No", dataIndex: "Order_Number", key: "Order_Number" },
    { title: "Customer", dataIndex: "Customer_Name", key: "Customer_Name" },
    {
      title: "Received Date",
      dataIndex: "Order_Received_Date",
      key: "Order_Received_Date",
      render: (date) => (date ? new Date(date).toLocaleDateString() : "-"),
    },
    { title: "Amount", dataIndex: "Payment_Amount", key: "Payment_Amount" },
  ];

  return (
    <div>
      <Card title="Filter Orders" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            <DatePicker
              style={{ width: "100%" }}
              value={filters.date_from ? dayjs(filters.date_from) : null}
              onChange={handleSingleDateChange("date_from")}
              placeholder="From Date"
              format="DD-MM-YYYY"
            />
            <DatePicker
              style={{ width: "100%" }}
              value={filters.date_to ? dayjs(filters.date_to) : null}
              onChange={handleSingleDateChange("date_to")}
              placeholder="To Date"
              format="DD-MM-YYYY"
            />

            <Select
              placeholder="Select Source"
              allowClear
              showSearch
              popupClassName="bright-highlight"
              style={{ width: "100%" }}
              value={filters.source}
              onChange={(value) => handleFilterChange("source", value)}
            >
              <Option value="Website">Website</Option>
              <Option value="Whatsapp">Whatsapp</Option>
              <Option value="In Store">In Store</Option>
            </Select>

            <Input
              placeholder="Search Tracking / Order Number / Customer"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", (e.target.value || "").toUpperCase())}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Button
              icon={<EyeOutlined />}
              onClick={handlePreview}
              loading={loading}
            >
              Preview
            </Button>
            <Button icon={<ClearOutlined />} onClick={clearFilters}>
              Clear Filters
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              loading={loading}
            >
              Download CSV
            </Button>
          </div>
        </Space>
      </Card>

      {(previewData.length > 0 || recordCount > 0) && (
        <Card title="Preview" style={{ marginBottom: 16 }}>
          <Statistic
            title="Total Records"
            value={recordCount}
            suffix="orders"
            style={{ marginBottom: 16 }}
          />
          <Table
            dataSource={previewData}
            columns={columns}
            rowKey="Tracking_ID"
            pagination={false}
            size="small"
            scroll={{ x: true }}
          />
          <p style={{ marginTop: 8, color: "#666", fontSize: "12px" }}>
            Showing first 10 records. Download will include all {recordCount}{" "}
            matching records.
          </p>
        </Card>
      )}
    </div>
  );
};

export default OrderDownload;
