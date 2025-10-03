import React from "react";

const CharAvatar = ({ fullName = "?", width = "w-16", height = "h-16", style = "text-lg" }) => {
  const getInitials = (name) => {
    if (!name) return "?";
    const names = name.trim().split(" ");
    if (names.length === 1) return names[0][0].toUpperCase();
    return (names[0][0] + names[1][0]).toUpperCase();
  };

  return (
    <div
      className={`bg-gray-600 text-white rounded-full flex items-center justify-center 
        border-2 border-white ${width} ${height} ${style}`}
    >
      {getInitials(fullName)}
    </div>
  );
};

export default CharAvatar;
