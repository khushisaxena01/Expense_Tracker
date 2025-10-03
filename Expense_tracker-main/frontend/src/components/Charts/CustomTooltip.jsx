import React from "react";

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length > 0) {
    const { name, value, fill } = payload[0];

    return (
      <div
        className="p-2 rounded-md shadow-md"
        style={{
          backgroundColor: "#2c2c2c",
          border: `1px solid ${fill}`,
          color: fill,
          fontSize: "14px",
        }}
      >
        <p className="font-medium">{name}</p>
        <p>₹{value.toLocaleString()}</p>
      </div>
    );
  }

  return null;
};

export default CustomTooltip;
