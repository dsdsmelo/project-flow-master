import { 
  Activity, 
  Users, 
  Server, 
  Shield, 
  FileText,
  LogOut,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onRefresh: () => void;
  onLogout: () => void;
  isLoading: boolean;
}

const menuItems = [
  { id: 'overview', label: 'Visão Geral', icon: Activity },
  { id: 'users', label: 'Clientes', icon: Users },
  { id: 'logs', label: 'Logs de Auditoria', icon: FileText },
  { id: 'infra', label: 'Infraestrutura', icon: Server },
  { id: 'security', label: 'Segurança', icon: Shield },
];

export function AdminSidebar({ 
  activeTab, 
  onTabChange, 
  onRefresh, 
  onLogout,
  isLoading 
}: AdminSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-sm truncate">Painel Admin</h1>
              <p className="text-xs text-muted-foreground truncate">Tarefaa SaaS</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Gerenciamento</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    onClick={() => onTabChange(item.id)}
                    isActive={activeTab === item.id}
                    tooltip={item.label}
                    className={cn(
                      "transition-colors",
                      activeTab === item.id && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onRefresh} tooltip="Atualizar dados">
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              <span>Atualizar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onLogout} tooltip="Sair">
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
