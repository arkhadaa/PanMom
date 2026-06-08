import { useState, useEffect, useCallback } from 'react';
import { getSyncQueue, saveSyncTask, removeSyncTask } from '../services/idb';
import { crearPedido, registrarGasto, registrarRetiro } from '../services/supabaseClient';

export function useSyncQueue() {
  const [queue, setQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadQueue = async () => {
    try {
      const q = await getSyncQueue();
      setQueue(q);
    } catch (e) {
      console.error('Error loading sync queue from IndexedDB', e);
    }
  };

  useEffect(() => {
    loadQueue();
    const handleUpdate = () => loadQueue();
    window.addEventListener('syncQueueUpdated', handleUpdate);
    return () => window.removeEventListener('syncQueueUpdated', handleUpdate);
  }, []);

  const enqueueTask = async (type, payload, description, extra = {}) => {
    const task = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      type,
      payload,
      description,
      status: 'PENDING',
      timestamp: Date.now(),
      errorMsg: null,
      ...extra
    };
    await saveSyncTask(task);
    processQueue(); // intentar procesar de inmediato
    return task.id;
  };

  const retryTask = async (taskId) => {
    const task = queue.find(t => t.id === taskId);
    if (!task) return;
    task.status = 'PENDING';
    task.errorMsg = null;
    await saveSyncTask(task);
    processQueue();
  };

  const processQueue = useCallback(async () => {
    if (isProcessing || !navigator.onLine) return;
    
    // Obtener la cola fresca antes de procesar
    const currentQueue = await getSyncQueue();
    const pendingTasks = currentQueue.filter(t => t.status === 'PENDING');
    
    if (pendingTasks.length === 0) return;

    setIsProcessing(true);

    let needsRefresh = false;

    for (const task of pendingTasks) {
      if (!navigator.onLine) break; // Si se corta en la mitad, abortar

      try {
        if (task.type === 'PEDIDO') {
          await crearPedido(task.payload);
        } else if (task.type === 'GASTO') {
          await registrarGasto(task.payload);
        } else if (task.type === 'RETIRO') {
          await registrarRetiro(task.payload);
        }
        
        // Exito -> Remover de la cola
        await removeSyncTask(task.id);
        needsRefresh = true;
      } catch (err) {
        console.error('Error syncing task', task.id, err);
        task.status = 'ERROR';
        task.errorMsg = err.message;
        await saveSyncTask(task);
        // Si hay un error, paramos el procesamiento para no desordenar cosas si es un problema de red real
        break;
      }
    }

    setIsProcessing(false);

    if (needsRefresh) {
      // Notificar a la app que hay nuevos datos en Supabase (para recargar el dashboard si es necesario)
      window.dispatchEvent(new Event('datosSincronizados'));
    }
  }, [isProcessing]);

  // Intentar sincronizar cuando vuelva el internet
  useEffect(() => {
    window.addEventListener('online', processQueue);
    return () => window.removeEventListener('online', processQueue);
  }, [processQueue]);

  return { queue, enqueueTask, retryTask, processQueue, isProcessing };
}
