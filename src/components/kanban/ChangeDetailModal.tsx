import { useState, useEffect } from 'react';
import { ExternalLink, Clock, Tag, FileText, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Change, updateChangeNotes, updateChangePriority, updateChangeStatus } from '@/lib/changesApi';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChangeDetailModalProps {
  change: Change | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function ChangeDetailModal({ change, open, onOpenChange, onUpdate }: ChangeDetailModalProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Change['priority']>('normal');
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (change) {
      setNotes(change.notes || '');
      setPriority(change.priority);
    }
  }, [change]);

  if (!change) return null;

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      await updateChangeNotes(change.id, notes);
      toast({
        title: 'Notas guardadas',
        description: 'Las notas se han actualizado correctamente',
      });
      onUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron guardar las notas',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePriority = async (newPriority: Change['priority']) => {
    setPriority(newPriority);
    try {
      await updateChangePriority(change.id, newPriority);
      toast({
        title: 'Prioridad actualizada',
      });
      onUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la prioridad',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAs = async (status: Change['status']) => {
    try {
      await updateChangeStatus(change.id, status);
      toast({
        title: 'Estado actualizado',
        description: `El cambio ha sido marcado como ${
          status === 'relevant' ? 'relevante' :
          status === 'discarded' ? 'descartado' :
          status === 'reviewing' ? 'en revisión' : 'pendiente'
        }`,
      });
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive',
      });
    }
  };

  const analyzeWithAI = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-change', {
        body: { changeId: change.id }
      });

      if (error) throw error;

      toast({
        title: 'Análisis completado',
        description: 'El cambio ha sido analizado con IA',
      });

      onUpdate();
    } catch (error) {
      console.error('Error analyzing:', error);
      toast({
        title: 'Error',
        description: 'No se pudo analizar el cambio',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sourceTypeLabels = {
    fundacion: 'Fundación',
    ente_publico: 'Ente Público',
    otra_fuente: 'Otra Fuente',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{change.source_name || 'Detalle del Cambio'}</DialogTitle>
          <DialogDescription>
            {change.source_type && sourceTypeLabels[change.source_type]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* URL */}
          <div className="space-y-2">
            <Label>URL Afectada</Label>
            <div className="flex gap-2">
              <div className="flex-1 p-2 bg-muted rounded-md text-sm break-all">
                {change.url}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(change.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Detected Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Detectado {formatDistanceToNow(new Date(change.detected_at), {
                addSuffix: true,
                locale: es,
              })}
            </span>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Prioridad</Label>
            <Select value={priority} onValueChange={handleChangePriority}>
              <SelectTrigger id="priority">
                <Tag className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          {change.changes_description && (
            <div className="space-y-2">
              <Label>Descripción del Cambio</Label>
              <div className="p-3 bg-muted rounded-md text-sm">
                {change.changes_description}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="notes">Notas de Revisión</Label>
              <Button
                onClick={analyzeWithAI}
                disabled={isAnalyzing}
                size="sm"
                variant="outline"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isAnalyzing ? 'Analizando con IA...' : 'Analizar con IA'}
              </Button>
            </div>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Añade notas sobre este cambio..."
              rows={4}
            />
            <Button
              onClick={handleSaveNotes}
              disabled={isSaving}
              size="sm"
              variant="outline"
            >
              <FileText className="h-4 w-4 mr-2" />
              {isSaving ? 'Guardando...' : 'Guardar Notas'}
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={() => handleMarkAs('relevant')}
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={change.status === 'relevant'}
            >
              Marcar como Relevante
            </Button>
            <Button
              onClick={() => handleMarkAs('discarded')}
              variant="destructive"
              className="flex-1"
              disabled={change.status === 'discarded'}
            >
              Descartar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
