import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { MeetingNote, NoteCategory } from '@/lib/types';
import {
  NoteTemplateData,
  MeetingTemplateData,
  DecisionTemplateData,
  IdeaTemplateData,
  ReminderTemplateData,
  GeneralTemplateData,
  createDefaultMeetingData,
  createDefaultDecisionData,
  createDefaultIdeaData,
  createDefaultReminderData,
  createDefaultGeneralData,
} from '@/lib/spreadsheet-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Pencil,
  NotebookPen,
  Calendar,
  MessageSquare,
  FileText,
  Lightbulb,
  Bell,
  StickyNote,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { MeetingTemplate } from './templates/MeetingTemplate';
import { DecisionTemplate } from './templates/DecisionTemplate';
import { IdeaTemplate } from './templates/IdeaTemplate';
import { ReminderTemplate } from './templates/ReminderTemplate';
import { GeneralTemplate } from './templates/GeneralTemplate';

// Note categories with colors and icons
export const NOTE_CATEGORIES = [
  { id: 'meeting' as const, label: 'Reunião', color: 'bg-blue-500', textColor: 'text-blue-600', bgLight: 'bg-blue-50 dark:bg-blue-500/10', borderColor: 'border-blue-200 dark:border-blue-500/30', icon: MessageSquare },
  { id: 'decision' as const, label: 'Decisão', color: 'bg-emerald-500', textColor: 'text-emerald-600', bgLight: 'bg-emerald-50 dark:bg-emerald-500/10', borderColor: 'border-emerald-200 dark:border-emerald-500/30', icon: FileText },
  { id: 'idea' as const, label: 'Ideia', color: 'bg-amber-500', textColor: 'text-amber-600', bgLight: 'bg-amber-50 dark:bg-amber-500/10', borderColor: 'border-amber-200 dark:border-amber-500/30', icon: Lightbulb },
  { id: 'reminder' as const, label: 'Lembrete', color: 'bg-purple-500', textColor: 'text-purple-600', bgLight: 'bg-purple-50 dark:bg-purple-500/10', borderColor: 'border-purple-200 dark:border-purple-500/30', icon: Bell },
  { id: 'general' as const, label: 'Geral', color: 'bg-slate-500', textColor: 'text-slate-600', bgLight: 'bg-slate-50 dark:bg-slate-500/10', borderColor: 'border-slate-200 dark:border-slate-500/30', icon: StickyNote },
] as const;

export const getCategoryInfo = (category: NoteCategory) => {
  return NOTE_CATEGORIES.find(c => c.id === category) || NOTE_CATEGORIES[4];
};

// Extract category from note (supports both old participants-based and new category field)
export const getNoteCategory = (note: MeetingNote): NoteCategory => {
  // First check new category field
  if (note.category) return note.category;

  // Fallback to old participants-based category
  if (note.participants && note.participants.length > 0) {
    const catEntry = note.participants.find(p => p.startsWith('cat:'));
    if (catEntry) {
      const cat = catEntry.replace('cat:', '') as NoteCategory;
      if (NOTE_CATEGORIES.some(c => c.id === cat)) return cat;
    }
  }
  return 'general';
};

// Get actual participants (excluding category marker)
export const getActualParticipants = (participants?: string[]): string[] => {
  if (!participants) return [];
  return participants.filter(p => !p.startsWith('cat:'));
};

// Get default template data based on category
const getDefaultTemplateData = (category: NoteCategory): NoteTemplateData => {
  switch (category) {
    case 'meeting': return createDefaultMeetingData();
    case 'decision': return createDefaultDecisionData();
    case 'idea': return createDefaultIdeaData();
    case 'reminder': return createDefaultReminderData();
    case 'general': return createDefaultGeneralData();
  }
};

interface NoteFormModalProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingNote?: MeetingNote | null;
  onSuccess?: () => void;
}

export function NoteFormModal({
  projectId,
  open,
  onOpenChange,
  editingNote,
  onSuccess,
}: NoteFormModalProps) {
  const { addMeetingNote, updateMeetingNote, people } = useData();

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<NoteCategory>('general');
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(new Date());
  const [meetingDateOpen, setMeetingDateOpen] = useState(false);
  const [templateData, setTemplateData] = useState<NoteTemplateData>(createDefaultGeneralData());
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when modal opens/closes or editingNote changes
  useEffect(() => {
    if (open) {
      if (editingNote) {
        setTitle(editingNote.title);
        setCategory(getNoteCategory(editingNote));
        setMeetingDate(new Date(editingNote.meetingDate));

        // Load template data if exists, otherwise create from old content
        if (editingNote.templateData) {
          setTemplateData(editingNote.templateData);
        } else {
          // Migrate old content to template data
          const cat = getNoteCategory(editingNote);
          const defaultData = getDefaultTemplateData(cat);

          if (cat === 'general') {
            setTemplateData({ content: editingNote.content } as GeneralTemplateData);
          } else if (cat === 'meeting') {
            const actualParticipants = getActualParticipants(editingNote.participants);
            setTemplateData({
              ...defaultData,
              agenda: editingNote.content,
              participants: actualParticipants,
            } as MeetingTemplateData);
          } else {
            // For other categories, put old content in the main field
            setTemplateData(defaultData);
          }
        }
      } else {
        // New note - reset form
        setTitle('');
        setCategory('general');
        setMeetingDate(new Date());
        setTemplateData(createDefaultGeneralData());
      }
    }
  }, [open, editingNote]);

  // Update template data when category changes
  const handleCategoryChange = (newCategory: NoteCategory) => {
    setCategory(newCategory);
    setTemplateData(getDefaultTemplateData(newCategory));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    if (!meetingDate) {
      toast.error('Data é obrigatória');
      return;
    }

    setIsSaving(true);
    try {
      // Build content from template data for backward compatibility
      let content = '';
      if (category === 'general') {
        content = (templateData as GeneralTemplateData).content || '';
      } else if (category === 'meeting') {
        const data = templateData as MeetingTemplateData;
        content = data.agenda || '';
      } else if (category === 'decision') {
        const data = templateData as DecisionTemplateData;
        content = data.finalDecision || data.context || '';
      } else if (category === 'idea') {
        const data = templateData as IdeaTemplateData;
        content = data.description || '';
      } else if (category === 'reminder') {
        const data = templateData as ReminderTemplateData;
        content = data.description || '';
      }

      // Build participants array (for meeting template)
      let participants: string[] = [`cat:${category}`];
      if (category === 'meeting') {
        const meetingData = templateData as MeetingTemplateData;
        participants = [`cat:${category}`, ...meetingData.participants];
      }

      const noteData = {
        title: title.trim(),
        content,
        meetingDate: meetingDate.toISOString().split('T')[0],
        participants,
        category,
        templateData,
      };

      if (editingNote) {
        await updateMeetingNote(editingNote.id, noteData);
        toast.success('Anotação atualizada!');
      } else {
        await addMeetingNote({
          projectId,
          ...noteData,
        });
        toast.success('Anotação criada!');
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar anotação');
    } finally {
      setIsSaving(false);
    }
  };

  const renderTemplate = () => {
    switch (category) {
      case 'meeting':
        return (
          <MeetingTemplate
            data={templateData as MeetingTemplateData}
            onChange={(data) => setTemplateData(data)}
          />
        );
      case 'decision':
        return (
          <DecisionTemplate
            data={templateData as DecisionTemplateData}
            onChange={(data) => setTemplateData(data)}
          />
        );
      case 'idea':
        return (
          <IdeaTemplate
            data={templateData as IdeaTemplateData}
            onChange={(data) => setTemplateData(data)}
          />
        );
      case 'reminder':
        return (
          <ReminderTemplate
            data={templateData as ReminderTemplateData}
            onChange={(data) => setTemplateData(data)}
          />
        );
      case 'general':
      default:
        return (
          <GeneralTemplate
            data={templateData as GeneralTemplateData}
            onChange={(data) => setTemplateData(data)}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editingNote ? (
              <>
                <Pencil className="h-5 w-5 text-muted-foreground" />
                Editar Anotação
              </>
            ) : (
              <>
                <NotebookPen className="h-5 w-5 text-muted-foreground" />
                Nova Anotação
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Category Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Categoria</Label>
            <div className="flex flex-wrap gap-2">
              {NOTE_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryChange(cat.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                      isSelected
                        ? `${cat.bgLight} ${cat.borderColor} ${cat.textColor}`
                        : 'border-border bg-background hover:bg-muted'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">Título</Label>
            <Input
              id="title"
              placeholder="Ex: Definição de escopo, Brainstorm ideias, Lembrar de..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Data</Label>
            <Popover open={meetingDateOpen} onOpenChange={setMeetingDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !meetingDate && 'text-muted-foreground'
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {meetingDate
                    ? format(meetingDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
                    : 'Selecionar data...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={meetingDate}
                  onSelect={(date) => {
                    setMeetingDate(date);
                    setMeetingDateOpen(false);
                  }}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Dynamic Template Content */}
          <div className="border-t pt-4">
            {renderTemplate()}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gradient-primary text-white"
          >
            {isSaving ? 'Salvando...' : 'Criar Anotação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default NoteFormModal;
