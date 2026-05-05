import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase, NEGOCIO_ID } from '../../../supabase';

interface Appointment {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  clientas: { nombre: string; whatsapp: string };
  servicios: { nombre: string; duracion_minutos: number };
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [rescheduleApt, setRescheduleApt] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('citas')
      .select(`
        id, fecha, hora_inicio, hora_fin, estado,
        clientas ( nombre, whatsapp ),
        servicios ( nombre, duracion_minutos )
      `)
      .eq('negocio_id', NEGOCIO_ID)
      .order('fecha', { ascending: false });

    if (error) {
      toast.error('Error al cargar citas');
    } else {
      setAppointments(data || []);
    }
    setLoading(false);
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime || !rescheduleApt) {
      toast.error('Por favor selecciona fecha y hora');
      return;
    }

    // Calcular hora_fin basada en duración del servicio
    const [h, m] = newTime.split(':').map(Number);
    const duracion = rescheduleApt.servicios.duracion_minutos;
    const fin = new Date(0, 0, 0, h, m + duracion);
    const hora_fin = `${String(fin.getHours()).padStart(2, '0')}:${String(fin.getMinutes()).padStart(2, '0')}`;

    const { error } = await supabase
      .from('citas')
      .update({
        fecha: newDate,
        hora_inicio: newTime,
        hora_fin,
        estado: 'confirmada'
      })
      .eq('id', rescheduleApt.id);

    if (error) { toast.error('Error al reagendar'); return; }

    toast.success(
      `WhatsApp enviado: Hola ${rescheduleApt.clientas.nombre}, tu cita ha sido reagendada para el ${format(parseISO(newDate), "d 'de' MMMM", { locale: es })} a las ${newTime}. ¡Te esperamos! 💕`,
      { duration: 5000 }
    );

    fetchAppointments();
    setRescheduleApt(null);
    setNewDate('');
    setNewTime('');
  };

  const handleCancel = async (apt: Appointment) => {
    if (!confirm('¿Estás segura de que quieres cancelar esta cita?')) return;

    const { error } = await supabase
      .from('citas')
      .update({ estado: 'cancelada', whatsapp_cancelacion_enviado: true })
      .eq('id', apt.id);

    if (error) { toast.error('Error al cancelar'); return; }

    toast.success(
      `WhatsApp enviado: Hola ${apt.clientas.nombre}, tu cita del ${format(parseISO(apt.fecha), "d 'de' MMMM", { locale: es })} a las ${apt.hora_inicio} ha sido cancelada. ¡Disculpa los inconvenientes! 💕`,
      { duration: 5000 }
    );

    fetchAppointments();
  };

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'confirmada': return 'bg-green-100 text-green-700 border-green-200';
      case 'pendiente': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'cancelada': return 'bg-red-100 text-red-700 border-red-200';
      case 'reagendada': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filtered = appointments.filter(apt => {
    const matchesSearch =
      apt.clientas?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.clientas?.whatsapp.includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || apt.estado === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">Cargando citas...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Citas</h1>
        <p className="text-muted-foreground">Gestiona todas las citas de tu negocio</p>
      </div>

      {/* Filtros */}
      <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o teléfono..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">Todos los estados</option>
            <option value="confirmada">Confirmada</option>
            <option value="pendiente">Pendiente</option>
            <option value="cancelada">Cancelada</option>
            <option value="reagendada">Reagendada</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Cliente</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Servicio</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Fecha</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Hora</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Estado</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((apt) => (
                <tr key={apt.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium">{apt.clientas?.nombre}</div>
                    <div className="text-sm text-muted-foreground">{apt.clientas?.whatsapp}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">{apt.servicios?.nombre}</div>
                    <div className="text-xs text-muted-foreground">{apt.servicios?.duracion_minutos} min</div>
                  </td>
                  <td className="px-6 py-4 capitalize">
                    {format(parseISO(apt.fecha), "d 'de' MMM yyyy", { locale: es })}
                  </td>
                  <td className="px-6 py-4">{apt.hora_inicio}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusBadgeClass(apt.estado)}`}>
                      {apt.estado.charAt(0).toUpperCase() + apt.estado.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {apt.estado !== 'cancelada' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setRescheduleApt(apt)}
                          className="px-3 py-1.5 text-sm rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                        >
                          Reagendar
                        </button>
                        <button
                          onClick={() => handleCancel(apt)}
                          className="px-3 py-1.5 text-sm rounded-lg bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              No se encontraron citas
            </div>
          )}
        </div>
      </div>

      {/* Panel Reagendar */}
      {rescheduleApt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Reagendar cita</h2>
              <button onClick={() => setRescheduleApt(null)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <div className="font-medium">{rescheduleApt.clientas?.nombre}</div>
              <div className="text-sm text-muted-foreground">{rescheduleApt.servicios?.nombre}</div>
              <div className="text-sm text-muted-foreground">
                Actual: {format(parseISO(rescheduleApt.fecha), "d 'de' MMM", { locale: es })} • {rescheduleApt.hora_inicio}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nueva fecha</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nueva hora</label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                onClick={handleReschedule}
                className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-primary to-accent text-white font-medium shadow-lg hover:shadow-xl transition-all"
              >
                Confirmar reagendamiento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}