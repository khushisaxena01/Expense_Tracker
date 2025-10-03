import React from 'react';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';

const CustomLineChart = ({ data }) => {
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white shadow-md rounded-xl p-3 border border-gray-200">
          <p className="text-xs font-semibold text-red-600 mb-1">
            {payload[0].payload.category}
          </p>
          <p className="text-sm text-gray-600">
            Amount:{' '}
            <span className="text-sm font-bold text-gray-900">
              ₹{payload[0].payload.amount}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          {/* Light gray grid lines to show clearly over red background */}
          <CartesianGrid stroke="#ffffff22" strokeDasharray="3 3" />

          <XAxis
            dataKey="month"
            tick={{ fontSize: 13, fill: '#f8fafc', fontWeight: '500' }}
            axisLine={{ stroke: '#f8fafc' }}
            tickLine={{ stroke: '#f8fafc' }}
          />
          <YAxis
            tick={{ fontSize: 13, fill: '#f8fafc', fontWeight: '500' }}
            axisLine={{ stroke: '#f8fafc' }}
            tickLine={{ stroke: '#f8fafc' }}
          />
          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="amount"
            stroke="#2563eb"
            fill="url(#blueGradient)"
            strokeWidth={3}
            dot={{ r: 4, fill: '#2563eb' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CustomLineChart;
