import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban, 
  GanttChart, 
  Users, 
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const mainNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: FolderKanban, label: 'Projetos', path: '/projects' },
  { icon: GanttChart, label: 'Gantt', path: '/gantt' },
  { icon: Users, label: 'Pessoas', path: '/people' },
];

const settingsNavItems = [
  { icon: Settings, label: 'Configurações', path: '/settings' },
];

export const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 z-50",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">TaskFlow</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                isActive(item.path)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-sidebar-border" />

        {/* Settings Navigation */}
        <div className="space-y-1">
          {!collapsed && (
            <span className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Cadastros
            </span>
          )}
          {settingsNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                isActive(item.path)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={signOut}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
            "text-sidebar-foreground/70 hover:bg-destructive hover:text-white"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Sair</span>}
        </button>
      </div>
    </aside>
  );
};
