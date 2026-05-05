import { useState, useEffect } from 'react';
import { Plus, GripVertical, Pencil, Trash2, X } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { toast } from 'sonner';
import { supabase, NEGOCIO_ID } from '../../../supabase';

interface Service {
  id: string;
  nombre: string;
  descripcion: string;
  duracion_minutos: number;
  precio: number;
  activo: boolean;
  orden: number;
}

interface DraggableServiceProps {
  service: Service;
  index: number;
  moveService: (dragIndex: number, hoverIndex: number) => void;
  onEdit: (service: Service) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}

const DraggableService = ({ service, index, moveService, onEdit, onDelete, onToggle }: DraggableServiceProps) => {
  const [{ isDragging }, drag, preview] = useDrag({
    type: 'service',
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop({
    accept: 'service',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveService(item.index, index);
        item.index = index;
      }
    },
  });

  return (
    <div
      ref={(node) => preview(drop(node))}
      className={`bg-card rounded-xl p-6 border border-border transition-all ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-4">
        <div ref={drag} className="cursor-move pt-1">
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-lg">{service.nombre}</h3>
              <p className="text-sm text-muted-foreground mt-1">{service.descripcion}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={service.activo}
                onChange={(e) => onToggle(service.id, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>{service.duracion_minutos} minutos</span>
            <span className="font-semibold text-accent">${service.precio} MXN</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(service)} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(service.id)} className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    duracion_minutos: 60,
    precio: 0,
    activo: true,
  });

  // Cargar servicios de Supabase
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('servicios')
      .select('*')
      .eq('negocio_id', NEGOCIO_ID)
      .order('orden');

    if (error) {
      toast.error('Error al cargar servicios');
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  const moveService = async (dragIndex: number, hoverIndex: number) => {
    const newServices = [...services];
    const dragService = newServices[dragIndex];
    newServices.splice(dragIndex, 1);
    newServices.splice(hoverIndex, 0, dragService);

    const updated = newServices.map((s, i) => ({ ...s, orden: i + 1 }));
    setServices(updated);

    // Guardar nuevo orden en Supabase
    for (const s of updated) {
      await supabase.from('servicios').update({ orden: s.orden }).eq('id', s.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre || !formData.descripcion) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    if (editingService) {
      const { error } = await supabase
        .from('servicios')
        .update(formData)
        .eq('id', editingService.id);

      if (error) { toast.error('Error al actualizar'); return; }
      toast.success('Servicio actualizado');
    } else {
      const { error } = await supabase
        .from('servicios')
        .insert({ ...formData, negocio_id: NEGOCIO_ID, orden: services.length + 1 });

      if (error) { toast.error('Error al agregar'); return; }
      toast.success('Servicio agregado');
    }

    fetchServices();
    setShowModal(false);
    setEditingService(null);
    setFormData({ nombre: '', descripcion: '', duracion_minutos: 60, precio: 0, activo: true });
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      nombre: service.nombre,
      descripcion: service.descripcion,
      duracion_minutos: service.duracion_minutos,
      precio: service.precio,
      activo: service.activo,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás segura de eliminar este servicio?')) return;
    const { error } = await supabase.from('servicios').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Servicio eliminado');
    fetchServices();
  };

  const handleToggle = async (id: string, activo: boolean) => {
    const { error } = await supabase.from('servicios').update({ activo }).eq('id', id);
    if (error) { toast.error('Error al actualizar'); return; }
    toast.success(activo ? 'Servicio activado' : 'Servicio desactivado');
    fetchServices();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">Cargando servicios...</p>
    </div>
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Servicios</h1>
            <p className="text-muted-foreground">Gestiona los servicios que ofreces</p>
          </div>
          <button
            onClick={() => {
              setEditingService(null);
              setFormData({ nombre: '', descripcion: '', duracion_minutos: 60, precio: 0, activo: true });
              setShowModal(true);
            }}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-primary to-accent text-white font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Agregar servicio
          </button>
        </div>

        <div className="space-y-4">
          {services.map((service, index) => (
            <DraggableService
              key={service.id}
              service={service}
              index={index}
              moveService={moveService}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {editingService ? 'Editar servicio' : 'Nuevo servicio'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-muted rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre del servicio</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Manicure Básico"
                    className="w-full px-4 py-3 rounded-xl border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Descripción</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Describe el servicio..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Duración (min)</label>
                    <input
                      type="number"
                      value={formData.duracion_minutos}
                      onChange={(e) => setFormData({ ...formData, duracion_minutos: parseInt(e.target.value) })}
                      min="15"
                      step="15"
                      className="w-full px-4 py-3 rounded-xl border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Precio (MXN)</label>
                    <input
                      type="number"
                      value={formData.precio}
                      onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) })}
                      min="0"
                      step="50"
                      className="w-full px-4 py-3 rounded-xl border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                  <span className="text-sm font-medium">Servicio activo</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-primary to-accent text-white font-medium shadow-lg hover:shadow-xl transition-all"
                >
                  {editingService ? 'Guardar cambios' : 'Agregar servicio'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}