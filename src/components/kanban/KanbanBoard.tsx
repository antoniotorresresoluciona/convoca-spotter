import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Inbox, Eye, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChangeCard } from './ChangeCard';
import { ChangeDetailModal } from './ChangeDetailModal';
import {
  Change,
  GroupedChanges,
  getChangesByStatus,
  updateChangeStatus,
  ChangeFilters,
} from '@/lib/changesApi';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface KanbanBoardProps {
  filters: ChangeFilters;
}

export function KanbanBoard({ filters }: KanbanBoardProps) {
  const { toast } = useToast();
  const [changes, setChanges] = useState<GroupedChanges>({
    pending: [],
    reviewing: [],
    relevant: [],
    discarded: [],
  });
  const [selectedChange, setSelectedChange] = useState<Change | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const loadChanges = async () => {
    try {
      setIsLoading(true);
      const data = await getChangesByStatus(filters);
      setChanges(data);
    } catch (error) {
      console.error('Error loading changes:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los cambios',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChanges();
  }, [filters]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('change-history-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'change_history' },
        (payload) => {
          console.log('Change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: '🔔 Nuevo cambio detectado',
              description: 'Se ha detectado un nuevo cambio en las fuentes',
            });
          }
          
          loadChanges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const changeId = active.id as string;
    const newStatus = over.id as Change['status'];

    // Find the change in all columns
    const allChanges = [
      ...changes.pending,
      ...changes.reviewing,
      ...changes.relevant,
      ...changes.discarded,
    ];
    const change = allChanges.find((c) => c.id === changeId);

    if (!change || change.status === newStatus) return;

    try {
      await updateChangeStatus(changeId, newStatus);
      loadChanges();
      
      toast({
        title: 'Estado actualizado',
        description: `Cambio movido a ${
          newStatus === 'pending' ? 'Pendiente' :
          newStatus === 'reviewing' ? 'En Revisión' :
          newStatus === 'relevant' ? 'Relevante' : 'Descartado'
        }`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive',
      });
    }
  };

  const handleViewDetails = (change: Change) => {
    setSelectedChange(change);
    setModalOpen(true);
  };

  const columns = [
    {
      id: 'pending' as const,
      title: 'Pendiente',
      icon: Inbox,
      color: 'text-gray-500',
      bgColor: 'bg-gray-500/10',
      changes: changes.pending,
    },
    {
      id: 'reviewing' as const,
      title: 'En Revisión',
      icon: Eye,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      changes: changes.reviewing,
    },
    {
      id: 'relevant' as const,
      title: 'Relevante',
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      changes: changes.relevant,
    },
    {
      id: 'discarded' as const,
      title: 'Descartado',
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      changes: changes.discarded,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeChange = activeId
    ? [...changes.pending, ...changes.reviewing, ...changes.relevant, ...changes.discarded].find(
        (c) => c.id === activeId
      )
    : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((column) => (
            <Card key={column.id} className="flex flex-col h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <column.icon className={`h-5 w-5 ${column.color}`} />
                    <span>{column.title}</span>
                  </div>
                  <Badge variant="secondary" className={column.bgColor}>
                    {column.changes.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto max-h-[600px]">
                <SortableContext
                  id={column.id}
                  items={column.changes.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {column.changes.length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        No hay cambios
                      </div>
                    ) : (
                      column.changes.map((change) => (
                        <ChangeCard
                          key={change.id}
                          change={change}
                          onViewDetails={handleViewDetails}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
              </CardContent>
            </Card>
          ))}
        </div>

        <DragOverlay>
          {activeChange && (
            <div className="rotate-3">
              <ChangeCard change={activeChange} onViewDetails={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <ChangeDetailModal
        change={selectedChange}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUpdate={loadChanges}
      />
    </>
  );
}
