import { supabase } from './supabase';

export type AuditLogLevel = 'info' | 'warning' | 'error' | 'success';

export type AuditLogAction = 
  | 'login'
  | 'login_failed'
  | 'login_blocked'
  | '2fa_failed'
  | '2fa_blocked'
  | '2fa_success'
  | 'logout'
  | 'signup'
  | 'password_reset'
  | 'password_reset_request'
  | 'subscription_created'
  | 'subscription_canceled'
  | 'subscription_updated'
  | 'profile_updated'
  | 'project_created'
  | 'task_created'
  | 'admin_action';

interface AuditLogEntry {
  user_id?: string;
  user_email?: string;
  action: AuditLogAction;
  details?: string;
  level: AuditLogLevel;
  ip_address?: string;
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: entry.user_id || null,
        user_email: entry.user_email || null,
        action: entry.action,
        details: entry.details || null,
        level: entry.level,
        ip_address: entry.ip_address || null,
      });

    if (error) {
      // Silently fail if table doesn't exist - log to console for debugging
      console.warn('Audit log failed:', error.message);
    }
  } catch (err) {
    console.warn('Audit log error:', err);
  }
}
