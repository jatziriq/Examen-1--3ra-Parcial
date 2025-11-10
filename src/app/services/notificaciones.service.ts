import { Injectable } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Tarea } from './tareas.service';

@Injectable({
  providedIn: 'root'
})
export class NotificacionesService {
  private notificacionesHabilitadas = false;

  constructor() {
    this.verificarPermisos();
  }

  async verificarPermisos() {
    try {
      const result = await LocalNotifications.checkPermissions();
      if (result.display === 'granted') {
        this.notificacionesHabilitadas = true;
      } else {
        const request = await LocalNotifications.requestPermissions();
        this.notificacionesHabilitadas = request.display === 'granted';
      }
    } catch (error) {
      console.log('Notificaciones no disponibles en web');
      this.notificacionesHabilitadas = false;
    }
  }

  async programarNotificacion(tarea: Tarea) {
    if (!this.notificacionesHabilitadas) {
      console.log('Notificaciones no habilitadas');
      return;
    }

    if (!tarea.fecha || !tarea.hora) {
      console.log('Tarea sin fecha u hora');
      return;
    }

    try {
      const fechaHora = new Date(`${tarea.fecha}T${tarea.hora}`);
      const notificacionFecha = new Date(fechaHora.getTime() - 60 * 60 * 1000);

      if (notificacionFecha.getTime() > Date.now()) {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: 'Recordatorio de Tarea',
              body: `"${tarea.titulo}" - ${(tarea.prioridad)} Prioridad ${tarea.prioridad}`,
              id: tarea.id,
              schedule: { at: notificacionFecha },
              extra: {
                tareaId: tarea.id
              }
            }
          ]
        });
        console.log('Notificación programada');
      }
    } catch (error) {
      console.log('Error al programar notificación:', error);
    }
  }

  async cancelarNotificacion(tareaId: number) {
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: tareaId }]
      });
      console.log('Notificación cancelada');
    } catch (error) {
      console.log('Error al cancelar notificación:', error);
    }
  }

  async verificarTareasCercanas(tareas: Tarea[]) {
    const ahora = new Date();
    const en24Horas = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);

    const tareasCercanas = tareas.filter(tarea => {
      if (!tarea.fecha || tarea.estado === 'finalizada') return false;
      const fechaTarea = new Date(`${tarea.fecha}T${tarea.hora || '23:59'}`);
      return fechaTarea > ahora && fechaTarea <= en24Horas;
    });

    return tareasCercanas;
  }
}