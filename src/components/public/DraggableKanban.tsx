import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DraggableCard } from './DraggableCard';
import { KanbanColumn } from './KanbanColumn';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PublicChange {
  id: string;
  source_name: string;
  source_type: 'fundacion' | 'ente_publico' | 'otra_fuente';
  changes_description: string;
  priority: 'ALTA' | 'MEDIA' | 'BAJA';
  detected_at: string;
  url: string;
  ai_summary?: string;
  deadline_date?: string;
  ai_keywords?: string[];
  is_new_convocatoria?: boolean;
  change_type?: string;
  old_value?: string;
  new_value?: string;
  notes?: string;
}

interface DraggableKanbanProps {
  filters: {
    sourceType: string;
    priority: string;
    dateRange: string;
  };
}

export function DraggableKanban({ filters }: DraggableKanbanProps) {
  const [changes, setChanges] = useState<PublicChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Columnas del Kanban
  const [pending, setPending] = useState<PublicChange[]>([]);
  const [interested, setInterested] = useState<PublicChange[]>([]);
  const [notInterested, setNotInterested] = useState<PublicChange[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchChanges();
  }, [filters]);

  useEffect(() => {
    // Cargar clasificaciones del localStorage
    const interests = JSON.parse(localStorage.getItem('convocatorias_interests') || '{}');

    const pendingItems: PublicChange[] = [];
    const interestedItems: PublicChange[] = [];
    const notInterestedItems: PublicChange[] = [];

    changes.forEach(change => {
      const userInterest = interests[change.id];
      if (userInterest === 'interested') {
        interestedItems.push(change);
      } else if (userInterest === 'not_interested') {
        notInterestedItems.push(change);
      } else {
        pendingItems.push(change);
      }
    });

    setPending(pendingItems);
    setInterested(interestedItems);
    setNotInterested(notInterestedItems);
  }, [changes]);

  async function fetchChanges() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        sourceType: filters.sourceType,
        priority: filters.priority,
        dateRange: filters.dateRange,
        limit: '100'
      });

      const response = await fetch(`/api/public/relevant-changes?${params}`);

      if (!response.ok) {
        throw new Error('Error al cargar convocatorias');
      }

      const data = await response.json();
      setChanges(data);
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
      console.error('Error fetching changes:', err);
    } finally {
      setLoading(false);
    }
  }

  function findContainer(id: string) {
    if (pending.find(item => item.id === id)) return 'pending';
    if (interested.find(item => item.id === id)) return 'interested';
    if (notInterested.find(item => item.id === id)) return 'not_interested';
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;

    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    // Check if over.id is a column or a card
    let overContainer = over.id as string;

    // If it's not a column ID, find which column contains this card
    if (!['pending', 'interested', 'not_interested'].includes(overContainer)) {
      overContainer = findContainer(overContainer) || overContainer;
    }

    if (!activeContainer || activeContainer === overContainer) return;

    // Mover entre columnas
    const activeItems = getItemsByContainer(activeContainer);
    const overItems = getItemsByContainer(overContainer);

    const activeIndex = activeItems.findIndex(item => item.id === active.id);
    const activeItem = activeItems[activeIndex];

    if (!activeItem) return;

    // Remover de la columna actual
    const newActiveItems = activeItems.filter(item => item.id !== active.id);

    // Añadir a la nueva columna
    const newOverItems = [...overItems, activeItem];

    updateContainer(activeContainer, newActiveItems);
    updateContainer(overContainer, newOverItems);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveId(null);

    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    // Check if over.id is a column or a card
    let overContainer = over.id as string;

    // If it's not a column ID, find which column contains this card
    if (!['pending', 'interested', 'not_interested'].includes(overContainer)) {
      overContainer = findContainer(overContainer) || overContainer;
    }

    if (activeContainer && overContainer && activeContainer === overContainer) {
      // Reordenar dentro de la misma columna
      const items = getItemsByContainer(activeContainer);
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);

      if (oldIndex !== newIndex) {
        const newItems = arrayMove(items, oldIndex, newIndex);
        updateContainer(activeContainer, newItems);
      }
    }

    // Guardar en localStorage y servidor
    if (activeContainer && overContainer && activeContainer !== overContainer) {
      const changeId = active.id as string;
      let interest = 'pending';

      if (overContainer === 'interested') interest = 'interested';
      else if (overContainer === 'not_interested') interest = 'not_interested';

      // Guardar en localStorage
      const interests = JSON.parse(localStorage.getItem('convocatorias_interests') || '{}');
      interests[changeId] = interest;
      localStorage.setItem('convocatorias_interests', JSON.stringify(interests));

      // Guardar en servidor
      fetch('/api/public/user-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          change_id: changeId,
          interest: interest,
          timestamp: new Date().toISOString(),
        }),
      }).catch(err => console.error('Error guardando interés:', err));
    }
  }

  function getItemsByContainer(container: string): PublicChange[] {
    switch (container) {
      case 'pending': return pending;
      case 'interested': return interested;
      case 'not_interested': return notInterested;
      default: return [];
    }
  }

  function updateContainer(container: string, items: PublicChange[]) {
    switch (container) {
      case 'pending': setPending(items); break;
      case 'interested': setInterested(items); break;
      case 'not_interested': setNotInterested(items); break;
    }
  }

  const activeItem = activeId ? changes.find(c => c.id === activeId) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Cargando convocatorias...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (changes.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          No se encontraron convocatorias
        </h3>
        <p className="text-gray-500 mb-4">
          Prueba ajustando los filtros o vuelve más tarde.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna: Por Revisar */}
        <KanbanColumn
          id="pending"
          title="📋 Por Revisar"
          count={pending.length}
          color="gray"
          description="Arrastra las tarjetas a la columna que prefieras"
        >
          <SortableContext items={pending.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {pending.map(change => (
              <DraggableCard key={change.id} change={change} />
            ))}
          </SortableContext>
        </KanbanColumn>

        {/* Columna: Me Interesa */}
        <KanbanColumn
          id="interested"
          title="❤️ Me Interesa"
          count={interested.length}
          color="green"
          description="Convocatorias que te interesan"
        >
          <SortableContext items={interested.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {interested.map(change => (
              <DraggableCard key={change.id} change={change} />
            ))}
          </SortableContext>
        </KanbanColumn>

        {/* Columna: No me Interesa */}
        <KanbanColumn
          id="not_interested"
          title="🚫 No me Interesa"
          count={notInterested.length}
          color="red"
          description="Convocatorias descartadas"
        >
          <SortableContext items={notInterested.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {notInterested.map(change => (
              <DraggableCard key={change.id} change={change} />
            ))}
          </SortableContext>
        </KanbanColumn>
      </div>

      <DragOverlay>
        {activeItem ? <DraggableCard change={activeItem} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
