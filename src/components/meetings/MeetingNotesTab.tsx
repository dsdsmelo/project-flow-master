import { useState, useMemo, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { MeetingNote } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TablePagination } from '@/components/ui/table-pagination';
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
  Save,
  Download,
  Mail,
  Share2,
  Search,
  X,
  NotebookPen
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

  // Search and pagination state
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(new Date());
  const [participants, setParticipants] = useState('');

  const projectNotes = useMemo(() => {
    return meetingNotes
      .filter(n => n.projectId === projectId)
      .sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime());
  }, [meetingNotes, projectId]);

  // Filtered notes based on search
  const filteredNotes = useMemo(() => {
    if (!search.trim()) return projectNotes;
    const searchLower = search.toLowerCase();
    return projectNotes.filter(note =>
      note.title.toLowerCase().includes(searchLower) ||
      note.content.toLowerCase().includes(searchLower)
    );
  }, [projectNotes, search]);

  // Paginated notes
  const paginatedNotes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredNotes.slice(start, end);
  }, [filteredNotes, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredNotes.length / pageSize);

  // Reset to page 1 when search changes
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const activePeople = useMemo(() => {
    return people.filter(p => p.active);
  }, [people]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setMeetingDate(new Date());
    setParticipants('');
    setEditingNote(null);
  };

  const handleOpenModal = (note?: MeetingNote) => {
    if (note) {
      setEditingNote(note);
      setTitle(note.title);
      setContent(note.content);
      setMeetingDate(new Date(note.meetingDate));
      // Handle participants - could be string[] (old) or string (new)
      if (Array.isArray(note.participants)) {
        // Convert old format: look up names or join IDs
        const names = note.participants
          .map(id => people.find(p => p.id === id)?.name || id)
          .join(', ');
        setParticipants(names);
      } else {
        setParticipants((note.participants as unknown as string) || '');
      }
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
      // Parse participants text to array (split by comma, trim whitespace)
      const participantsArray = participants
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);
        
      if (editingNote) {
        await updateMeetingNote(editingNote.id, {
          title: title.trim(),
          content: content.trim(),
          meetingDate: meetingDate.toISOString().split('T')[0],
          participants: participantsArray,
        });
        toast.success('Anotação atualizada!');
      } else {
        await addMeetingNote({
          projectId,
          title: title.trim(),
          content: content.trim(),
          meetingDate: meetingDate.toISOString().split('T')[0],
          participants: participantsArray,
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

  // Get participant display text (handles both old format with IDs and new format with names)
  const getParticipantDisplay = (participantData?: string[]) => {
    if (!participantData || participantData.length === 0) return '';
    
    // Check if entries look like UUIDs (old format) or names (new format)
    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    
    return participantData
      .map(entry => {
        if (isUUID(entry)) {
          const person = people.find(p => p.id === entry);
          return person?.name || entry;
        }
        return entry;
      })
      .join(', ');
  };

  const generateNoteText = (note: MeetingNote) => {
    const participantNames = getParticipantDisplay(note.participants);
    
    return `
ANOTAÇÃO DE REUNIÃO
==================

Título: ${note.title}
Data: ${format(new Date(note.meetingDate), 'dd/MM/yyyy', { locale: ptBR })}
${participantNames ? `Participantes: ${participantNames}` : ''}

CONTEÚDO
--------
${note.content}

---
Última atualização: ${format(new Date(note.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
    `.trim();
  };

  const handleExportPDF = (note: MeetingNote) => {
    const participantNames = getParticipantDisplay(note.participants);
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${note.title}</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            padding: 40px; 
            max-width: 800px; 
            margin: 0 auto;
            color: #333;
            line-height: 1.6;
          }
          h1 { 
            color: #1a1a1a; 
            border-bottom: 2px solid #e5e5e5; 
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .meta { 
            background: #f5f5f5; 
            padding: 15px 20px; 
            border-radius: 8px; 
            margin-bottom: 25px;
          }
          .meta p { margin: 5px 0; color: #666; }
          .meta strong { color: #333; }
          .content { 
            white-space: pre-wrap; 
            background: #fafafa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
          }
          .footer { 
            margin-top: 30px; 
            font-size: 12px; 
            color: #999; 
            border-top: 1px solid #e5e5e5;
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
        <h1>${note.title}</h1>
        <div class="meta">
          <p><strong>Data da Reunião:</strong> ${format(new Date(note.meetingDate), 'dd/MM/yyyy', { locale: ptBR })}</p>
          ${participantNames ? `<p><strong>Participantes:</strong> ${participantNames}</p>` : ''}
        </div>
        <h2>Conteúdo</h2>
        <div class="content">${note.content}</div>
        <div class="footer">
          Última atualização: ${format(new Date(note.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
      toast.success('Janela de impressão aberta - salve como PDF');
    } else {
      toast.error('Não foi possível abrir a janela de impressão');
    }
  };

  const handleShareEmail = (note: MeetingNote) => {
    const text = generateNoteText(note);
    const subject = encodeURIComponent(`Anotação de Reunião: ${note.title}`);
    const body = encodeURIComponent(text);
    
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    toast.success('Cliente de email aberto');
  };

  const handleCopyToClipboard = async (note: MeetingNote) => {
    const text = generateNoteText(note);
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Anotação copiada para a área de transferência');
    } catch (err) {
      toast.error('Erro ao copiar');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Anotações de Reuniões</h3>
          <span className="text-sm text-muted-foreground">({filteredNotes.length})</span>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar reuniões..."
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
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Anotação
          </Button>
        </div>
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
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
          <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Nenhuma anotação encontrada</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tente ajustar os termos de busca
          </p>
          <Button variant="outline" className="mt-4" onClick={() => handleSearchChange('')}>
            Limpar Busca
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedNotes.map((note) => {
            const isExpanded = expandedNote === note.id;
            const participantText = getParticipantDisplay(note.participants);
            
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
                    {participantText && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {participantText}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Share Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => handleExportPDF(note)}>
                          <Download className="w-4 h-4 mr-2" />
                          Exportar PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShareEmail(note)}>
                          <Mail className="w-4 h-4 mr-2" />
                          Enviar por Email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyToClipboard(note)}>
                          <FileText className="w-4 h-4 mr-2" />
                          Copiar Texto
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                    {participantText && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Participantes:</p>
                        <p className="text-sm">{participantText}</p>
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

          {/* Pagination */}
          {filteredNotes.length > 0 && (
            <div className="bg-card rounded-xl border border-border shadow-soft">
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredNotes.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400">
                {editingNote ? <Pencil className="w-5 h-5" /> : <NotebookPen className="w-5 h-5" />}
              </div>
              <DialogTitle className="text-lg">
                {editingNote ? 'Editar Anotação' : 'Nova Anotação de Reunião'}
              </DialogTitle>
            </div>
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

            {/* Participants - Free text input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Participantes</label>
              <Input
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                placeholder="Ex: João Silva, Maria Santos, Pedro Oliveira..."
              />
              <p className="text-xs text-muted-foreground">
                Separe os nomes por vírgula
              </p>
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
