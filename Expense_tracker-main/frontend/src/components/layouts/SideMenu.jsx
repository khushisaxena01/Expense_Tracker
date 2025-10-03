import React, { useContext, useEffect, useState } from "react";
import { SIDE_MENU_DATA } from "../../utils/data";
import { UserContext } from "../../context/userContext";
import { useNavigate, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import CharAvatar from "../Cards/CharAvatar";

const SideMenu = ({ onClose, isPermanent = false }) => {
  const { user, clearUser } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isPermanent) {
      const timer = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(timer);
    }
  }, [isPermanent]);

  const handleClick = (route) => {
    if (route === "logout") {
      handleLogout();
      return;
    }
    navigate(route);
    if (!isPermanent) closeWithTransition();
  };

  const handleLogout = () => {
    localStorage.clear();
    clearUser();
    navigate("/login");
    if (!isPermanent) closeWithTransition();
  };

  const closeWithTransition = () => {
    setVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 800);
  };

  const menuClassNames = isPermanent
    ? "bg-[#111] h-full w-64 px-5 py-6 relative after:content-[''] after:absolute after:top-0 after:right-0 after:w-[2px] after:h-full after:bg-gradient-to-b after:from-red-700 after:to-blue-700"
    : `fixed top-16 left-0 w-64 h-[calc(100vh-64px)] z-50 bg-black/40 backdrop-blur-xl p-6 text-white shadow-lg transition-transform duration-500 ${
        visible ? "translate-x-0" : "-translate-x-full"
      }`;

  return (
    <div
      className={menuClassNames}
      onClick={!isPermanent ? closeWithTransition : undefined}
    >
      {!isPermanent && (
        <button
          className="absolute top-4 right-4 text-red-600"
          onClick={closeWithTransition}
        >
          <X className="w-6 h-6" />
        </button>
      )}

      <div className="flex flex-col items-center mb-6 mt-4">
        {user?.profileImageUrl ? (
          <img
            src={user.profileImageUrl}
            alt="Profile"
            className="w-16 h-16 rounded-full border-2 border-white"
          />
        ) : (
          <CharAvatar
            fullName={user?.fullName}
            width="w-20"
            height="h-20"
            style="text-xl"
          />
        )}
        <h5 className="mt-2 text-lg font-semibold">
          {user?.fullName || "Guest"}
        </h5>
      </div>

      <div>
        {SIDE_MENU_DATA.map((item, idx) => {
          const isActive = location.pathname === item.path;

          return (
            <button
              key={idx}
              className={`w-full flex items-center gap-4 text-[15px] px-4 py-3 rounded-lg mb-2 transition-all
                ${item.label === "LogOut" ? "text-red-500 hover:bg-gray-700 hover:border hover:border-red-500 transition-transform duration-700" : ""}
                ${isActive && item.label !== "LogOut"
                  ? "bg-red-600 text-white"
                  : item.label !== "LogOut" && "hover:bg-gray-700 text-white hover:border hover:border-white transition-transform duration-700"
                }`}
              onClick={() => handleClick(item.path)}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SideMenu;
