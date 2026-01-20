import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Search,
  Crown,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  MoreHorizontal,
  KeyRound,
  Ban,
  CreditCard,
  Mail,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

export interface UserWithSubscription {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at?: string;
  subscription: {
    status: string;
    current_period_end: string | null;
    stripe_customer_id: string | null;
  } | null;
  is_admin: boolean;
  is_blocked?: boolean;
}

interface AdminUsersTabProps {
  users: UserWithSubscription[];
  isLoading: boolean;
  onRefresh: () => void;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ativo', icon: <CheckCircle2 className="w-3 h-3" />, variant: 'default' },
  trialing: { label: 'Trial', icon: <Clock className="w-3 h-3" />, variant: 'secondary' },
  past_due: { label: 'Atrasado', icon: <AlertCircle className="w-3 h-3" />, variant: 'destructive' },
  canceled: { label: 'Cancelado', icon: <XCircle className="w-3 h-3" />, variant: 'outline' },
  inactive: { label: 'Inativo', icon: <XCircle className="w-3 h-3" />, variant: 'outline' },
};

export const AdminUsersTab = ({ users, isLoading, onRefresh }: AdminUsersTabProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithSubscription | null>(null);
  const [actionType, setActionType] = useState<'reset_password' | 'block' | 'cancel_subscription' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const filteredUsers = searchQuery 
    ? users.filter(u => 
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  const handleAction = async () => {
    if (!selectedUser || !actionType) return;
    
    setIsProcessing(true);
    try {
      switch (actionType) {
        case 'reset_password':
          // Call admin edge function to reset password
          const { data: resetData, error: resetError } = await supabase.functions.invoke('admin-reset-password', {
            body: { userId: selectedUser.id, action: 'resetPassword' },
          });
          if (resetError) throw resetError;
          toast({
            title: 'Senha redefinida',
            description: resetData.message || `Senha temporária enviada para ${selectedUser.email}`,
          });
          break;
          
        case 'block':
          // Call admin edge function to block/unblock
          const { data: blockData, error: blockError } = await supabase.functions.invoke('admin-reset-password', {
            body: { 
              userId: selectedUser.id, 
              action: selectedUser.is_blocked ? 'unblockUser' : 'blockUser' 
            },
          });
          if (blockError) throw blockError;
          toast({
            title: selectedUser.is_blocked ? 'Usuário desbloqueado' : 'Usuário bloqueado',
            description: blockData.message,
          });
          onRefresh();
          break;
          
        case 'cancel_subscription':
          // Cancel subscription in Stripe via edge function
          if (!selectedUser.subscription?.stripe_customer_id) {
            throw new Error('Usuário não possui assinatura ativa');
          }
          const { error: cancelError } = await supabase.functions.invoke('cancel-subscription', {
            body: { customer_id: selectedUser.subscription.stripe_customer_id },
          });
          if (cancelError) throw cancelError;
          toast({
            title: 'Assinatura cancelada',
            description: `Assinatura de ${selectedUser.email} foi cancelada`,
          });
          onRefresh();
          break;
      }
    } catch (error: any) {
      console.error('Action error:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao executar a ação',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setSelectedUser(null);
      setActionType(null);
    }
  };

  const openStripeCustomer = (customerId: string) => {
    window.open(`https://dashboard.stripe.com/customers/${customerId}`, '_blank');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Clientes</CardTitle>
          <CardDescription>Gerencie usuários, assinaturas e ações administrativas</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email ou nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="outline" className="text-muted-foreground">
              {filteredUsers.length} usuários
            </Badge>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead>Renovação</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="w-[50px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const status = user.subscription?.status || 'inactive';
                    const statusInfo = statusConfig[status] || statusConfig.inactive;

                    return (
                      <TableRow key={user.id} className={user.is_blocked ? 'opacity-50' : ''}>
                        <TableCell>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {user.full_name || 'Sem nome'}
                              {user.is_admin && (
                                <Crown className="w-4 h-4 text-yellow-500" />
                              )}
                              {user.is_blocked && (
                                <Ban className="w-4 h-4 text-destructive" />
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant} className="gap-1">
                            {statusInfo.icon}
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.last_sign_in_at
                            ? format(new Date(user.last_sign_in_at), "dd/MM/yy HH:mm", { locale: ptBR })
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.subscription?.current_period_end
                            ? format(new Date(user.subscription.current_period_end), "dd/MM/yyyy", { locale: ptBR })
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {user.is_admin ? (
                            <Badge variant="secondary">Admin</Badge>
                          ) : (
                            <Badge variant="outline">Usuário</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {
                                setSelectedUser(user);
                                setActionType('reset_password');
                              }}>
                                <KeyRound className="w-4 h-4 mr-2" />
                                Enviar reset de senha
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedUser(user);
                                setActionType('block');
                              }}>
                                <Ban className="w-4 h-4 mr-2" />
                                {user.is_blocked ? 'Desbloquear usuário' : 'Bloquear usuário'}
                              </DropdownMenuItem>
                              {user.subscription?.stripe_customer_id && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openStripeCustomer(user.subscription!.stripe_customer_id!)}>
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Ver no Stripe
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setActionType('cancel_subscription');
                                    }}
                                    className="text-destructive"
                                  >
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    Cancelar assinatura
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!actionType} onOpenChange={() => { setActionType(null); setSelectedUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'reset_password' && 'Enviar link de redefinição de senha?'}
              {actionType === 'block' && (selectedUser?.is_blocked ? 'Desbloquear usuário?' : 'Bloquear usuário?')}
              {actionType === 'cancel_subscription' && 'Cancelar assinatura?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'reset_password' && `Um email de redefinição será enviado para ${selectedUser?.email}`}
              {actionType === 'block' && (selectedUser?.is_blocked 
                ? `O usuário ${selectedUser?.email} poderá acessar o sistema novamente.`
                : `O usuário ${selectedUser?.email} não poderá mais acessar o sistema.`
              )}
              {actionType === 'cancel_subscription' && `A assinatura de ${selectedUser?.email} será cancelada imediatamente no Stripe.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} disabled={isProcessing}>
              {isProcessing ? 'Processando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
