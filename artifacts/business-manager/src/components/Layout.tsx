import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, ShoppingCart, Receipt, Package,
  BarChart3, Settings, LogOut, PanelLeft, Briefcase
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import ConfirmModal from "@/components/ConfirmModal";

const navLinks = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/sales", icon: ShoppingCart, label: "Sales" },
  { href: "/expenses", icon: Receipt, label: "Expenses" },
  { href: "/inventory", icon: Package, label: "Inventory" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { businessName } = useSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mini, setMini] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const isActive = (href: string) => {
    if (href === "/" || href === "/dashboard") return location === "/" || location === "/dashboard";
    return location.startsWith(href);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 flex flex-col
          bg-sidebar border-r border-sidebar-border
          transition-all duration-300 ease-in-out
          ${mini ? "w-16" : "w-64"}
          lg:static lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header — mini vs full */}
        {mini ? (
          <div className="flex flex-col items-center pt-3 pb-2 gap-2 border-b border-sidebar-border px-2">
            <button
              onClick={() => setMini(false)}
              className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground cursor-pointer transition-colors"
              title="Expand sidebar"
            >
              <PanelLeft className="w-4 h-4 rotate-180" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border min-h-[57px]">
            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sidebar-foreground text-sm truncate">
                {businessName}
              </span>
            </div>
            {/* Desktop: collapse to mini */}
            <button
              onClick={() => setMini(true)}
              className="hidden lg:flex p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground cursor-pointer flex-shrink-0 transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            {/* Mobile: close sidebar */}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden flex p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground cursor-pointer flex-shrink-0 transition-colors"
              title="Close sidebar"
            >
              <PanelLeft className="w-4 h-4 rotate-180" />
            </button>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navLinks.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => {setMobileOpen(false) /* sidebar state preserved on all screens */}}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-150 cursor-pointer
                ${isActive(href)
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }
                ${mini ? "justify-center" : ""}
              `}
              title={mini ? label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!mini && (
                <span className="whitespace-nowrap overflow-hidden">{label}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={() => setShowLogoutModal(true)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-colors cursor-pointer
              ${mini ? "justify-center" : ""}
            `}
            title={mini ? "Logout" : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!mini && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground text-sm truncate">{businessName}</span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-accent text-foreground cursor-pointer flex-shrink-0"
            title="Open sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <ConfirmModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => { logout(); setShowLogoutModal(false); }}
        title="Logout"
        description="Are you sure you want to logout from Business Manager?"
        confirmText="Logout"
        variant="destructive"
      />
    </div>
  );
}
