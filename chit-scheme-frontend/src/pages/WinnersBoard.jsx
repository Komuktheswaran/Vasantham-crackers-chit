import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Empty,
  Spin,
  DatePicker,
  Button,
  Statistic,
  Space,
} from "antd";
import { TrophyOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { winnersAPI } from "../services/api";

const { Text } = Typography;

// Visual treatment per place. Order is also the display order within a month.
const PLACE_META = {
  1: { label: "1st Prize", color: "#d4af37" },
  2: { label: "2nd Prize", color: "#9ca3af" },
  3: { label: "3rd Prize", color: "#cd7f32" },
};

const WinnersBoard = () => {
  const [loading, setLoading] = useState(false);
  const [winners, setWinners] = useState([]);
  const [filterMonth, setFilterMonth] = useState(null);

  const fetchWinners = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterMonth ? { month: filterMonth.format("YYYY-MM") } : undefined;
      const res = await winnersAPI.getAll(params);
      setWinners(res.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filterMonth]);

  useEffect(() => {
    fetchWinners();
  }, [fetchWinners]);

  // Group rows into { 'YYYY-MM': [rows...] }, preserving the API's month-desc order.
  const grouped = winners.reduce((acc, row) => {
    (acc[row.Win_Month] = acc[row.Win_Month] || []).push(row);
    return acc;
  }, {});
  const months = Object.keys(grouped);

  return (
    <div className="page-container">
      <div
        className="page-header-row"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 16, flexWrap: "wrap" }}
      >
        <h2 className="page-title" style={{ margin: 0 }}>
          <TrophyOutlined style={{ color: "#d4af37", marginRight: 8 }} />
          Monthly Winners
        </h2>
        <Space wrap>
          <DatePicker
            picker="month"
            value={filterMonth}
            onChange={(d) => setFilterMonth(d)}
            placeholder="Filter by month"
            format="MMMM YYYY"
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={fetchWinners}>
            Refresh
          </Button>
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : months.length === 0 ? (
        <Empty description="No winners declared yet" style={{ padding: 60 }} />
      ) : (
        months.map((month) => {
          const rows = [...grouped[month]].sort((a, b) => a.Place - b.Place);
          return (
            <Card
              key={month}
              title={dayjs(month + "-01").format("MMMM YYYY")}
              style={{ marginBottom: 24 }}
            >
              <Row gutter={[16, 16]}>
                {rows.map((row) => {
                  const meta = PLACE_META[row.Place] || { label: `Place ${row.Place}`, color: "#888" };
                  return (
                    <Col xs={24} md={8} key={row.Winner_ID}>
                      <Card
                        size="small"
                        bordered
                        style={{ borderTop: `3px solid ${meta.color}`, height: "100%" }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                          <TrophyOutlined style={{ color: meta.color, marginRight: 6 }} />
                          {meta.label}
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>
                          {row.Customer_Name || row.Customer_ID}
                        </div>
                        <div style={{ margin: "6px 0" }}>
                          <Tag color="blue">{row.Fund_Number}</Tag>
                          {row.Scheme_Name && <Text type="secondary">{row.Scheme_Name}</Text>}
                        </div>
                        <Tag color="gold" style={{ whiteSpace: "normal", marginTop: 4 }}>
                          {row.Prize}
                        </Tag>
                        {row.Place === 1 && row.Discount_amount != null && (
                          <div style={{ marginTop: 12 }}>
                            <Statistic
                              title="Dues Waived"
                              value={parseFloat(row.Discount_amount)}
                              prefix="₹"
                              valueStyle={{ color: "#cf1322", fontSize: 18 }}
                            />
                          </div>
                        )}
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default WinnersBoard;
