import React, { useEffect, useRef } from "react";

const ModalExpense = ({ isOpen, onClose, children }) => {
  const popupRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="absolute right-9 top-7 z-50">
      <div
        ref={popupRef}
        className="w-[350px] bg-gradient-to-br from-red-900 to-red-600 border border-red-500 rounded-2xl p-6 shadow-lg"
      >
        {children}
      </div>
    </div>
  );
};

export default ModalExpense;
