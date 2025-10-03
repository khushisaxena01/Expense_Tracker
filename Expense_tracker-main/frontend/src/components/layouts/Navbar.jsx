import React from 'react';
import { HiOutlineMenu } from 'react-icons/hi';

const Navbar = ({ onToggleSidebar, isSidebarOpen }) => {
  return (
    <div className="fixed top-0 left-0 w-full z-50 bg-white text-black py-4 px-6 shadow-md flex items-center justify-between">
      {/* Mobile Menu Button - Hidden on desktop */}
      <button
        className="lg:hidden text-black p-2 rounded-md hover:bg-gray-200"
        onClick={onToggleSidebar}
      >
        <HiOutlineMenu className="text-2xl" />
      </button>

      {/* Title */}
      <h2 className="text-xl font-bold">Expense Tracker</h2>

      {/* Placeholder to balance spacing */}
      <div className="w-8 lg:hidden" />
    </div>
  );
};

export default Navbar;
