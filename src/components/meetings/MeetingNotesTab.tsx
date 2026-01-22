import { useState, useMemo, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { MeetingNote } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus,
  Trash2,
  Pencil,
  Calendar,
  Users,
  Search,
  X,
  NotebookPen,
  Save,
  Download,
  Mail,
  Share2,
  FileText,
  Lightbulb,
  MessageSquare,
  Bell,
  StickyNote,
  Pin,
  Copy,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

// Note categories with colors and icons
const NOTE_CATEGORIES = [
  { id: 'meeting', label: 'Reunião', color: 'bg-blue-500', textColor: 'text-blue-600', bgLight: 'bg-blue-50 dark:bg-blue-500/10', borderColor: 'border-blue-200 dark:border-blue-500/30', icon: MessageSquare },
  { id: 'decision', label: 'Decisão', color: 'bg-emerald-500', textColor: 'text-emerald-600', bgLight: 'bg-emerald-50 dark:bg-emerald-500/10', borderColor: 'border-emerald-200 dark:border-emerald-500/30', icon: FileText },
  { id: 'idea', label: 'Ideia', color: 'bg-amber-500', textColor: 'text-amber-600', bgLight: 'bg-amber-50 dark:bg-amber-500/10', borderColor: 'border-amber-200 dark:border-amber-500/30', icon: Lightbulb },
  { id: 'reminder', label: 'Lembrete', color: 'bg-purple-500', textColor: 'text-purple-600', bgLight: 'bg-purple-50 dark:bg-purple-500/10', borderColor: 'border-purple-200 dark:border-purple-500/30', icon: Bell },
  { id: 'general', label: 'Geral', color: 'bg-slate-500', textColor: 'text-slate-600', bgLight: 'bg-slate-50 dark:bg-slate-500/10', borderColor: 'border-slate-200 dark:border-slate-500/30', icon: StickyNote },
] as const;

type NoteCategory = typeof NOTE_CATEGORIES[number]['id'];

// Extract category from participants array (we store it as first entry prefixed with "cat:")
const getNoteCategory = (note: MeetingNote): NoteCategory => {
  if (note.participants && note.participants.length > 0) {
    const catEntry = note.participants.find(p => p.startsWith('cat:'));
    if (catEntry) {
      const cat = catEntry.replace('cat:', '') as NoteCategory;
      if (NOTE_CATEGORIES.some(c => c.id === cat)) return cat;
    }
  }
  return 'general';
};

const getCategoryInfo = (category: NoteCategory) => {
  return NOTE_CATEGORIES.find(c => c.id === category) || NOTE_CATEGORIES[4];
};

// Get actual participants (excluding category marker)
const getActualParticipants = (participants?: string[]): string[] => {
  if (!participants) return [];
  return participants.filter(p => !p.startsWith('cat:'));
};

interface MeetingNotesTabProps {
  projectId: string;
}

export const MeetingNotesTab = ({ projectId }: MeetingNotesTabProps) => {
  const { meetingNotes, people, addMeetingNote, updateMeetingNote, deleteMeetingNote } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<MeetingNote | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<MeetingNote | null>(null);
  const [pinnedNotes, setPinnedNotes] = useState<Set<string>>(new Set());

  // Search and filter state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<NoteCategory | 'all'>('all');

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(new Date());
  const [participants, setParticipants] = useState('');
  const [category, setCategory] = useState<NoteCategory>('general');

  const projectNotes = useMemo(() => {
    return meetingNotes
      .filter(n => n.projectId === projectId)
      .sort((a, b) => {
        // Pinned first
        const aPinned = pinnedNotes.has(a.id);
        const bPinned = pinnedNotes.has(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime();
      });
  }, [meetingNotes, projectId, pinnedNotes]);

  // Filtered notes based on search and category
  const filteredNotes = useMemo(() => {
    let notes = projectNotes;

    if (categoryFilter !== 'all') {
      notes = notes.filter(note => getNoteCategory(note) === categoryFilter);
    }

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      notes = notes.filter(note =>
        note.title.toLowerCase().includes(searchLower) ||
        note.content.toLowerCase().includes(searchLower)
      );
    }

    return notes;
  }, [projectNotes, search, categoryFilter]);

  // Category counts for filter pills
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: projectNotes.length };
    NOTE_CATEGORIES.forEach(cat => {
      counts[cat.id] = projectNotes.filter(n => getNoteCategory(n) === cat.id).length;
    });
    return counts;
  }, [projectNotes]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setMeetingDate(new Date());
    setParticipants('');
    setCategory('general');
    setEditingNote(null);
  };

  const handleOpenModal = (note?: MeetingNote) => {
    if (note) {
      setEditingNote(note);
      setTitle(note.title);
      setContent(note.content);
      setMeetingDate(new Date(note.meetingDate));
      setCategory(getNoteCategory(note));
      const actualParticipants = getActualParticipants(note.participants);
      // Handle participants - could be UUID or names
      const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      const names = actualParticipants
        .map(entry => isUUID(entry) ? (people.find(p => p.id === entry)?.name || entry) : entry)
        .join(', ');
      setParticipants(names);
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
    if (!meetingDate) {
      toast.error('Data é obrigatória');
      return;
    }

    try {
      // Build participants array with category marker
      const participantsArray = participants
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      // Add category as first entry
      const fullParticipants = [`cat:${category}`, ...participantsArray];

      if (editingNote) {
        await updateMeetingNote(editingNote.id, {
          title: title.trim(),
          content: content.trim(),
          meetingDate: meetingDate.toISOString().split('T')[0],
          participants: fullParticipants,
        });
        toast.success('Anotação atualizada!');
      } else {
        await addMeetingNote({
          projectId,
          title: title.trim(),
          content: content.trim(),
          meetingDate: meetingDate.toISOString().split('T')[0],
          participants: fullParticipants,
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

  const togglePin = (noteId: string) => {
    setPinnedNotes(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  };

  const handleCopyToClipboard = async (note: MeetingNote) => {
    const catInfo = getCategoryInfo(getNoteCategory(note));
    const actualParticipants = getActualParticipants(note.participants);
    const text = `[${catInfo.label}] ${note.title}\nData: ${format(new Date(note.meetingDate), 'dd/MM/yyyy', { locale: ptBR })}${actualParticipants.length > 0 ? `\nParticipantes: ${actualParticipants.join(', ')}` : ''}\n\n${note.content}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copiado para a área de transferência');
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const handleExportPDF = (note: MeetingNote) => {
    const catInfo = getCategoryInfo(getNoteCategory(note));
    const actualParticipants = getActualParticipants(note.participants);
    const printContent = `
      <!DOCTYPE html>
      <html><head><title>${note.title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; line-height: 1.6; }
        h1 { color: #1a1a1a; margin-bottom: 8px; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-bottom: 16px; background: #f0f0f0; }
        .meta { background: #f5f5f5; padding: 15px 20px; border-radius: 8px; margin-bottom: 25px; }
        .meta p { margin: 5px 0; color: #666; }
        .meta strong { color: #333; }
        .content { white-space: pre-wrap; background: #fafafa; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; }
        .footer { margin-top: 30px; font-size: 12px; color: #999; border-top: 1px solid #e5e5e5; padding-top: 15px; }
      </style></head><body>
        <div class="badge">${catInfo.label}</div>
        <h1>${note.title}</h1>
        <div class="meta">
          <p><strong>Data:</strong> ${format(new Date(note.meetingDate), 'dd/MM/yyyy', { locale: ptBR })}</p>
          ${actualParticipants.length > 0 ? `<p><strong>Participantes:</strong> ${actualParticipants.join(', ')}</p>` : ''}
        </div>
        <div class="content">${note.content}</div>
        <div class="footer">Criado em: ${format(new Date(note.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
      </body></html>`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();
    }
  };

  const handleShareEmail = (note: MeetingNote) => {
    const catInfo = getCategoryInfo(getNoteCategory(note));
    const subject = encodeURIComponent(`[${catInfo.label}] ${note.title}`);
    const body = encodeURIComponent(`${note.title}\nData: ${format(new Date(note.meetingDate), 'dd/MM/yyyy', { locale: ptBR })}\n\n${note.content}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-[hsl(207,90%,45%)] to-[hsl(130,70%,40%)]">
            <StickyNote className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Anotações do Projeto</h3>
            <p className="text-xs text-muted-foreground">{projectNotes.length} {projectNotes.length === 1 ? 'anotação' : 'anotações'}</p>
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar anotações..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button onClick={() => handleOpenModal()} className="gradient-primary text-white">
            <Plus className="w-4 h-4 mr-2" />
            Nova Anotação
          </Button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setCategoryFilter('all')}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
            categoryFilter === 'all'
              ? "bg-foreground text-background border-foreground"
              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
          )}
        >
          Todas ({categoryCounts.all})
        </button>
        {NOTE_CATEGORIES.map(cat => (
          categoryCounts[cat.id] > 0 && (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all border flex items-center gap-1.5",
                categoryFilter === cat.id
                  ? cn(cat.bgLight, cat.textColor, cat.borderColor)
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
              )}
            >
              <div className={cn("w-2 h-2 rounded-full", cat.color)} />
              {cat.label} ({categoryCounts[cat.id]})
            </button>
          )
        ))}
      </div>

      {/* Notes Grid */}
      {projectNotes.length === 0 ? (
        <div className="text-center py-16 bg-muted/20 rounded-xl border-2 border-dashed border-border">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(207,90%,45%)]/10 to-[hsl(130,70%,40%)]/10 flex items-center justify-center mx-auto mb-4">
            <StickyNote className="w-8 h-8 text-primary opacity-60" />
          </div>
          <p className="text-base font-medium mb-1">Nenhuma anotação ainda</p>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            Registre decisões, ideias, lembretes e tudo que é importante para o projeto
          </p>
          <Button onClick={() => handleOpenModal()} className="gradient-primary text-white">
            <Plus className="w-4 h-4 mr-2" />
            Criar primeira anotação
          </Button>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
          <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground font-medium">Nenhuma anotação encontrada</p>
          <p className="text-sm text-muted-foreground mt-1">Tente ajustar o filtro ou termo de busca</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSearch(''); setCategoryFilter('all'); }}>
            Limpar filtros
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const catInfo = getCategoryInfo(getNoteCategory(note));
            const CatIcon = catInfo.icon;
            const isPinned = pinnedNotes.has(note.id);
            const actualParticipants = getActualParticipants(note.participants);
            const contentPreview = note.content.length > 120 ? note.content.slice(0, 120) + '...' : note.content;

            return (
              <div
                key={note.id}
                className={cn(
                  "group bg-card rounded-xl border overflow-hidden shadow-soft hover:shadow-md transition-all relative",
                  isPinned ? "ring-2 ring-primary/30" : "border-border"
                )}
              >
                {/* Category Color Strip */}
                <div className={cn("h-1", catInfo.color)} />

                {/* Card Content */}
                <div className="p-4 space-y-3">
                  {/* Top row: category + date + pin */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold", catInfo.bgLight, catInfo.textColor)}>
                        <CatIcon className="w-3 h-3" />
                        {catInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => togglePin(note.id)}
                        className={cn(
                          "p-1 rounded hover:bg-muted transition-colors",
                          isPinned ? "text-primary" : "text-muted-foreground opacity-0 group-hover:opacity-100"
                        )}
                        title={isPinned ? 'Desafixar' : 'Fixar'}
                      >
                        <Pin className={cn("w-3.5 h-3.5", isPinned && "fill-current")} />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h4 className="font-semibold text-sm leading-snug line-clamp-2">{note.title}</h4>

                  {/* Content Preview */}
                  {note.content && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {contentPreview}
                    </p>
                  )}

                  {/* Participants */}
                  {actualParticipants.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-[11px] text-muted-foreground truncate">
                        {actualParticipants.join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Footer: date + actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span className="text-[11px]">
                        {format(new Date(note.meetingDate), 'dd MMM yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCopyToClipboard(note)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar texto
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportPDF(note)}>
                            <Download className="w-4 h-4 mr-2" />
                            Exportar PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShareEmail(note)}>
                            <Mail className="w-4 h-4 mr-2" />
                            Enviar por email
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <button
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => handleOpenModal(note)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-muted text-destructive/70 hover:text-destructive transition-colors"
                        onClick={() => handleDeleteClick(note)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[hsl(207,90%,45%)]/20 to-[hsl(130,70%,40%)]/20 text-primary">
                {editingNote ? <Pencil className="w-5 h-5" /> : <NotebookPen className="w-5 h-5" />}
              </div>
              <DialogTitle className="text-lg">
                {editingNote ? 'Editar Anotação' : 'Nova Anotação'}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Category Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <div className="flex flex-wrap gap-2">
                {NOTE_CATEGORIES.map(cat => {
                  const CatIcon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                        category === cat.id
                          ? cn(cat.bgLight, cat.textColor, cat.borderColor, "shadow-sm")
                          : "border-border hover:bg-muted/50 text-muted-foreground"
                      )}
                    >
                      <CatIcon className="w-4 h-4" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Título</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Definição de escopo, Brainstorm ideias, Lembrar de..."
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Data</label>
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
                    {meetingDate ? format(meetingDate, 'PPP', { locale: ptBR }) : <span>Selecione uma data</span>}
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

            {/* Participants (optional) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Participantes <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Input
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                placeholder="Ex: João, Maria, Pedro..."
              />
              <p className="text-xs text-muted-foreground">
                Separe os nomes por vírgula
              </p>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Conteúdo</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Descreva os pontos importantes, decisões, ideias..."
                className="min-h-[180px] resize-y"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="gradient-primary text-white">
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
              Tem certeza que deseja excluir "{noteToDelete?.title}"?
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
