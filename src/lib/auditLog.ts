import { supabase } from './supabase';

export type AuditLogLevel = 'info' | 'warning' | 'error' | 'success';

export type AuditLogAction =
  // Authentication
  | 'login'
  | 'login_failed'
  | 'login_blocked'
  | 'logout'
  | 'signup'
  | 'signup_failed'
  | 'email_confirmed'
  // 2FA
  | '2fa_enabled'
  | '2fa_disabled'
  | '2fa_failed'
  | '2fa_blocked'
  | '2fa_success'
  // Password
  | 'password_reset'
  | 'password_reset_request'
  | 'password_changed'
  // Subscription
  | 'subscription_created'
  | 'subscription_canceled'
  | 'subscription_updated'
  | 'subscription_expired'
  | 'payment_failed'
  // Profile
  | 'profile_updated'
  | 'avatar_updated'
  // Projects
  | 'project_created'
  | 'project_updated'
  | 'project_deleted'
  | 'project_archived'
  // Tasks
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'task_completed'
  | 'task_status_changed'
  // Phases
  | 'phase_created'
  | 'phase_updated'
  | 'phase_deleted'
  // People
  | 'person_created'
  | 'person_updated'
  | 'person_deleted'
  | 'person_deactivated'
  | 'person_activated'
  // Milestones
  | 'milestone_created'
  | 'milestone_updated'
  | 'milestone_deleted'
  | 'milestone_completed'
  // Admin
  | 'admin_action'
  | 'admin_login'
  | 'admin_user_blocked'
  | 'admin_user_unblocked'
  | 'admin_role_assigned'
  | 'admin_role_removed'
  // Data
  | 'data_exported'
  | 'data_imported';

export type EntityType =
  | 'project'
  | 'task'
  | 'phase'
  | 'person'
  | 'milestone'
  | 'subscription'
  | 'profile'
  | 'user'
  | 'custom_column'
  | 'meeting_note';

interface AuditLogEntry {
  user_id?: string;
  user_email?: string;
  action: AuditLogAction;
  entity_type?: EntityType;
  entity_id?: string;
  entity_name?: string;
  details?: string;
  metadata?: Record<string, unknown>;
  level: AuditLogLevel;
  ip_address?: string;
}

// Get user agent for logging
function getUserAgent(): string {
  if (typeof navigator !== 'undefined') {
    return navigator.userAgent;
  }
  return 'unknown';
}

// Get current user info from Supabase session
async function getCurrentUserInfo(): Promise<{ userId: string | null; userEmail: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      userId: session?.user?.id || null,
      userEmail: session?.user?.email || null
    };
  } catch {
    return { userId: null, userEmail: null };
  }
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    // Auto-fill user info if not provided
    let userId = entry.user_id;
    let userEmail = entry.user_email;

    if (!userId || !userEmail) {
      const userInfo = await getCurrentUserInfo();
      userId = userId || userInfo.userId || undefined;
      userEmail = userEmail || userInfo.userEmail || undefined;
    }

    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId || null,
        user_email: userEmail || null,
        action: entry.action,
        entity_type: entry.entity_type || null,
        entity_id: entry.entity_id || null,
        entity_name: entry.entity_name || null,
        details: entry.details || null,
        metadata: entry.metadata || {},
        level: entry.level,
        ip_address: entry.ip_address || null,
        user_agent: getUserAgent(),
      });

    if (error) {
      // Silently fail if table doesn't exist - log to console for debugging
      console.warn('Audit log failed:', error.message);
    }
  } catch (err) {
    console.warn('Audit log error:', err);
  }
}

// Convenience functions for common actions
export const auditLog = {
  // Auth events
  login: (email: string, userId?: string) =>
    logAuditEvent({ action: 'login', user_email: email, user_id: userId, level: 'success', details: 'Login realizado com sucesso' }),

  loginFailed: (email: string, reason?: string) =>
    logAuditEvent({ action: 'login_failed', user_email: email, level: 'warning', details: reason || 'Falha na autenticação' }),

  logout: (email?: string, userId?: string) =>
    logAuditEvent({ action: 'logout', user_email: email, user_id: userId, level: 'info', details: 'Logout realizado' }),

  signup: (email: string, userId?: string) =>
    logAuditEvent({ action: 'signup', user_email: email, user_id: userId, level: 'success', details: 'Nova conta criada' }),

  signupFailed: (email: string, reason?: string) =>
    logAuditEvent({ action: 'signup_failed', user_email: email, level: 'warning', details: reason || 'Falha no cadastro' }),

  // Project events
  projectCreated: (projectId: string, projectName: string) =>
    logAuditEvent({
      action: 'project_created',
      entity_type: 'project',
      entity_id: projectId,
      entity_name: projectName,
      level: 'success',
      details: `Projeto "${projectName}" criado`
    }),

  projectUpdated: (projectId: string, projectName: string, changes?: Record<string, unknown>) =>
    logAuditEvent({
      action: 'project_updated',
      entity_type: 'project',
      entity_id: projectId,
      entity_name: projectName,
      level: 'info',
      details: `Projeto "${projectName}" atualizado`,
      metadata: changes
    }),

  projectDeleted: (projectId: string, projectName: string) =>
    logAuditEvent({
      action: 'project_deleted',
      entity_type: 'project',
      entity_id: projectId,
      entity_name: projectName,
      level: 'warning',
      details: `Projeto "${projectName}" excluído`
    }),

  // Task events
  taskCreated: (taskId: string, taskName: string, projectName?: string) =>
    logAuditEvent({
      action: 'task_created',
      entity_type: 'task',
      entity_id: taskId,
      entity_name: taskName,
      level: 'success',
      details: projectName ? `Tarefa "${taskName}" criada no projeto "${projectName}"` : `Tarefa "${taskName}" criada`
    }),

  taskUpdated: (taskId: string, taskName: string, changes?: Record<string, unknown>) =>
    logAuditEvent({
      action: 'task_updated',
      entity_type: 'task',
      entity_id: taskId,
      entity_name: taskName,
      level: 'info',
      details: `Tarefa "${taskName}" atualizada`,
      metadata: changes
    }),

  taskDeleted: (taskId: string, taskName: string) =>
    logAuditEvent({
      action: 'task_deleted',
      entity_type: 'task',
      entity_id: taskId,
      entity_name: taskName,
      level: 'warning',
      details: `Tarefa "${taskName}" excluída`
    }),

  taskCompleted: (taskId: string, taskName: string) =>
    logAuditEvent({
      action: 'task_completed',
      entity_type: 'task',
      entity_id: taskId,
      entity_name: taskName,
      level: 'success',
      details: `Tarefa "${taskName}" concluída`
    }),

  taskStatusChanged: (taskId: string, taskName: string, oldStatus: string, newStatus: string) =>
    logAuditEvent({
      action: 'task_status_changed',
      entity_type: 'task',
      entity_id: taskId,
      entity_name: taskName,
      level: 'info',
      details: `Status da tarefa "${taskName}" alterado de "${oldStatus}" para "${newStatus}"`,
      metadata: { oldStatus, newStatus }
    }),

  // Person events
  personCreated: (personId: string, personName: string) =>
    logAuditEvent({
      action: 'person_created',
      entity_type: 'person',
      entity_id: personId,
      entity_name: personName,
      level: 'success',
      details: `Pessoa "${personName}" criada`
    }),

  personUpdated: (personId: string, personName: string, changes?: Record<string, unknown>) =>
    logAuditEvent({
      action: 'person_updated',
      entity_type: 'person',
      entity_id: personId,
      entity_name: personName,
      level: 'info',
      details: `Pessoa "${personName}" atualizada`,
      metadata: changes
    }),

  personDeleted: (personId: string, personName: string) =>
    logAuditEvent({
      action: 'person_deleted',
      entity_type: 'person',
      entity_id: personId,
      entity_name: personName,
      level: 'warning',
      details: `Pessoa "${personName}" excluída`
    }),

  // Phase events
  phaseCreated: (phaseId: string, phaseName: string, projectName?: string) =>
    logAuditEvent({
      action: 'phase_created',
      entity_type: 'phase',
      entity_id: phaseId,
      entity_name: phaseName,
      level: 'success',
      details: projectName ? `Fase "${phaseName}" criada no projeto "${projectName}"` : `Fase "${phaseName}" criada`
    }),

  phaseDeleted: (phaseId: string, phaseName: string) =>
    logAuditEvent({
      action: 'phase_deleted',
      entity_type: 'phase',
      entity_id: phaseId,
      entity_name: phaseName,
      level: 'warning',
      details: `Fase "${phaseName}" excluída`
    }),

  // Milestone events
  milestoneCreated: (milestoneId: string, milestoneName: string) =>
    logAuditEvent({
      action: 'milestone_created',
      entity_type: 'milestone',
      entity_id: milestoneId,
      entity_name: milestoneName,
      level: 'success',
      details: `Marco "${milestoneName}" criado`
    }),

  milestoneCompleted: (milestoneId: string, milestoneName: string) =>
    logAuditEvent({
      action: 'milestone_completed',
      entity_type: 'milestone',
      entity_id: milestoneId,
      entity_name: milestoneName,
      level: 'success',
      details: `Marco "${milestoneName}" concluído`
    }),

  // Admin events
  adminAction: (action: string, details?: string, targetUserId?: string) =>
    logAuditEvent({
      action: 'admin_action',
      entity_type: 'user',
      entity_id: targetUserId,
      level: 'warning',
      details: details || action,
      metadata: { adminAction: action }
    }),
};
