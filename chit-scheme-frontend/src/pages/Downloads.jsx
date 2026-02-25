import React from "react";
import { Tabs } from "antd";
import { DownloadOutlined } from "@ant-design/icons";

import CustomerDownload from "../components/downloads/CustomerDownload";
import PaymentDownload from "../components/downloads/PaymentDownload";
import SchemeDownload from "../components/downloads/SchemeDownload";
import OrderDownload from "../components/downloads/OrderDownload";
import "./css/Downloads.css";

const Downloads = () => {
  return (
    <div className="page-container downloads-container">
      <div className="page-header-row">
        <h2 className="page-title">
          <DownloadOutlined /> Download Data
        </h2>
      </div>

      <div className="downloads-wrapper">
        <p style={{ marginBottom: 24, color: "#666" }}>
          Filter and export data in CSV format. CSV files can be opened in Excel
          or any spreadsheet application.
        </p>

        <Tabs
          defaultActiveKey="customers"
          type="card"
          size="large"
          items={[
            {
              label: "Customers",
              key: "customers",
              children: <CustomerDownload />,
            },
            {
              label: "Payments",
              key: "payments",
              children: <PaymentDownload />,
            },
            {
              label: "Schemes",
              key: "schemes",
              children: <SchemeDownload />,
            },
            {
              label: "Order Tracking",
              key: "orders",
              children: <OrderDownload />,
            },
          ]}
        />
      </div>
    </div>
  );
};

export default Downloads;
