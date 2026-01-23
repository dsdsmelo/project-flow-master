import { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TaskProgressEditCellProps {
  progress: number;
  onSave: (progress: number) => void;
}

export const TaskProgressEditCell = ({ progress, onSave }: TaskProgressEditCellProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localProgress, setLocalProgress] = useState(progress);

  useEffect(() => {
    setLocalProgress(progress);
  }, [progress]);

  const handleSave = () => {
    onSave(localProgress);
    setIsOpen(false);
  };

  const quickValues = [0, 25, 50, 75, 100];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="group flex items-center gap-1 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors min-h-[22px]">
          <ProgressBar value={progress} showLabel size="sm" className="min-w-[60px]" />
          <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progresso</span>
            <span className="text-lg font-bold text-primary">{localProgress}%</span>
          </div>
          
          <Slider
            value={[localProgress]}
            onValueChange={([v]) => setLocalProgress(v)}
            max={100}
            step={1}
            className="w-full"
          />

          <div className="flex gap-1 flex-wrap">
            {quickValues.map((qv) => (
              <Button
                key={qv}
                variant={localProgress === qv ? "default" : "outline"}
                size="sm"
                className="flex-1 min-w-[40px]"
                onClick={() => setLocalProgress(qv)}
              >
                {qv}%
              </Button>
            ))}
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" className="flex-1" onClick={handleSave}>
              Salvar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
