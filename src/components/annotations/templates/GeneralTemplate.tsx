import { Label } from '@/components/ui/label';
import { RichTextEditor } from '../RichTextEditor';
import { GeneralTemplateData } from '@/lib/spreadsheet-types';
import { StickyNote } from 'lucide-react';

interface GeneralTemplateProps {
  data: GeneralTemplateData;
  onChange: (data: GeneralTemplateData) => void;
}

export function GeneralTemplate({ data, onChange }: GeneralTemplateProps) {
  return (
    <div className="space-y-4">
      {/* Conteúdo */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-slate-500" />
          Conteúdo
        </Label>
        <RichTextEditor
          content={data.content}
          onChange={(html) => onChange({ ...data, content: html })}
          placeholder="Digite o conteúdo da anotação..."
          minHeight="250px"
        />
      </div>
    </div>
  );
}

export default GeneralTemplate;
