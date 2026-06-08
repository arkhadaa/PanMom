import { useState } from 'react';
import { Cloud, CloudOff, Loader2, AlertCircle, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { useSyncQueue } from '../hooks/useSyncQueue';
import ModalSimple from './ModalSimple';

export default function SyncBadge() {
  const { queue, isProcessing, retryTask, processQueue } = useSyncQueue();
  const [modalOpen, setModalOpen] = useState(false);

  const pendingTasks = queue.filter(t => t.status === 'PENDING');
  const errorTasks = queue.filter(t => t.status === 'ERROR');
  
  const hasErrors = errorTasks.length > 0;
  const hasPending = pendingTasks.length > 0;
  const isSyncing = isProcessing;

  // Si está vacío y sin errores
  if (queue.length === 0) {
    return (
      <div className="flex items-center justify-center py-1">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
          <Cloud className="w-3.5 h-3.5" /> Sincronizado
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-center py-1">
        <button
          onClick={() => setModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all active:scale-95 shadow-sm border ${
            hasErrors 
              ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
              : isSyncing
              ? 'bg-amber-50 text-amber-600 border-amber-200'
              : 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200'
          }`}
        >
          {hasErrors ? (
            <><AlertCircle size={14} /> Error de red ({errorTasks.length})</>
          ) : isSyncing ? (
            <><Loader2 size={14} className="animate-spin" /> Guardando...</>
          ) : (
            <><CloudOff size={14} /> {pendingTasks.length} pendientes</>
          )}
        </button>
      </div>

      <ModalSimple
        titulo="Estado de Sincronización"
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            {hasErrors 
              ? 'Hubo un error al guardar algunos movimientos. Revisa tu conexión.' 
              : 'Estos movimientos están guardados en tu celular y se subirán cuando haya internet.'
            }
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {queue.map(task => (
              <div key={task.id} className={`p-3 rounded-xl border flex items-center justify-between ${
                task.status === 'ERROR' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase text-gray-500 bg-gray-200 px-1.5 rounded">
                      {task.type}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(task.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {task.description}
                  </p>
                  {task.status === 'ERROR' && (
                    <p className="text-xs text-red-500 mt-1">{task.errorMsg}</p>
                  )}
                </div>
                
                {task.status === 'ERROR' && (
                  <button 
                    onClick={() => retryTask(task.id)}
                    className="p-2 bg-white rounded-lg border border-red-200 text-red-600 shadow-sm active:scale-95"
                  >
                    <RefreshCw size={16} />
                  </button>
                )}
                {task.status === 'PENDING' && (
                  <Loader2 size={16} className="text-amber-500" />
                )}
              </div>
            ))}
          </div>

          {hasErrors && (
            <button
              onClick={() => processQueue()}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
              Reintentar Todos
            </button>
          )}
        </div>
      </ModalSimple>
    </>
  );
}
