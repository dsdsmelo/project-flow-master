import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StickyNote, Table2 } from 'lucide-react';
import { NotesListView } from './NotesListView';
import { SpreadsheetTab } from '@/components/spreadsheet/SpreadsheetTab';

interface AnnotationsTabProps {
  projectId: string;
}

export function AnnotationsTab({ projectId }: AnnotationsTabProps) {
  const [activeTab, setActiveTab] = useState('notes');

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Anotações
          </TabsTrigger>
          <TabsTrigger value="tables" className="flex items-center gap-2">
            <Table2 className="h-4 w-4" />
            Tabelas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="mt-4">
          <NotesListView projectId={projectId} />
        </TabsContent>

        <TabsContent value="tables" className="mt-4">
          <SpreadsheetTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AnnotationsTab;
