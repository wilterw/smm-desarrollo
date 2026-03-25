"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useState } from "react";

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, marginLeft: "260px", display: "flex", flexDirection: "column" }} className="main-content">
        <Header onMenuToggle={() => setSidebarOpen((p) => !p)} />
        <main className="p-6" style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
