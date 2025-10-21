import { useDroppable } from '@dnd-kit/core';
import { ReactNode } from 'react';

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  color: 'gray' | 'green' | 'red';
  description?: string;
  children: ReactNode;
}

export function KanbanColumn({ id, title, count, color, description, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const colorClasses = {
    gray: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      header: 'bg-gradient-to-br from-gray-100 to-gray-50',
      text: 'text-gray-900',
      count: 'bg-gray-200 text-gray-700',
      hover: 'ring-2 ring-gray-300',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      header: 'bg-gradient-to-br from-green-100 to-green-50',
      text: 'text-green-900',
      count: 'bg-green-200 text-green-800',
      hover: 'ring-2 ring-green-400',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      header: 'bg-gradient-to-br from-red-100 to-red-50',
      text: 'text-red-900',
      count: 'bg-red-200 text-red-800',
      hover: 'ring-2 ring-red-400',
    },
  };

  const classes = colorClasses[color];

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 ${classes.border} ${classes.bg} transition-all ${
        isOver ? classes.hover : ''
      }`}
    >
      {/* Header */}
      <div className={`${classes.header} px-5 py-4 rounded-t-xl border-b-2 ${classes.border}`}>
        <div className="flex items-center justify-between mb-2">
          <h2 className={`text-lg font-bold ${classes.text}`}>{title}</h2>
          <span className={`${classes.count} px-3 py-1 rounded-full text-sm font-semibold`}>
            {count}
          </span>
        </div>
        {description && (
          <p className="text-xs text-gray-600">{description}</p>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
        {children}
        {count === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">Arrastra tarjetas aquí</p>
          </div>
        )}
      </div>
    </div>
  );
}
