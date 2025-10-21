#!/bin/bash
#
# Script de Despliegue Asistido
# Convoca-Spotter → changedetection.io en K8s
#

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Banner
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  Convoca-Spotter Migration to changedetection.io       ║"
echo "║  Kubernetes Deployment Assistant                       ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Verificar prerequisitos
log_info "Verificando prerequisitos..."

# kubectl
if ! command -v kubectl &> /dev/null; then
    log_error "kubectl no encontrado. Instálalo primero."
    exit 1
fi
log_success "kubectl instalado: $(kubectl version --client --short 2>/dev/null | head -1)"

# Conexión al cluster
if ! kubectl cluster-info &> /dev/null; then
    log_error "No hay conexión con el cluster K8s. Verifica tu kubeconfig."
    exit 1
fi
log_success "Cluster K8s accesible: $(kubectl config current-context)"

# Node (para migration script)
if ! command -v node &> /dev/null; then
    log_warning "Node.js no encontrado. Lo necesitarás para migrar watches."
else
    log_success "Node.js instalado: $(node --version)"
fi

echo ""
log_info "Prerequisitos verificados correctamente"
echo ""

# Menú principal
while true; do
    echo "¿Qué deseas hacer?"
    echo ""
    echo "  1) Desplegar changedetection.io en K8s"
    echo "  2) Desplegar webhook processor + Ollama"
    echo "  3) Desplegar frontend + adapter"
    echo "  4) Desplegar todo (changedetection + webhook + frontend)"
    echo "  5) Migrar watches desde SQLite"
    echo "  6) Verificar estado del despliegue"
    echo "  7) Ver logs en tiempo real"
    echo "  8) Port-forward para acceso local"
    echo "  9) Eliminar todo (cleanup)"
    echo "  0) Salir"
    echo ""
    read -p "Selecciona una opción [0-9]: " choice

    case $choice in
        1)
            log_info "Desplegando changedetection.io..."
            kubectl apply -f k8s/changedetection.yaml
            log_success "Manifiestos aplicados"

            log_info "Esperando a que los pods estén listos (puede tardar 2-3 min)..."
            kubectl -n changedetection wait --for=condition=ready pod -l app=changedetection --timeout=300s || true
            kubectl -n changedetection wait --for=condition=ready pod -l app=browserless --timeout=300s || true

            log_success "changedetection.io desplegado"
            kubectl -n changedetection get pods
            echo ""
            ;;

        2)
            log_info "Desplegando webhook processor + Ollama integration..."
            kubectl apply -f k8s/ollama-webhook-processor.yaml
            log_success "Manifiestos aplicados"

            log_info "Esperando a que los pods estén listos..."
            kubectl -n convoca-ollama wait --for=condition=ready pod -l app=ollama-processor --timeout=180s || true

            log_success "Webhook processor desplegado"
            kubectl -n convoca-ollama get pods
            echo ""
            ;;

        3)
            log_info "Desplegando frontend + adapter..."
            kubectl apply -f k8s/frontend-adapter.yaml
            log_success "Manifiestos aplicados"

            log_info "Esperando a que los pods estén listos..."
            kubectl -n convoca-frontend wait --for=condition=ready pod -l app=frontend-adapter --timeout=180s || true
            kubectl -n convoca-frontend wait --for=condition=ready pod -l app=frontend --timeout=300s || true

            log_success "Frontend desplegado"
            kubectl -n convoca-frontend get pods
            echo ""
            ;;

        4)
            log_info "Desplegando stack completo..."
            kubectl apply -f k8s/changedetection.yaml
            kubectl apply -f k8s/ollama-webhook-processor.yaml
            kubectl apply -f k8s/frontend-adapter.yaml

            log_info "Esperando a que todos los pods estén listos..."
            sleep 5
            kubectl -n changedetection wait --for=condition=ready pod -l app=changedetection --timeout=300s || true
            kubectl -n changedetection wait --for=condition=ready pod -l app=browserless --timeout=300s || true
            kubectl -n convoca-ollama wait --for=condition=ready pod -l app=ollama-processor --timeout=180s || true
            kubectl -n convoca-frontend wait --for=condition=ready pod -l app=frontend-adapter --timeout=180s || true
            kubectl -n convoca-frontend wait --for=condition=ready pod -l app=frontend --timeout=300s || true

            log_success "Stack completo desplegado"
            echo ""
            log_info "Estado de changedetection namespace:"
            kubectl -n changedetection get pods
            echo ""
            log_info "Estado de convoca-ollama namespace:"
            kubectl -n convoca-ollama get pods
            echo ""
            log_info "Estado de convoca-frontend namespace:"
            kubectl -n convoca-frontend get pods
            echo ""
            ;;

        5)
            log_info "Migrando watches desde SQLite..."

            if [ ! -f "migration/export-to-changedetection.js" ]; then
                log_error "Script de migración no encontrado en migration/"
                break
            fi

            if ! command -v node &> /dev/null; then
                log_error "Node.js no instalado. Instálalo para migrar watches."
                break
            fi

            cd migration

            if [ ! -d "node_modules" ]; then
                log_info "Instalando dependencias de npm..."
                npm install
            fi

            # Configurar variables de entorno
            log_info "Configurando acceso a changedetection.io..."
            echo ""
            read -p "¿Deseas usar port-forward local? (y/n) [y]: " use_pf
            use_pf=${use_pf:-y}

            if [[ "$use_pf" == "y" ]]; then
                export CDIO_API_URL="http://localhost:5000"
                log_info "Iniciando port-forward en background..."
                kubectl -n changedetection port-forward svc/changedetection 5000:80 &
                PF_PID=$!
                sleep 3
                log_success "Port-forward activo (PID: $PF_PID)"
            else
                read -p "URL de changedetection.io: " api_url
                export CDIO_API_URL="$api_url"
            fi

            export CDIO_API_KEY="convoca-spotter-api-key-2025"

            echo ""
            read -p "¿Ejecutar dry-run primero? (y/n) [y]: " do_dryrun
            do_dryrun=${do_dryrun:-y}

            if [[ "$do_dryrun" == "y" ]]; then
                log_info "Ejecutando dry-run..."
                npm run dry-run
                echo ""
                read -p "¿Proceder con la migración real? (y/n): " proceed
                if [[ "$proceed" != "y" ]]; then
                    log_warning "Migración cancelada"
                    cd ..
                    [[ -n "$PF_PID" ]] && kill $PF_PID 2>/dev/null || true
                    break
                fi
            fi

            log_info "Ejecutando migración..."
            npm run migrate

            [[ -n "$PF_PID" ]] && kill $PF_PID 2>/dev/null || true
            cd ..
            log_success "Migración completada"
            echo ""
            ;;

        6)
            log_info "Estado del despliegue:"
            echo ""
            echo "=== Namespace: changedetection ==="
            kubectl -n changedetection get all 2>/dev/null || log_warning "Namespace no existe"
            echo ""
            echo "=== HPA Status ==="
            kubectl -n changedetection get hpa 2>/dev/null || log_warning "HPA no encontrado"
            echo ""
            echo "=== Namespace: convoca-ollama ==="
            kubectl -n convoca-ollama get all 2>/dev/null || log_warning "Namespace no existe"
            echo ""
            echo "=== Namespace: convoca-frontend ==="
            kubectl -n convoca-frontend get all 2>/dev/null || log_warning "Namespace no existe"
            echo ""
            echo "=== Ingress ==="
            kubectl -n changedetection get ingress 2>/dev/null || log_warning "Ingress no encontrado"
            kubectl -n convoca-frontend get ingress 2>/dev/null || log_warning "Frontend Ingress no encontrado"
            echo ""
            ;;

        7)
            echo "Selecciona qué logs ver:"
            echo "  1) changedetection.io"
            echo "  2) Browserless pool"
            echo "  3) Webhook processor"
            echo "  4) Frontend adapter"
            echo "  5) Frontend (nginx)"
            echo "  6) Todos (multiplexed)"
            read -p "Opción [1-6]: " log_choice

            case $log_choice in
                1)
                    log_info "Logs de changedetection.io (Ctrl+C para salir):"
                    kubectl -n changedetection logs -f deploy/changedetection
                    ;;
                2)
                    log_info "Logs del pool de Browserless (Ctrl+C para salir):"
                    kubectl -n changedetection logs -f -l app=browserless --tail=50
                    ;;
                3)
                    log_info "Logs del webhook processor (Ctrl+C para salir):"
                    kubectl -n convoca-ollama logs -f deploy/ollama-webhook-processor
                    ;;
                4)
                    log_info "Logs del frontend adapter (Ctrl+C para salir):"
                    kubectl -n convoca-frontend logs -f deploy/frontend-adapter
                    ;;
                5)
                    log_info "Logs del frontend nginx (Ctrl+C para salir):"
                    kubectl -n convoca-frontend logs -f deploy/frontend -c nginx
                    ;;
                6)
                    log_info "Logs multiplexed (requiere stern):"
                    if command -v stern &> /dev/null; then
                        stern -n changedetection,convoca-ollama,convoca-frontend '.*'
                    else
                        log_error "stern no instalado. Instala desde: https://github.com/stern/stern"
                    fi
                    ;;
            esac
            ;;

        8)
            echo "Port-forward disponibles:"
            echo "  1) changedetection.io UI (5000 → 80)"
            echo "  2) Webhook processor (8080 → 80)"
            echo "  3) Frontend adapter API (3000 → 3000)"
            echo "  4) Frontend web (8081 → 80)"
            echo "  5) Todos"
            read -p "Opción [1-5]: " pf_choice

            case $pf_choice in
                1)
                    log_info "Port-forward a changedetection.io..."
                    log_success "Accede en: http://localhost:5000"
                    kubectl -n changedetection port-forward svc/changedetection 5000:80
                    ;;
                2)
                    log_info "Port-forward a webhook processor..."
                    log_success "Accede en: http://localhost:8080"
                    kubectl -n convoca-ollama port-forward svc/ollama-webhook-processor 8080:80
                    ;;
                3)
                    log_info "Port-forward al frontend adapter..."
                    log_success "Accede en: http://localhost:3000"
                    kubectl -n convoca-frontend port-forward svc/frontend-adapter 3000:3000
                    ;;
                4)
                    log_info "Port-forward al frontend web..."
                    log_success "Accede en: http://localhost:8081"
                    kubectl -n convoca-frontend port-forward svc/frontend 8081:80
                    ;;
                5)
                    log_info "Port-forward a todos los servicios..."
                    log_success "changedetection: http://localhost:5000"
                    log_success "webhooks: http://localhost:8080"
                    log_success "frontend adapter: http://localhost:3000"
                    log_success "frontend web: http://localhost:8081"
                    kubectl -n changedetection port-forward svc/changedetection 5000:80 &
                    kubectl -n convoca-ollama port-forward svc/ollama-webhook-processor 8080:80 &
                    kubectl -n convoca-frontend port-forward svc/frontend-adapter 3000:3000 &
                    kubectl -n convoca-frontend port-forward svc/frontend 8081:80 &
                    log_warning "Todos corriendo en background. Usa 'fg' para traer al frente o Ctrl+C para detener."
                    wait
                    ;;
            esac
            ;;

        9)
            log_warning "¡CUIDADO! Esto eliminará TODOS los recursos de K8s."
            read -p "¿Estás seguro? Escribe 'yes' para confirmar: " confirm

            if [[ "$confirm" == "yes" ]]; then
                log_info "Eliminando namespaces..."
                kubectl delete namespace changedetection --ignore-not-found=true
                kubectl delete namespace convoca-ollama --ignore-not-found=true
                kubectl delete namespace convoca-frontend --ignore-not-found=true
                log_success "Cleanup completado"
            else
                log_info "Cancelado"
            fi
            echo ""
            ;;

        0)
            log_info "Saliendo..."
            exit 0
            ;;

        *)
            log_error "Opción inválida"
            ;;
    esac

    echo ""
    read -p "Presiona Enter para continuar..."
    clear
    echo ""
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║  Convoca-Spotter Migration Assistant                   ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo ""
done
