import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

const Modal = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
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
    <div className="absolute right-8 top-8 z-30 w-half max-w-md">
      <div
        ref={modalRef}
        className="bg-gradient-to-br from-green-800 to-emerald-700 text-white rounded-3xl shadow-lg p-5 border border-black animate-fadeInUp"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="hover:text-red-600 transition">
            <X size={25} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
