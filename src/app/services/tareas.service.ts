import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

export interface Tarea {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: 'personal' | 'trabajo' | 'social';
  prioridad: 'baja' | 'media' | 'alta';
  estado: 'inicial' | 'en-ejecucion' | 'finalizada';
  fecha: string;
  hora: string;
  observaciones: string;
  fechaCreacion: string;
}

@Injectable({
  providedIn: 'root'
})
export class TareasService {
  private _storage: Storage | null = null;
  private tareas: Tarea[] = [];

  constructor(private storage: Storage) {
    this.init();
  }

  async init() {
    const storage = await this.storage.create();
    this._storage = storage;
    await this.cargarTareas();
  }

  async cargarTareas() {
    const tareas = await this._storage?.get('tareas');
    this.tareas = tareas || [];
    console.log('Tareas cargadas:', this.tareas);
    return this.tareas;
  }

  async guardarTareas() {
    await this._storage?.set('tareas', this.tareas);
    console.log('Tareas guardadas:', this.tareas);
  }

  async agregarTarea(tarea: Omit<Tarea, 'id' | 'fechaCreacion'>) {
    const nuevaTarea: Tarea = {
      ...tarea,
      id: Date.now(),
      fechaCreacion: new Date().toISOString()
    };
    this.tareas.push(nuevaTarea);
    await this.guardarTareas();
    console.log('Tarea agregada:', nuevaTarea);
    return nuevaTarea;
  }

  async actualizarTarea(id: number, tarea: Partial<Tarea>) {
    const index = this.tareas.findIndex(t => t.id === id);
    if (index !== -1) {
      this.tareas[index] = { ...this.tareas[index], ...tarea };
      await this.guardarTareas();
      console.log('Tarea actualizada:', this.tareas[index]);
    }
  }

  async eliminarTarea(id: number) {
    this.tareas = this.tareas.filter(t => t.id !== id);
    await this.guardarTareas();
    console.log('Tarea eliminada');
  }

  obtenerTareas() {
    return [...this.tareas];
  }

  filtrarTareas(filtros: any) {
    console.log('Aplicando filtros:', filtros);
    console.log('Total de tareas:', this.tareas.length);
    
    const resultado = this.tareas.filter(tarea => {
      const cumpleCategoria = !filtros.categoria || filtros.categoria === 'todas' || tarea.categoria === filtros.categoria;
      const cumplePrioridad = !filtros.prioridad || filtros.prioridad === 'todas' || tarea.prioridad === filtros.prioridad;
      const cumpleEstado = !filtros.estado || filtros.estado === 'todas' || tarea.estado === filtros.estado;
      const cumpleBusqueda = !filtros.busqueda || tarea.titulo.toLowerCase().includes(filtros.busqueda.toLowerCase());
      
      console.log(`Tarea "${tarea.titulo}":`, {
        categoria: tarea.categoria,
        cumpleCategoria,
        cumplePrioridad,
        cumpleEstado,
        cumpleBusqueda
      });
      
      return cumpleCategoria && cumplePrioridad && cumpleEstado && cumpleBusqueda;
    });
    
    console.log('Tareas filtradas:', resultado.length);
    return resultado;
  }

  async exportarTareas(): Promise<string> {
    return JSON.stringify(this.tareas, null, 2);
  }

  async importarTareas(tareasJSON: string): Promise<number> {
    try {
      const tareasImportadas = JSON.parse(tareasJSON);
      this.tareas = tareasImportadas;
      await this.guardarTareas();
      return tareasImportadas.length;
    } catch (error) {
      console.error('Error al importar:', error);
      return 0;
    }
  }
}