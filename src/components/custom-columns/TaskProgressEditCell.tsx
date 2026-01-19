import { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TaskProgressEditCellProps {
  quantity: number | undefined;
  collected: number | undefined;
  progress: number;
  onSave: (quantity: number, collected: number) => void;
}

export const TaskProgressEditCell = ({ 
  quantity, 
  collected, 
  progress, 
  onSave 
}: TaskProgressEditCellProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localQuantity, setLocalQuantity] = useState(quantity ?? 100);
  const [localCollected, setLocalCollected] = useState(collected ?? 0);

  useEffect(() => {
    setLocalQuantity(quantity ?? 100);
    setLocalCollected(collected ?? 0);
  }, [quantity, collected]);

  const localProgress = localQuantity > 0 
    ? Math.round((localCollected / localQuantity) * 100) 
    : 0;

  const handleSliderChange = (value: number[]) => {
    const newCollected = Math.round((value[0] / 100) * localQuantity);
    setLocalCollected(newCollected);
  };

  const handleSave = () => {
    onSave(localQuantity, localCollected);
    setIsOpen(false);
  };

  const quickValues = [0, 25, 50, 75, 100];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="group flex items-center gap-1 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors min-h-[28px]">
          <ProgressBar value={progress} showLabel size="sm" className="min-w-[80px]" />
          <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progresso</span>
            <span className="text-lg font-bold text-primary">{localProgress}%</span>
          </div>
          
          <Slider
            value={[localProgress]}
            onValueChange={handleSliderChange}
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
                onClick={() => {
                  const newCollected = Math.round((qv / 100) * localQuantity);
                  setLocalCollected(newCollected);
                }}
              >
                {qv}%
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="space-y-1">
              <Label className="text-xs">Quantidade Total</Label>
              <Input
                type="number"
                min={1}
                value={localQuantity}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value));
                  setLocalQuantity(val);
                  // Ajusta coletados se maior que quantidade
                  if (localCollected > val) {
                    setLocalCollected(val);
                  }
                }}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Coletados</Label>
              <Input
                type="number"
                min={0}
                max={localQuantity}
                value={localCollected}
                onChange={(e) => {
                  const val = Math.min(localQuantity, Math.max(0, Number(e.target.value)));
                  setLocalCollected(val);
                }}
                className="h-8 text-sm"
              />
            </div>
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
