// Core entity types

export interface Person {
  id: string;
  name: string;
  email?: string;
  type: 'internal' | 'partner';
  color: string;
  active: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
}

export interface Phase {
  id: string;
  name: string;
  order: number;
  color?: string;
  projectId: string;
}

export interface Cell {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

export interface Device {
  id: string;
  name: string;
  active: boolean;
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  phaseId?: string;
  cellId?: string;
  deviceId?: string;
  responsibleId?: string;
  quantity?: number;
  collected?: number;
  startDate?: string;
  endDate?: string;
  sprintDate?: string;
  status: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  observation?: string;
  updatedAt: string;
}

export interface CustomColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'list' | 'percentage' | 'user';
  projectId: string;
  order: number;
  options?: string[];
  active: boolean;
}

// Helper types
export type TaskStatus = Task['status'];
export type TaskPriority = Task['priority'];
export type ProjectStatus = Project['status'];
export type PersonType = Person['type'];

export const statusLabels: Record<TaskStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em Progresso',
  blocked: 'Bloqueado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export const priorityLabels: Record<TaskPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
  planning: 'Planejamento',
  active: 'Ativo',
  paused: 'Pausado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export const personTypeLabels: Record<PersonType, string> = {
  internal: 'Interno',
  partner: 'Parceiro',
};
