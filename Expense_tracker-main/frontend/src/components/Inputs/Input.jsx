import React, { useState } from "react";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa6";

const Input = ({ value, onChange, placeholder, label, type }) => {
  const [showPassword, setShowPassword] = useState(false);

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div>
      <label className="text-[13px] text-white">{label}</label>

      <div className="input-box rounded-2xl border border-gray-700 p-2 flex items-center">
        <input
          type={type === "password" ? (showPassword ? "text" : "password") : type}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none text-white rounded-lg px-2"
          value={value}
          onChange={onChange}
        />

        {type === "password" && (
          <span onClick={toggleShowPassword} className="cursor-pointer text-white ml-2">
            {showPassword ? <FaRegEye size={22} /> : <FaRegEyeSlash size={22} />}
          </span>
        )}
      </div>
    </div>
  );
};

export default Input;
