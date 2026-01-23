import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { logAuditEvent } from '@/lib/auditLog';
import { Person, Project, Phase, Cell, Task, CustomColumn, Milestone, MeetingNote } from '@/lib/types';

// Helper to get current user ID
async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

export function useSupabaseData() {
  const [people, setPeople] = useState<Person[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    // Check if user is authenticated before fetching
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      initialLoadDone.current = true;
      return;
    }

    // Only show loading spinner on initial load, not on background refetches
    if (!initialLoadDone.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const [
        { data: peopleData, error: peopleError },
        { data: projectsData, error: projectsError },
        { data: phasesData, error: phasesError },
        { data: cellsData, error: cellsError },
        { data: tasksData, error: tasksError },
        { data: columnsData, error: columnsError },
        { data: milestonesData, error: milestonesError },
        { data: meetingNotesData, error: meetingNotesError },
      ] = await Promise.all([
        supabase.from('people').select('*').order('name'),
        supabase.from('projects').select('*').order('name'),
        supabase.from('phases').select('*').order('order'),
        supabase.from('cells').select('*').order('name'),
        supabase.from('tasks').select('*').order('updated_at', { ascending: false }),
        supabase.from('custom_columns').select('*').order('order'),
        supabase.from('milestones').select('*').order('name'),
        supabase.from('meeting_notes').select('*').order('meeting_date', { ascending: false }),
      ]);

      if (peopleError) throw peopleError;
      if (projectsError) throw projectsError;
      if (phasesError) throw phasesError;
      if (cellsError) throw cellsError;
      if (tasksError) throw tasksError;
      if (columnsError) throw columnsError;
      if (milestonesError) throw milestonesError;
      if (meetingNotesError) throw meetingNotesError;

      // Map snake_case to camelCase - ensure arrays are never undefined
      setPeople(Array.isArray(peopleData) ? peopleData.map(mapPerson) : []);
      setProjects(Array.isArray(projectsData) ? projectsData.map(mapProject) : []);
      setPhases(Array.isArray(phasesData) ? phasesData.map(mapPhase) : []);
      setCells(Array.isArray(cellsData) ? cellsData.map(mapCell) : []);
      setTasks(Array.isArray(tasksData) ? tasksData.map(mapTask) : []);
      setCustomColumns(Array.isArray(columnsData) ? columnsData.map(mapCustomColumn) : []);
      setMilestones(Array.isArray(milestonesData) ? milestonesData.map(mapMilestone) : []);
      setMeetingNotes(Array.isArray(meetingNotesData) ? meetingNotesData.map(mapMeetingNote) : []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      initialLoadDone.current = true;
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Listen for auth state changes to refetch data
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        fetchData();
      } else if (event === 'SIGNED_OUT') {
        // Clear all data on sign out
        setPeople([]);
        setProjects([]);
        setPhases([]);
        setCells([]);
        setTasks([]);
        setCustomColumns([]);
        setMilestones([]);
        setMeetingNotes([]);
        setLoading(false);
        initialLoadDone.current = false;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchData]);

  // CRUD operations for People
  const addPerson = async (person: Omit<Person, 'id'>) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('people')
      .insert([{ ...personToDb(person), user_id: userId }])
      .select()
      .single();
    if (error) throw error;
    const newPerson = mapPerson(data);
    setPeople(prev => [...prev, newPerson]);

    return newPerson;
  };

  const updatePerson = async (id: string, updates: Partial<Person>) => {
    const { error } = await supabase
      .from('people')
      .update(personToDb(updates))
      .eq('id', id);
    if (error) throw error;
    setPeople(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePerson = async (id: string) => {
    const { error } = await supabase.from('people').delete().eq('id', id);
    if (error) throw error;
    setPeople(prev => prev.filter(p => p.id !== id));
  };

  // CRUD operations for Projects
  const addProject = async (project: Omit<Project, 'id'>) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('projects')
      .insert([{ ...projectToDb(project), user_id: userId }])
      .select()
      .single();
    if (error) throw error;
    const newProject = mapProject(data);
    setProjects(prev => [...prev, newProject]);

    logAuditEvent({ action: 'project_created', entity_type: 'project', entity_id: newProject.id, entity_name: newProject.name, level: 'success', details: `Projeto "${newProject.name}" criado` });

    return newProject;
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const { error } = await supabase
      .from('projects')
      .update(projectToDb(updates))
      .eq('id', id);
    if (error) throw error;
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProject = async (id: string) => {
    const project = projects.find(p => p.id === id);
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    setProjects(prev => prev.filter(p => p.id !== id));
    logAuditEvent({ action: 'project_deleted', entity_type: 'project', entity_id: id, entity_name: project?.name, level: 'warning', details: `Projeto "${project?.name || id}" excluído` });
  };

  // CRUD operations for Phases
  const addPhase = async (phase: Omit<Phase, 'id'>) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('phases')
      .insert([{ ...phaseToDb(phase), user_id: userId }])
      .select()
      .single();
    if (error) throw error;
    const newPhase = mapPhase(data);
    setPhases(prev => [...prev, newPhase]);

    const project = projects.find(p => p.id === newPhase.projectId);
    logAuditEvent({ action: 'phase_created', entity_type: 'phase', entity_id: newPhase.id, entity_name: newPhase.name, level: 'success', details: `Fase "${newPhase.name}" criada no projeto "${project?.name || ''}"` });

    return newPhase;
  };

  const updatePhase = async (id: string, updates: Partial<Phase>) => {
    const { error } = await supabase
      .from('phases')
      .update(phaseToDb(updates))
      .eq('id', id);
    if (error) throw error;
    setPhases(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePhase = async (id: string) => {
    const phase = phases.find(p => p.id === id);
    const { error } = await supabase.from('phases').delete().eq('id', id);
    if (error) throw error;
    setPhases(prev => prev.filter(p => p.id !== id));
    logAuditEvent({ action: 'phase_deleted', entity_type: 'phase', entity_id: id, entity_name: phase?.name, level: 'warning', details: `Fase "${phase?.name || id}" excluída` });
  };

  // CRUD operations for Cells
  const addCell = async (cell: Omit<Cell, 'id'>) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('cells')
      .insert([{ ...cellToDb(cell), user_id: userId }])
      .select()
      .single();
    if (error) throw error;
    const newCell = mapCell(data);
    setCells(prev => [...prev, newCell]);
    return newCell;
  };

  const updateCell = async (id: string, updates: Partial<Cell>) => {
    const { error } = await supabase
      .from('cells')
      .update(cellToDb(updates))
      .eq('id', id);
    if (error) throw error;
    setCells(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCell = async (id: string) => {
    const { error } = await supabase.from('cells').delete().eq('id', id);
    if (error) throw error;
    setCells(prev => prev.filter(c => c.id !== id));
  };

  // CRUD operations for Tasks
  const addTask = async (task: Omit<Task, 'id' | 'updatedAt'>) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('tasks')
      .insert([{ ...taskToDb(task), user_id: userId }])
      .select()
      .single();
    if (error) throw error;
    const newTask = mapTask(data);
    setTasks(prev => [newTask, ...prev]);

    logAuditEvent({ action: 'task_created', entity_type: 'task', entity_id: newTask.id, entity_name: newTask.name, level: 'success', details: `Tarefa "${newTask.name}" criada` });

    return newTask;
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const dbUpdates = taskToDb({ ...updates, updatedAt: new Date().toISOString() });
    const { error } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', id);
    if (error) throw error;
    const task = tasks.find(t => t.id === id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
    if (updates.completed === true && task) {
      logAuditEvent({ action: 'task_completed', entity_type: 'task', entity_id: id, entity_name: task.name, level: 'success', details: `Tarefa "${task.name}" concluída` });
    }
  };

  const deleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
    setTasks(prev => prev.filter(t => t.id !== id));
    logAuditEvent({ action: 'task_deleted', entity_type: 'task', entity_id: id, entity_name: task?.name, level: 'warning', details: `Tarefa "${task?.name || id}" excluída` });
  };

  // CRUD operations for Custom Columns
  const addCustomColumn = async (column: Omit<CustomColumn, 'id'>) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('custom_columns')
      .insert([{ ...customColumnToDb(column), user_id: userId }])
      .select()
      .single();
    if (error) throw error;
    const newColumn = mapCustomColumn(data);
    setCustomColumns(prev => [...prev, newColumn]);
    return newColumn;
  };

  const updateCustomColumn = async (id: string, updates: Partial<CustomColumn>) => {
    const { error } = await supabase
      .from('custom_columns')
      .update(customColumnToDb(updates))
      .eq('id', id);
    if (error) throw error;
    setCustomColumns(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCustomColumn = async (id: string) => {
    const { error } = await supabase.from('custom_columns').delete().eq('id', id);
    if (error) throw error;
    setCustomColumns(prev => prev.filter(c => c.id !== id));
  };

  // CRUD operations for Milestones
  const addMilestone = async (milestone: Omit<Milestone, 'id'>) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('milestones')
      .insert([{ ...milestoneToDb(milestone), user_id: userId }])
      .select()
      .single();
    if (error) throw error;
    const newMilestone = mapMilestone(data);
    setMilestones(prev => [...prev, newMilestone]);

    logAuditEvent({ action: 'milestone_created', entity_type: 'milestone', entity_id: newMilestone.id, entity_name: newMilestone.name, level: 'success', details: `Marco "${newMilestone.name}" criado` });

    return newMilestone;
  };

  const updateMilestone = async (id: string, updates: Partial<Milestone>) => {
    const { error } = await supabase
      .from('milestones')
      .update(milestoneToDb(updates))
      .eq('id', id);
    if (error) throw error;
    const milestone = milestones.find(m => m.id === id);
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    if (updates.completed === true && milestone) {
      logAuditEvent({ action: 'milestone_completed', entity_type: 'milestone', entity_id: id, entity_name: milestone.name, level: 'success', details: `Marco "${milestone.name}" concluído` });
    }
  };

  const deleteMilestone = async (id: string) => {
    const milestone = milestones.find(m => m.id === id);
    const { error } = await supabase.from('milestones').delete().eq('id', id);
    if (error) throw error;
    setMilestones(prev => prev.filter(m => m.id !== id));
    logAuditEvent({ action: 'milestone_deleted', entity_type: 'milestone', entity_id: id, entity_name: milestone?.name, level: 'warning', details: `Marco "${milestone?.name || id}" excluído` });
  };

  // CRUD operations for Meeting Notes
  const addMeetingNote = async (note: Omit<MeetingNote, 'id' | 'createdAt' | 'updatedAt'>) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('meeting_notes')
      .insert([{ ...meetingNoteToDb(note), user_id: userId }])
      .select()
      .single();
    if (error) throw error;
    const newNote = mapMeetingNote(data);
    setMeetingNotes(prev => [newNote, ...prev]);
    return newNote;
  };

  const updateMeetingNote = async (id: string, updates: Partial<MeetingNote>) => {
    const { error } = await supabase
      .from('meeting_notes')
      .update(meetingNoteToDb(updates))
      .eq('id', id);
    if (error) throw error;
    setMeetingNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
  };

  const deleteMeetingNote = async (id: string) => {
    const { error } = await supabase.from('meeting_notes').delete().eq('id', id);
    if (error) throw error;
    setMeetingNotes(prev => prev.filter(n => n.id !== id));
  };

  return {
    // Data
    people, projects, phases, cells, tasks, customColumns, milestones, meetingNotes,
    loading, error,
    // State setters for local updates
    setPeople, setProjects, setPhases, setCells, setTasks, setCustomColumns, setMilestones, setMeetingNotes,
    // Refresh
    refetch: fetchData,
    // People CRUD
    addPerson, updatePerson, deletePerson,
    // Projects CRUD
    addProject, updateProject, deleteProject,
    // Phases CRUD
    addPhase, updatePhase, deletePhase,
    // Cells CRUD
    addCell, updateCell, deleteCell,
    // Tasks CRUD
    addTask, updateTask, deleteTask,
    // Custom Columns CRUD
    addCustomColumn, updateCustomColumn, deleteCustomColumn,
    // Milestones CRUD
    addMilestone, updateMilestone, deleteMilestone,
    // Meeting Notes CRUD
    addMeetingNote, updateMeetingNote, deleteMeetingNote,
  };
}

// Mapping functions (DB snake_case -> App camelCase)
function mapPerson(data: any): Person {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    type: data.type,
    color: data.color,
    active: data.active,
    avatarUrl: data.avatar_url,
  };
}

function mapProject(data: any): Project {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    startDate: data.start_date,
    endDate: data.end_date,
    status: data.status,
    coverColor: data.cover_color,
  };
}

function mapPhase(data: any): Phase {
  return {
    id: data.id,
    name: data.name,
    order: data.order,
    color: data.color,
    projectId: data.project_id,
    startDate: data.start_date,
    endDate: data.end_date,
    description: data.description,
  };
}

function mapCell(data: any): Cell {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    active: data.active,
  };
}

function mapTask(data: any): Task {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    projectId: data.project_id,
    phaseId: data.phase_id,
    cellId: data.cell_id,
    deviceId: data.device_id,
    responsibleId: data.responsible_id,
    quantity: data.quantity,
    collected: data.collected,
    startDate: data.start_date,
    endDate: data.end_date,
    sprintDate: data.sprint_date,
    status: data.status,
    priority: data.priority,
    observation: data.observation,
    updatedAt: data.updated_at,
    customValues: data.custom_values,
  };
}

function mapCustomColumn(data: any): CustomColumn {
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    projectId: data.project_id,
    order: data.order,
    options: data.options,
    isMilestone: data.is_milestone,
    active: data.active,
    hidden: data.hidden || false,
    standardField: data.standard_field,
  };
}

// Reverse mapping (App camelCase -> DB snake_case)
function personToDb(person: Partial<Person>): any {
  const result: any = {};
  if (person.name !== undefined) result.name = person.name;
  if (person.email !== undefined) result.email = person.email;
  if (person.type !== undefined) result.type = person.type;
  if (person.color !== undefined) result.color = person.color;
  if (person.active !== undefined) result.active = person.active;
  if (person.avatarUrl !== undefined) result.avatar_url = person.avatarUrl;
  return result;
}

function projectToDb(project: Partial<Project>): any {
  const result: any = {};
  if (project.name !== undefined) result.name = project.name;
  if (project.description !== undefined) result.description = project.description;
  if (project.startDate !== undefined) result.start_date = project.startDate;
  if (project.endDate !== undefined) result.end_date = project.endDate;
  if (project.status !== undefined) result.status = project.status;
  if (project.coverColor !== undefined) result.cover_color = project.coverColor;
  return result;
}

function phaseToDb(phase: Partial<Phase>): any {
  const result: any = {};
  if (phase.name !== undefined) result.name = phase.name;
  if (phase.order !== undefined) result.order = phase.order;
  if (phase.color !== undefined) result.color = phase.color;
  if (phase.projectId !== undefined) result.project_id = phase.projectId;
  if (phase.startDate !== undefined) result.start_date = phase.startDate;
  if (phase.endDate !== undefined) result.end_date = phase.endDate;
  if (phase.description !== undefined) result.description = phase.description;
  return result;
}

function cellToDb(cell: Partial<Cell>): any {
  const result: any = {};
  if (cell.name !== undefined) result.name = cell.name;
  if (cell.description !== undefined) result.description = cell.description;
  if (cell.active !== undefined) result.active = cell.active;
  return result;
}

function taskToDb(task: Partial<Task>): any {
  const result: any = {};
  if (task.name !== undefined) result.name = task.name;
  if (task.description !== undefined) result.description = task.description;
  if (task.projectId !== undefined) result.project_id = task.projectId;
  if (task.phaseId !== undefined) result.phase_id = task.phaseId;
  if (task.cellId !== undefined) result.cell_id = task.cellId;
  if (task.deviceId !== undefined) result.device_id = task.deviceId;
  if (task.responsibleId !== undefined) result.responsible_id = task.responsibleId;
  if (task.quantity !== undefined) result.quantity = task.quantity;
  if (task.collected !== undefined) result.collected = task.collected;
  if (task.startDate !== undefined) result.start_date = task.startDate;
  if (task.endDate !== undefined) result.end_date = task.endDate;
  if (task.sprintDate !== undefined) result.sprint_date = task.sprintDate;
  if (task.status !== undefined) result.status = task.status;
  if (task.priority !== undefined) result.priority = task.priority;
  if (task.observation !== undefined) result.observation = task.observation;
  if (task.updatedAt !== undefined) result.updated_at = task.updatedAt;
  if (task.customValues !== undefined) result.custom_values = task.customValues;
  return result;
}

function customColumnToDb(column: Partial<CustomColumn>): any {
  const result: any = {};
  if (column.name !== undefined) result.name = column.name;
  if (column.type !== undefined) result.type = column.type;
  if (column.projectId !== undefined) result.project_id = column.projectId;
  if (column.order !== undefined) result.order = column.order;
  if (column.options !== undefined) result.options = column.options;
  if (column.isMilestone !== undefined) result.is_milestone = column.isMilestone;
  if (column.active !== undefined) result.active = column.active;
  if (column.hidden !== undefined) result.hidden = column.hidden;
  if (column.standardField !== undefined) result.standard_field = column.standardField;
  return result;
}

function mapMilestone(data: any): Milestone {
  return {
    id: data.id,
    name: data.name,
    projectId: data.project_id,
    description: data.description,
    color: data.color,
    date: data.date || data.start_date || '',
    completed: data.completed ?? false,
  };
}

function milestoneToDb(milestone: Partial<Milestone>): any {
  const result: any = {};
  if (milestone.name !== undefined) result.name = milestone.name;
  if (milestone.projectId !== undefined) result.project_id = milestone.projectId;
  if (milestone.description !== undefined) result.description = milestone.description;
  if (milestone.color !== undefined) result.color = milestone.color;
  if (milestone.date !== undefined) result.date = milestone.date;
  if (milestone.completed !== undefined) result.completed = milestone.completed;
  return result;
}

function mapMeetingNote(data: any): MeetingNote {
  return {
    id: data.id,
    projectId: data.project_id,
    title: data.title,
    content: data.content,
    meetingDate: data.meeting_date,
    participants: data.participants,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function meetingNoteToDb(note: Partial<MeetingNote>): any {
  const result: any = {};
  if (note.projectId !== undefined) result.project_id = note.projectId;
  if (note.title !== undefined) result.title = note.title;
  if (note.content !== undefined) result.content = note.content;
  if (note.meetingDate !== undefined) result.meeting_date = note.meetingDate;
  if (note.participants !== undefined) result.participants = note.participants;
  return result;
}
