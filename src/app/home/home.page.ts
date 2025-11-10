import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { TareasService, Tarea } from '../services/tareas.service';
import { NotificacionesService } from '../services/notificaciones.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  tareas: Tarea[] = [];
  tareasFiltradas: Tarea[] = [];
  busqueda = '';
  filtroCategoria = 'todas';
  filtroPrioridad = 'todas';
  filtroEstado = 'todas';

  estadisticas = {
    total: 0,
    completadas: 0,
    pendientes: 0,
    alta: 0
  };

  constructor(
    private tareasService: TareasService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private notifService: NotificacionesService
  ) {}

  async ngOnInit() {
    console.log('Iniciando aplicación...');
    await this.tareasService.init();
    await this.cargarTareas();
    
    const tareasCercanas = await this.notifService.verificarTareasCercanas(this.tareas);
    if (tareasCercanas.length > 0) {
      this.mostrarToast(`Tienes ${tareasCercanas.length} tarea(s) próxima(s) a vencer`, 'warning');
    }
  }

  async cargarTareas() {
    this.tareas = this.tareasService.obtenerTareas();
    console.log('Total tareas cargadas:', this.tareas);
    this.aplicarFiltros();
    this.calcularEstadisticas();
  }

  aplicarFiltros() {
    console.log('Filtros actuales:', {
      categoria: this.filtroCategoria,
      prioridad: this.filtroPrioridad,
      estado: this.filtroEstado,
      busqueda: this.busqueda
    });

    this.tareasFiltradas = this.tareasService.filtrarTareas({
      categoria: this.filtroCategoria,
      prioridad: this.filtroPrioridad,
      estado: this.filtroEstado,
      busqueda: this.busqueda
    });

    console.log('Tareas después del filtro:', this.tareasFiltradas);
  }

  calcularEstadisticas() {
    this.estadisticas.total = this.tareas.length;
    this.estadisticas.completadas = this.tareas.filter(t => t.estado === 'finalizada').length;
    this.estadisticas.pendientes = this.tareas.filter(t => t.estado !== 'finalizada').length;
    this.estadisticas.alta = this.tareas.filter(t => t.prioridad === 'alta' && t.estado !== 'finalizada').length;
  }

  async presentModal(tarea?: Tarea) {
    const alert = await this.alertCtrl.create({
      header: tarea ? 'Editar Tarea Rápido' : 'Nueva Tarea Rápida',
      inputs: [
        { name: 'titulo', type: 'text', placeholder: 'Título *', value: tarea?.titulo || '' },
        { name: 'descripcion', type: 'textarea', placeholder: 'Descripción', value: tarea?.descripcion || '' },
        { name: 'fecha', type: 'date', value: tarea?.fecha || '' },
        { name: 'hora', type: 'time', value: tarea?.hora || '' },
        { name: 'observaciones', type: 'textarea', placeholder: 'Observaciones', value: tarea?.observaciones || '' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: tarea ? 'Guardar' : 'Crear',
          handler: async (data) => {
            if (!data.titulo) {
              this.mostrarToast('El título es obligatorio', 'warning');
              return false;
            }
            const tareaData = {
              titulo: data.titulo,
              descripcion: data.descripcion,
              categoria: (tarea?.categoria || 'personal') as any,
              prioridad: (tarea?.prioridad || 'media') as any,
              estado: (tarea?.estado || 'inicial') as any,
              fecha: data.fecha,
              hora: data.hora,
              observaciones: data.observaciones
            };
            
            if (tarea) {
              await this.tareasService.actualizarTarea(tarea.id, tareaData);
              this.mostrarToast('Tarea actualizada', 'success');
            } else {
              const nuevaTarea = await this.tareasService.agregarTarea(tareaData);
              this.mostrarToast('Tarea creada', 'success');
              
              if (data.fecha && data.hora) {
                await this.notifService.programarNotificacion(nuevaTarea);
                this.mostrarToast('Recordatorio programado', 'primary');
              }
            }
            
            await this.cargarTareas();
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async presentModalCompleto(tarea?: Tarea) {
    const alert1 = await this.alertCtrl.create({
      header: tarea ? 'Editar Tarea' : 'Nueva Tarea',
      message: 'Paso 1 de 5: Información básica',
      inputs: [
        { name: 'titulo', type: 'text', placeholder: 'Título *', value: tarea?.titulo || '' },
        { name: 'descripcion', type: 'textarea', placeholder: 'Descripción', value: tarea?.descripcion || '' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Siguiente',
          handler: async (data1) => {
            if (!data1.titulo) {
              this.mostrarToast('El título es obligatorio', 'warning');
              return false;
            }

            const alert2 = await this.alertCtrl.create({
              header: 'Categoría',
              message: 'Paso 2 de 5: Selecciona la categoría',
              inputs: [
                { name: 'cat', type: 'radio', label: 'Personal', value: 'personal', checked: !tarea || tarea.categoria === 'personal' },
                { name: 'cat', type: 'radio', label: 'Trabajo', value: 'trabajo', checked: tarea?.categoria === 'trabajo' },
                { name: 'cat', type: 'radio', label: 'Social', value: 'social', checked: tarea?.categoria === 'social' }
              ],
              buttons: [
                { text: 'Atrás', role: 'cancel' },
                {
                  text: 'Siguiente',
                  handler: async (data2) => {
                    console.log('Categoría seleccionada:', data2.cat);
                    const alert3 = await this.alertCtrl.create({
                      header: 'Prioridad',
                      message: 'Paso 3 de 5: Selecciona la prioridad',
                      inputs: [
                        { name: 'pri', type: 'radio', label: 'Baja', value: 'baja', checked: tarea?.prioridad === 'baja' },
                        { name: 'pri', type: 'radio', label: 'Media', value: 'media', checked: !tarea || tarea.prioridad === 'media' },
                        { name: 'pri', type: 'radio', label: 'Alta', value: 'alta', checked: tarea?.prioridad === 'alta' }
                      ],
                      buttons: [
                        { text: 'Atrás', role: 'cancel' },
                        {
                          text: 'Siguiente',
                          handler: async (data3) => {
                            const alert4 = await this.alertCtrl.create({
                              header: 'Estado',
                              message: 'Paso 4 de 5: Selecciona el estado',
                              inputs: [
                                { name: 'est', type: 'radio', label: 'Inicial', value: 'inicial', checked: !tarea || tarea.estado === 'inicial' },
                                { name: 'est', type: 'radio', label: 'En Ejecución', value: 'en-ejecucion', checked: tarea?.estado === 'en-ejecucion' },
                                { name: 'est', type: 'radio', label: 'Finalizada', value: 'finalizada', checked: tarea?.estado === 'finalizada' }
                              ],
                              buttons: [
                                { text: 'Atrás', role: 'cancel' },
                                {
                                  text: 'Siguiente',
                                  handler: async (data4) => {
                                    const alert5 = await this.alertCtrl.create({
                                      header: 'Detalles Finales',
                                      message: 'Paso 5 de 5: Fecha y observaciones',
                                      inputs: [
                                        { name: 'fecha', type: 'date', value: tarea?.fecha || '' },
                                        { name: 'hora', type: 'time', value: tarea?.hora || '' },
                                        { name: 'observaciones', type: 'textarea', placeholder: 'Observaciones', value: tarea?.observaciones || '' }
                                      ],
                                      buttons: [
                                        { text: 'Atrás', role: 'cancel' },
                                        {
                                          text: 'Guardar',
                                          handler: async (data5) => {
                                            const tareaData: any = {
                                              titulo: data1.titulo,
                                              descripcion: data1.descripcion,
                                              categoria: data2.cat,
                                              prioridad: data3.pri,
                                              estado: data4.est,
                                              fecha: data5.fecha,
                                              hora: data5.hora,
                                              observaciones: data5.observaciones
                                            };

                                            console.log('Guardando tarea:', tareaData);
                  
                                            console.log('Categoría a guardar:', tareaData.categoria); 

                                            if (tarea) {
                                              await this.tareasService.actualizarTarea(tarea.id, tareaData);
                                              this.mostrarToast('Tarea actualizada', 'success');
                                            } else {
                                              const nuevaTarea = await this.tareasService.agregarTarea(tareaData);
                                              this.mostrarToast('Tarea creada', 'success');
                                              
                                              if (data5.fecha && data5.hora) {
                                                await this.notifService.programarNotificacion(nuevaTarea);
                                                this.mostrarToast('Recordatorio programado', 'primary');
                                              }
                                            }
                                            
                                            await this.cargarTareas();
                                            return true;
                                          }
                                        }
                                      ]
                                    });
                                    await alert5.present();
                                  }
                                }
                              ]
                            });
                            await alert4.present();
                          }
                        }
                      ]
                    });
                    await alert3.present();
                  }
                }
              ]
            });
            await alert2.present();
            return false;
          }
        }
      ]
    });
    await alert1.present();
  }

  async editarTarea(tarea: Tarea) {
    const alert = await this.alertCtrl.create({
      header: 'Editar Tarea',
      message: '¿Cómo quieres editar?',
      buttons: [
        {
          text: 'Edición Rápida',
          handler: () => {
            this.presentModal(tarea);
          }
        },
        {
          text: 'Edición Completa',
          handler: () => {
            this.presentModalCompleto(tarea);
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel'
        }
      ]
    });
    await alert.present();
  }

  async eliminarTarea(id: number) {
    const alert = await this.alertCtrl.create({
      header: '¿Eliminar tarea?',
      message: 'Esta acción no se puede deshacer',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí, eliminar',
          role: 'destructive',
          handler: async () => {
            await this.notifService.cancelarNotificacion(id);
            await this.tareasService.eliminarTarea(id);
            await this.cargarTareas();
            this.mostrarToast('Tarea eliminada', 'danger');
          }
        }
      ]
    });
    await alert.present();
  }

  async marcarCompletada(tarea: Tarea) {
    if (tarea.estado === 'finalizada') {
      this.mostrarToast('La tarea ya está completada', 'warning');
      return;
    }
    await this.tareasService.actualizarTarea(tarea.id, { estado: 'finalizada' });
    await this.cargarTareas();
    this.mostrarToast('Tarea completada', 'success');
  }

  reordenarTareas(event: any) {
    const itemMove = this.tareasFiltradas.splice(event.detail.from, 1)[0];
    this.tareasFiltradas.splice(event.detail.to, 0, itemMove);
    event.detail.complete();
    this.mostrarToast('Orden actualizado', 'primary');
  }

  async mostrarMenuBackup() {
    const alert = await this.alertCtrl.create({
      header: 'Respaldo de Datos',
      message: 'Gestiona tus copias de seguridad',
      buttons: [
        {
          text: 'Exportar Tareas',
          handler: () => {
            this.exportarTareas();
          }
        },
        {
          text: 'Importar Tareas',
          handler: () => {
            this.importarTareas();
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel'
        }
      ]
    });
    await alert.present();
  }

  async exportarTareas() {
    const dataStr = await this.tareasService.exportarTareas();
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tareas-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    this.mostrarToast('Archivo de respaldo descargado', 'success');
  }

  async importarTareas() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = async (event: any) => {
        try {
          const cantidad = await this.tareasService.importarTareas(event.target.result);
          await this.cargarTareas();
          this.mostrarToast(`${cantidad} tareas importadas`, 'success');
        } catch (error) {
          this.mostrarToast('Error al leer el archivo', 'danger');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  }

  esTareaCercana(tarea: Tarea): boolean {
    if (!tarea.fecha || tarea.estado === 'finalizada') return false;
    
    const fechaTarea = new Date(`${tarea.fecha}T${tarea.hora || '23:59'}`);
    const ahora = new Date();
    const en24Horas = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    
    return fechaTarea > ahora && fechaTarea <= en24Horas;
  }

  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }

  getColorPrioridad(prioridad: string): string {
    const colores: any = { 'baja': 'success', 'media': 'warning', 'alta': 'danger' };
    return colores[prioridad] || 'medium';
  }

  getColorEstado(estado: string): string {
    const colores: any = { 'inicial': 'primary', 'en-ejecucion': 'secondary', 'finalizada': 'medium' };
    return colores[estado] || 'medium';
  }

  getIconoCategoria(categoria: string): string {
    const iconos: any = { 'personal': 'person', 'trabajo': 'briefcase', 'social': 'people' };
    return iconos[categoria] || 'list';
  }
}