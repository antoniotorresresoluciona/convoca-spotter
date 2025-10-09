import { EntePublico } from "@/types/fundacion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Edit, Trash2, Eye, AlertCircle, CheckCircle, Clock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

interface EntePublicoCardProps {
  ente: EntePublico;
  onEdit: (ente: EntePublico) => void;
  onDelete: (id: string) => void;
  onViewDetails: (ente: EntePublico) => void;
}

export const EntePublicoCard = ({
  ente,
  onEdit,
  onDelete,
  onViewDetails,
}: EntePublicoCardProps) => {
  const getStatusIcon = () => {
    switch (ente.status) {
      case 'updated':
        return <AlertCircle className="h-5 w-5 text-success" />;
      case 'unchanged':
        return <CheckCircle className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Clock className="h-5 w-5 text-warning" />;
    }
  };

  const getStatusText = () => {
    switch (ente.status) {
      case 'updated':
        return 'Actualizado';
      case 'unchanged':
        return 'Sin cambios';
      default:
        return 'Pendiente';
    }
  };

  const getStatusVariant = () => {
    switch (ente.status) {
      case 'updated':
        return 'default';
      case 'unchanged':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-success/20">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-2 mb-2">{ente.name}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                {ente.category}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {ente.entity}
              </Badge>
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(ente)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewDetails(ente)}>
                <Eye className="h-4 w-4 mr-2" />
                Ver detalles
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(ente.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <Badge variant={getStatusVariant()} className="text-xs">
            {getStatusText()}
          </Badge>
          {ente.last_checked && (
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(ente.last_checked).toLocaleString('es-ES')}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => window.open(ente.url, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir URL
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(ente)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>

        {ente.sublinks && ente.sublinks.length > 0 && (
          <div className="text-xs text-muted-foreground border-t pt-3">
            {ente.sublinks.filter(s => s.enabled).length} subenlaces monitorizados
          </div>
        )}
      </CardContent>
    </Card>
  );
};
