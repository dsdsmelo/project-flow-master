import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Person, Project, Phase, Cell, Device, Task, CustomColumn } from '@/lib/types';
import { mockPeople, mockProjects, mockPhases, mockCells, mockDevices, mockTasks } from '@/lib/mockData';

interface DataContextType {
  people: Person[];
  setPeople: React.Dispatch<React.SetStateAction<Person[]>>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  phases: Phase[];
  setPhases: React.Dispatch<React.SetStateAction<Phase[]>>;
  cells: Cell[];
  setCells: React.Dispatch<React.SetStateAction<Cell[]>>;
  devices: Device[];
  setDevices: React.Dispatch<React.SetStateAction<Device[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  customColumns: CustomColumn[];
  setCustomColumns: React.Dispatch<React.SetStateAction<CustomColumn[]>>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [people, setPeople] = useState<Person[]>(mockPeople);
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [phases, setPhases] = useState<Phase[]>(mockPhases);
  const [cells, setCells] = useState<Cell[]>(mockCells);
  const [devices, setDevices] = useState<Device[]>(mockDevices);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);

  return (
    <DataContext.Provider value={{
      people, setPeople,
      projects, setProjects,
      phases, setPhases,
      cells, setCells,
      devices, setDevices,
      tasks, setTasks,
      customColumns, setCustomColumns,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
