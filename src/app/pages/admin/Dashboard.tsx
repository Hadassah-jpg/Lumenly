import { useState, useEffect } from 'react';
import { Calendar, Clock, TrendingUp, Award } from 'lucide-react';
import { format, parseISO, isAfter, startOfWeek, endOfWeek, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase, NEGOCIO_ID } from '../../../supabase';

interface Appointment {
  id: string;
  fecha: string;
  hora_inicio: string;
  estado: string;
  clientas: { nombre: string };
  servicios: { id: string; nombre: string };
}

export default function Dashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('citas')
      .select(`
        id, fecha, hora_inicio, estado,
        clientas ( nombre ),
        servicios ( id, nombre )
      `)
      .eq('negocio_id', NEGOCIO_ID)
      .neq('estado', 'cancelada')
      .order('fecha');

    if (!error) setAppointments(data || []);
    setLoading(false);
  };

  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');

  const upcoming = appointments.filter(apt =>
    isAfter(parseISO(`${apt.fecha}T${apt.hora_inicio}`), now)
  );

  const todayApts = upcoming.filter(apt => apt.fecha === today);

  const weekApts = upcoming.filter(apt =>
    isWithinInterval(parseISO(apt.fecha), {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 })
    })
  );

  const monthApts = appointments.filter(apt =>
    isWithinInterval(parseISO(apt.fecha), {
      start: startOfMonth(now),
      end: endOfMonth(now)
    })
  );

  // Servicio más reservado del mes
  const serviceCounts: { [key: string]: { nombre: string; count: number } } = {};
  monthApts.forEach(apt => {
    const id = apt.servicios?.id;
    if (!id) return;
    if (!serviceCounts[id]) serviceCounts[id] = { nombre: apt.servicios.nombre, count: 0 };
    serviceCounts[id].count++;
  });
  const mostBooked = Object.values(serviceCounts).sort((a, b) => b.count - a.count)[0];

  const nextAppointment = upcoming[0];

  const stats = [
    { label: 'Citas hoy', value: todayApts.length, icon: Calendar, color: 'bg-blue-100 text-blue-600' },
    { label: 'Citas esta semana', value: weekApts.length, icon: TrendingUp, color: 'bg-green-100 text-green-600' },
    { label: 'Citas próximas', value: upcoming.length, icon: Clock, color: 'bg-purple-100 text-purple-600' },
    { label: 'Más reservado este mes', value: mostBooked?.nombre || 'N/A', icon: Award, color: 'bg-amber-100 text-amber-600', isText: true },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">Cargando dashboard...</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Bienvenida, aquí está el resumen de tu negocio</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-card rounded-2xl p-6 border border-border hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
                  <p className={`${stat.isText ? 'text-lg' : 'text-3xl'} font-bold`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Próxima cita */}
      {nextAppointment && (
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-6 border border-primary/20">
          <h2 className="text-lg font-semibold mb-4">Próxima cita</h2>
          <div className="bg-white rounded-xl p-6 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{nextAppointment.clientas?.nombre}</h3>
                <p className="text-muted-foreground">{nextAppointment.servicios?.nombre}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                nextAppointment.estado === 'confirmada' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {nextAppointment.estado.charAt(0).toUpperCase() + nextAppointment.estado.slice(1)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span className="capitalize">
                  {format(parseISO(nextAppointment.fecha), "EEEE, d 'de' MMMM", { locale: es })}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{nextAppointment.hora_inicio}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista próximas citas */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Próximas citas</h2>
        </div>
        <div className="divide-y divide-border">
          {upcoming.slice(0, 5).map((apt) => (
            <div key={apt.id} className="p-6 hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{apt.clientas?.nombre}</h4>
                  <p className="text-sm text-muted-foreground">{apt.servicios?.nombre}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium capitalize">
                    {format(parseISO(apt.fecha), "d 'de' MMM", { locale: es })}
                  </p>
                  <p className="text-sm text-muted-foreground">{apt.hora_inicio}</p>
                </div>
              </div>
            </div>
          ))}
          {upcoming.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              No hay citas próximas
            </div>
          )}
        </div>
      </div>
    </div>
  );
}