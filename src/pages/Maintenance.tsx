import { Construction, Clock, Mail, ArrowRight } from "lucide-react";

const Maintenance = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Card principal */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-8 md:p-12">
          {/* Icono animado */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-2xl animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-yellow-400 to-orange-500 p-6 rounded-full">
                <Construction className="w-12 h-12 text-white" strokeWidth={2} />
              </div>
            </div>
          </div>

          {/* Título */}
          <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">
            Sistema en Mantenimiento
          </h1>

          {/* Subtítulo */}
          <p className="text-lg md:text-xl text-slate-300 text-center mb-8">
            Estamos mejorando Convoca-Spotter para ofrecerte una mejor experiencia
          </p>

          {/* Divider */}
          <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 mx-auto mb-8 rounded-full"></div>

          {/* Info boxes */}
          <div className="space-y-4 mb-8">
            {/* Tiempo estimado */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/20 p-3 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-medium">Tiempo estimado</p>
                  <p className="text-white font-semibold">Estará disponible pronto</p>
                </div>
              </div>
            </div>

            {/* Novedades */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-start gap-3">
                <div className="bg-purple-500/20 p-3 rounded-lg">
                  <ArrowRight className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-400 font-medium mb-2">Mejoras en proceso</p>
                  <ul className="space-y-2 text-slate-300 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span>
                      <span>Migración a arquitectura escalable con Kubernetes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span>
                      <span>Integración con changedetection.io para monitoreo avanzado</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span>
                      <span>Análisis de cambios con inteligencia artificial (Ollama)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span>
                      <span>Pool escalable de navegadores para renderizado JavaScript</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Contacto / Admin access */}
          <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl p-4 border border-blue-500/20">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="bg-blue-500/20 p-3 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">¿Eres administrador?</p>
                  <p className="text-white font-medium">
                    Puedes acceder durante el mantenimiento
                  </p>
                </div>
              </div>
              <a
                href="/admin/login"
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
              >
                Ir al login
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-center text-slate-500 text-sm">
              Convoca-Spotter · Sistema de Monitoreo de Convocatorias
            </p>
          </div>
        </div>

        {/* Detalles técnicos (colapsable) */}
        <details className="mt-6 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
          <summary className="px-6 py-4 cursor-pointer hover:bg-white/5 transition-colors text-slate-300 font-medium flex items-center justify-between">
            <span>Detalles técnicos de la migración</span>
            <span className="text-slate-500 text-sm">↓</span>
          </summary>
          <div className="px-6 py-4 space-y-3 text-sm text-slate-400 border-t border-white/10">
            <div>
              <strong className="text-slate-300">Arquitectura anterior:</strong>
              <p className="mt-1">Sistema monolítico con backend Node.js + SQLite en servidor único</p>
            </div>
            <div>
              <strong className="text-slate-300">Nueva arquitectura:</strong>
              <p className="mt-1">
                Microservicios en Kubernetes con changedetection.io como motor de scraping,
                pool escalable de Playwright (3-30 réplicas), webhook processor con Ollama
                para análisis de IA, y frontend adapter para mantener compatibilidad con la API original.
              </p>
            </div>
            <div>
              <strong className="text-slate-300">Beneficios:</strong>
              <ul className="mt-1 space-y-1 ml-4">
                <li>• Escalado automático según demanda (HPA)</li>
                <li>• Alta disponibilidad con múltiples réplicas</li>
                <li>• Rolling updates sin downtime</li>
                <li>• Monitoreo más rápido y eficiente (paralelo vs secuencial)</li>
                <li>• Análisis de cambios con IA local (llama3.1)</li>
              </ul>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default Maintenance;
