import React, { useContext, useState } from "react";
import { UserContext } from "../../context/userContext";
import Navbar from "./Navbar";
import SideMenu from "./SideMenu";

const DashboardLayout = ({ children, activeMenu }) => {
  const { user } = useContext(UserContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  return (
    <div className="h-screen overflow-hidden bg-black text-white flex flex-col">
      <div className="fixed top-0 w-full z-50">
        <Navbar onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      </div>

      <div className="flex flex-1 pt-16 overflow-hidden">
        <div className="hidden lg:block w-64">
          <SideMenu activeMenu={activeMenu} isPermanent />
        </div>

        {isSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <SideMenu
              activeMenu={activeMenu}
              onClose={() => setIsSidebarOpen(false)}
            />
          </div>
        )}

        <main className="flex-1 overflow-y-scroll no-scrollbar p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
