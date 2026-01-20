import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { MeetingNote } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AvatarCircle } from '@/components/ui/avatar-circle';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, 
  Trash2, 
  Pencil, 
  Calendar,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  Save
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface MeetingNotesTabProps {
  projectId: string;
}

export const MeetingNotesTab = ({ projectId }: MeetingNotesTabProps) => {
  const { meetingNotes, people, addMeetingNote, updateMeetingNote, deleteMeetingNote } = useData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<MeetingNote | null>(null);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<MeetingNote | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(new Date());
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  
  const projectNotes = useMemo(() => {
    return meetingNotes
      .filter(n => n.projectId === projectId)
      .sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime());
  }, [meetingNotes, projectId]);

  const activePeople = useMemo(() => {
    return people.filter(p => p.active);
  }, [people]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setMeetingDate(new Date());
    setSelectedParticipants([]);
    setEditingNote(null);
  };

  const handleOpenModal = (note?: MeetingNote) => {
    if (note) {
      setEditingNote(note);
      setTitle(note.title);
      setContent(note.content);
      setMeetingDate(new Date(note.meetingDate));
      setSelectedParticipants(note.participants || []);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    if (!content.trim()) {
      toast.error('Conteúdo é obrigatório');
      return;
    }
    if (!meetingDate) {
      toast.error('Data da reunião é obrigatória');
      return;
    }

    try {
      if (editingNote) {
        await updateMeetingNote(editingNote.id, {
          title: title.trim(),
          content: content.trim(),
          meetingDate: meetingDate.toISOString().split('T')[0],
          participants: selectedParticipants,
        });
        toast.success('Anotação atualizada!');
      } else {
        await addMeetingNote({
          projectId,
          title: title.trim(),
          content: content.trim(),
          meetingDate: meetingDate.toISOString().split('T')[0],
          participants: selectedParticipants,
        });
        toast.success('Anotação criada!');
      }
      handleCloseModal();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar anotação');
    }
  };

  const handleDeleteClick = (note: MeetingNote) => {
    setNoteToDelete(note);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;
    try {
      await deleteMeetingNote(noteToDelete.id);
      toast.success('Anotação excluída!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir anotação');
    } finally {
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
    }
  };

  const toggleParticipant = (personId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(personId) 
        ? prev.filter(id => id !== personId)
        : [...prev, personId]
    );
  };

  const getParticipantNames = (participantIds?: string[]) => {
    if (!participantIds || participantIds.length === 0) return [];
    return participantIds
      .map(id => people.find(p => p.id === id))
      .filter(Boolean);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Anotações de Reuniões</h3>
          <span className="text-sm text-muted-foreground">({projectNotes.length})</span>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Anotação
        </Button>
      </div>

      {/* Notes List */}
      {projectNotes.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Nenhuma anotação de reunião</p>
          <p className="text-sm text-muted-foreground mt-1">
            Registre as decisões e discussões importantes do projeto
          </p>
          <Button variant="outline" className="mt-4" onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Criar primeira anotação
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {projectNotes.map((note) => {
            const isExpanded = expandedNote === note.id;
            const participants = getParticipantNames(note.participants);
            
            return (
              <div 
                key={note.id} 
                className="bg-card rounded-xl border border-border shadow-soft overflow-hidden"
              >
                {/* Note Header */}
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedNote(isExpanded ? null : note.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {format(new Date(note.meetingDate), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    <h4 className="font-medium truncate">{note.title}</h4>
                    {participants.length > 0 && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <div className="flex -space-x-2">
                          {participants.slice(0, 3).map((person: any) => (
                            <AvatarCircle 
                              key={person.id} 
                              name={person.name} 
                              color={person.color} 
                              size="sm" 
                            />
                          ))}
                          {participants.length > 3 && (
                            <span className="text-xs text-muted-foreground ml-2">
                              +{participants.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(note);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(note);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Note Content (Expanded) */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-4">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <div className="whitespace-pre-wrap text-sm text-foreground/90">
                        {note.content}
                      </div>
                    </div>
                    {participants.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Participantes:</p>
                        <div className="flex flex-wrap gap-2">
                          {participants.map((person: any) => (
                            <div 
                              key={person.id}
                              className="flex items-center gap-2 px-2 py-1 bg-muted rounded-full"
                            >
                              <AvatarCircle name={person.name} color={person.color} size="sm" />
                              <span className="text-sm">{person.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-4">
                      Última atualização: {format(new Date(note.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? 'Editar Anotação' : 'Nova Anotação de Reunião'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Título</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Alinhamento Sprint 3, Kickoff do projeto..."
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Data da Reunião</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !meetingDate && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {meetingDate ? (
                      format(meetingDate, 'PPP', { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={meetingDate}
                    onSelect={setMeetingDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Participants */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Participantes</label>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                {activePeople.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma pessoa cadastrada</p>
                ) : (
                  <div className="space-y-2">
                    {activePeople.map((person) => (
                      <div 
                        key={person.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleParticipant(person.id)}
                      >
                        <Checkbox 
                          checked={selectedParticipants.includes(person.id)}
                          onCheckedChange={() => toggleParticipant(person.id)}
                        />
                        <AvatarCircle name={person.name} color={person.color} size="sm" />
                        <span className="text-sm">{person.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedParticipants.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedParticipants.length} participante(s) selecionado(s)
                </p>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Conteúdo / Ata da Reunião</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Registre os principais pontos discutidos, decisões tomadas, próximos passos..."
                className="min-h-[200px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              {editingNote ? 'Salvar' : 'Criar Anotação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Anotação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a anotação "{noteToDelete?.title}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
