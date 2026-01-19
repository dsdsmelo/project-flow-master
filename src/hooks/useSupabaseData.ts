import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Person, Project, Phase, Cell, Task, CustomColumn } from '@/lib/types';

export function useSupabaseData() {
  const [people, setPeople] = useState<Person[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        { data: peopleData, error: peopleError },
        { data: projectsData, error: projectsError },
        { data: phasesData, error: phasesError },
        { data: cellsData, error: cellsError },
        { data: tasksData, error: tasksError },
        { data: columnsData, error: columnsError },
      ] = await Promise.all([
        supabase.from('people').select('*').order('name'),
        supabase.from('projects').select('*').order('name'),
        supabase.from('phases').select('*').order('order'),
        supabase.from('cells').select('*').order('name'),
        supabase.from('tasks').select('*').order('updated_at', { ascending: false }),
        supabase.from('custom_columns').select('*').order('order'),
      ]);

      if (peopleError) throw peopleError;
      if (projectsError) throw projectsError;
      if (phasesError) throw phasesError;
      if (cellsError) throw cellsError;
      if (tasksError) throw tasksError;
      if (columnsError) throw columnsError;

      // Map snake_case to camelCase
      setPeople((peopleData || []).map(mapPerson));
      setProjects((projectsData || []).map(mapProject));
      setPhases((phasesData || []).map(mapPhase));
      setCells((cellsData || []).map(mapCell));
      setTasks((tasksData || []).map(mapTask));
      setCustomColumns((columnsData || []).map(mapCustomColumn));
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // CRUD operations for People
  const addPerson = async (person: Omit<Person, 'id'>) => {
    const { data, error } = await supabase
      .from('people')
      .insert([personToDb(person)])
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
    const { data, error } = await supabase
      .from('projects')
      .insert([projectToDb(project)])
      .select()
      .single();
    if (error) throw error;
    const newProject = mapProject(data);
    setProjects(prev => [...prev, newProject]);

    // Create default columns for the new project
    const defaultColumns: Omit<CustomColumn, 'id'>[] = [
      { name: 'Tarefa', type: 'text', projectId: newProject.id, order: 1, active: true },
      { name: 'Descrição', type: 'text', projectId: newProject.id, order: 2, active: true },
      { name: 'Responsável', type: 'user', projectId: newProject.id, order: 3, active: true },
      { name: 'Status', type: 'list', projectId: newProject.id, order: 4, options: ['Pendente', 'Em Progresso', 'Bloqueado', 'Concluído', 'Cancelado'], active: true },
      { name: 'Prioridade', type: 'list', projectId: newProject.id, order: 5, options: ['Baixa', 'Média', 'Alta', 'Urgente'], active: true },
      { name: 'Data Início', type: 'date', projectId: newProject.id, order: 6, active: true },
      { name: 'Data Fim', type: 'date', projectId: newProject.id, order: 7, active: true },
      { name: 'Progresso', type: 'percentage', projectId: newProject.id, order: 8, active: true },
    ];

    try {
      const { data: columnsData, error: columnsError } = await supabase
        .from('custom_columns')
        .insert(defaultColumns.map(customColumnToDb))
        .select();
      
      if (columnsError) {
        console.error('Error creating default columns:', columnsError);
      } else if (columnsData) {
        const newColumns = columnsData.map(mapCustomColumn);
        setCustomColumns(prev => [...prev, ...newColumns]);
      }
    } catch (err) {
      console.error('Error creating default columns:', err);
    }

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
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  // CRUD operations for Phases
  const addPhase = async (phase: Omit<Phase, 'id'>) => {
    const { data, error } = await supabase
      .from('phases')
      .insert([phaseToDb(phase)])
      .select()
      .single();
    if (error) throw error;
    const newPhase = mapPhase(data);
    setPhases(prev => [...prev, newPhase]);
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
    const { error } = await supabase.from('phases').delete().eq('id', id);
    if (error) throw error;
    setPhases(prev => prev.filter(p => p.id !== id));
  };

  // CRUD operations for Cells
  const addCell = async (cell: Omit<Cell, 'id'>) => {
    const { data, error } = await supabase
      .from('cells')
      .insert([cellToDb(cell)])
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
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskToDb(task)])
      .select()
      .single();
    if (error) throw error;
    const newTask = mapTask(data);
    setTasks(prev => [newTask, ...prev]);
    return newTask;
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const dbUpdates = taskToDb({ ...updates, updatedAt: new Date().toISOString() });
    const { error } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', id);
    if (error) throw error;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // CRUD operations for Custom Columns
  const addCustomColumn = async (column: Omit<CustomColumn, 'id'>) => {
    const { data, error } = await supabase
      .from('custom_columns')
      .insert([customColumnToDb(column)])
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

  return {
    // Data
    people, projects, phases, cells, tasks, customColumns,
    loading, error,
    // State setters for local updates
    setPeople, setProjects, setPhases, setCells, setTasks, setCustomColumns,
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
  };
}

function mapPhase(data: any): Phase {
  return {
    id: data.id,
    name: data.name,
    order: data.order,
    color: data.color,
    projectId: data.project_id,
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
  return result;
}

function projectToDb(project: Partial<Project>): any {
  const result: any = {};
  if (project.name !== undefined) result.name = project.name;
  if (project.description !== undefined) result.description = project.description;
  if (project.startDate !== undefined) result.start_date = project.startDate;
  if (project.endDate !== undefined) result.end_date = project.endDate;
  if (project.status !== undefined) result.status = project.status;
  return result;
}

function phaseToDb(phase: Partial<Phase>): any {
  const result: any = {};
  if (phase.name !== undefined) result.name = phase.name;
  if (phase.order !== undefined) result.order = phase.order;
  if (phase.color !== undefined) result.color = phase.color;
  if (phase.projectId !== undefined) result.project_id = phase.projectId;
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
  return result;
}
