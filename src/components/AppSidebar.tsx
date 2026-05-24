import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Kanban, CalendarClock, BarChart3, Sun, Moon, ChevronLeft, ChevronRight, Gem, Settings, LogOut, Shield } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { motion, AnimatePresence } from "framer-motion";

const NAV = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/pipeline", label: "Pipeline", icon: Kanban },
  { path: "/followup", label: "Follow-up", icon: CalendarClock },
  { path: "/relatorios", label: "Relatórios", icon: BarChart3, locked: true },
  { path: "/configuracoes", label: "Configurações", icon: Settings },
];

export default function AppSidebar({ mobileOpen = false, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const { signOut, isAdmin } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? 72 : 256;

  return (
    <motion.aside animate={{ width: sidebarWidth }} transition={{ duration: 0.25 }}
      className={`fixed left-0 top-0 h-screen z-50 flex flex-col border-r border-border/80 bg-card/95 backdrop-blur-xl shadow-xl transition-transform duration-300 md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border">
        <div className="w-9 h-9 rounded-lg gradient-gold flex items-center justify-center flex-shrink-0">
          <Gem className="w-5 h-5 text-primary-foreground" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="font-display text-lg font-bold gradient-gold-text whitespace-nowrap overflow-hidden truncate">
              {settings?.empresa_nome || "Nexus CRM"}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} onClick={onMobileClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative ${
                active ? "bg-primary/10 text-gold" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}>
              {active && <motion.div layoutId="sidebar-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gold" />}
              <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-gold" : ""}`} />
              {!collapsed && <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>}
              {item.locked && !collapsed && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-gold-muted text-gold font-semibold">PRO</span>}
            </Link>
          );
        })}
        {isAdmin && (
          <Link to="/admin" onClick={onMobileClose} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            location.pathname === "/admin" ? "bg-primary/10 text-gold" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}>
            <Shield className="w-5 h-5" />
            {!collapsed && <span className="text-sm font-medium">Admin</span>}
          </Link>
        )}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        <button onClick={toggleTheme} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {!collapsed && <span className="text-sm font-medium">{theme === "dark" ? "Tema Claro" : "Tema Escuro"}</span>}
        </button>
        <button onClick={async () => { await signOut(); navigate("/auth"); }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger transition-all">
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm font-medium">Sair</span>}
        </button>
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span className="text-sm font-medium">Recolher</span>}
        </button>
      </div>
    </motion.aside>
  );
}
