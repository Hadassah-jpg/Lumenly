import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import {
  format, startOfWeek, endOfWeek, eachDayOfInterval,
  addWeeks, subWeeks, isSameDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase, NEGOCIO_ID } from '../../../supabase';

interface Appointment {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  clientas: { nombre: string };
  servicios: { nombre: string };
}

interface TimeBlock {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  hora_especifica: string | null;
  bloqueado: boolean;
}

export default function Calendar() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [blockStartTime, setBlockStartTime] = useState('09:00');
  const [blockEndTime, setBlockEndTime] = useState('18:00');

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: 12 }, (_, i) => i + 8);

  useEffect(() => {
    fetchData();
  }, [currentWeek]);

  const fetchData = async () => {
    setLoading(true);
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    const [{ data: citas }, { data: bloques }] = await Promise.all([
      supabase
        .from('citas')
        .select('id, fecha, hora_inicio, hora_fin, clientas(nombre), servicios(nombre)')
        .eq('negocio_id', NEGOCIO_ID)
        .neq('estado', 'cancelada')
        .gte('fecha', weekStartStr)
        .lte('fecha', weekEndStr),
      supabase
        .from('disponibilidad')
        .select('*')
        .eq('negocio_id', NEGOCIO_ID)
        .gte('fecha', weekStartStr)
        .lte('fecha', weekEndStr)
    ]);

    if (citas) setAppointments(citas);
    if (bloques) setTimeBlocks(bloques);
    setLoading(false);
  };

  const handleAddTimeBlock = async () => {
    if (!selectedDate || !blockStartTime || !blockEndTime) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    // Verificar si ya existe bloque general para ese día
    const { data: existente } = await supabase
      .from('disponibilidad')
      .select('id')
      .eq('negocio_id', NEGOCIO_ID)
      .eq('fecha', selectedDate)
      .is('hora_especifica', null)
      .single();

    if (existente) {
      const { error } = await supabase
        .from('disponibilidad')
        .update({
          hora_inicio: blockStartTime,
          hora_fin: blockEndTime,
          bloqueado: false
        })
        .eq('id', existente.id);

      if (error) { toast.error('Error al actualizar'); return; }
      toast.success('Horario actualizado');
    } else {
      const { error } = await supabase
        .from('disponibilidad')
        .insert({
          negocio_id: NEGOCIO_ID,
          fecha: selectedDate,
          hora_inicio: blockStartTime,
          hora_fin: blockEndTime,
          bloqueado: false,
          hora_especifica: null
        });

      if (error) { toast.error('Error al agregar'); return; }
      toast.success('Horario disponible agregado');
    }

    fetchData();
    setShowModal(false);
    setSelectedDate('');
    setBlockStartTime('09:00');
    setBlockEndTime('18:00');
  };

  // Togglear hora específica
  const handleToggleHour = async (date: Date, hour: number) => {
    const fechaStr = format(date, 'yyyy-MM-dd');
    const horaStr = `${hour.toString().padStart(2, '0')}:00`;
    const horaFinStr = `${(hour + 1).toString().padStart(2, '0')}:00`;

    // Verificar si hay bloque general para este día
    const dayBlock = timeBlocks.find(b =>
      b.fecha === fechaStr && !b.hora_especifica
    );

    if (!dayBlock) {
      toast.error('Primero agrega disponibilidad para este día');
      return;
    }

    // Verificar si ya existe un bloque específico para esta hora
    const horaBlock = timeBlocks.find(b =>
      b.fecha === fechaStr &&
      b.hora_especifica?.slice(0, 5) === horaStr
    );

    if (horaBlock) {
      // Togglear el bloque existente
      const { error } = await supabase
        .from('disponibilidad')
        .update({ bloqueado: !horaBlock.bloqueado })
        .eq('id', horaBlock.id);

      if (error) { toast.error('Error al actualizar'); return; }
      toast.success(horaBlock.bloqueado ? 'Hora disponible' : 'Hora bloqueada');
    } else {
      // Crear nuevo bloque específico para esta hora
      const { error } = await supabase
        .from('disponibilidad')
        .insert({
          negocio_id: NEGOCIO_ID,
          fecha: fechaStr,
          hora_inicio: horaStr,
          hora_fin: horaFinStr,
          hora_especifica: horaStr,
          bloqueado: true
        });

      if (error) { toast.error('Error al bloquear'); return; }
      toast.success('Hora bloqueada');
    }

    fetchData();
  };

  const getAppointmentForHour = (date: Date, hour: number) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.find(apt => {
      const aptHour = parseInt(apt.hora_inicio.slice(0, 2));
      return apt.fecha === dateStr && aptHour === hour;
    });
  };

  const getDayBlock = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return timeBlocks.find(b => b.fecha === dateStr && !b.hora_especifica);
  };

  const getHourBlock = (date: Date, hour: number) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const horaStr = `${hour.toString().padStart(2, '0')}:00`;
    return timeBlocks.find(b =>
      b.fecha === dateStr &&
      b.hora_especifica?.slice(0, 5) === horaStr
    );
  };

  const isHourInDayBlock = (date: Date, hour: number) => {
    const block = getDayBlock(date);
    if (!block) return false;
    const startHour = parseInt(block.hora_inicio.slice(0, 2));
    const endHour = parseInt(block.hora_fin.slice(0, 2));
    return hour >= startHour && hour < endHour;
  };

  const getCellStyle = (date: Date, hour: number) => {
    const appointment = getAppointmentForHour(date, hour);
    if (appointment) return 'bg-primary/20 border-primary cursor-default';

    const hourBlock = getHourBlock(date, hour);
    if (hourBlock?.bloqueado) return 'bg-red-50 border-red-200 hover:bg-red-100 cursor-pointer';

    const inDayBlock = isHourInDayBlock(date, hour);
    if (inDayBlock) return 'bg-green-50 border-green-200 hover:bg-red-50 hover:border-red-200 cursor-pointer';

    return 'bg-gray-50 border-gray-100 cursor-default';
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">Cargando agenda...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Agenda</h1>
          <p className="text-muted-foreground">Gestiona tu disponibilidad y citas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-primary to-accent text-white font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Agregar disponibilidad
        </button>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-border overflow-x-auto">
        {/* Navegación */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-semibold text-lg capitalize">
            {format(weekStart, "d 'de' MMMM", { locale: es })} — {format(weekEnd, "d 'de' MMMM yyyy", { locale: es })}
          </h2>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-8 gap-1 min-w-[700px]">
          {/* Headers */}
          <div />
          {daysInWeek.map((day) => (
            <div key={day.toISOString()} className="text-center pb-2">
              <div className="text-xs font-medium capitalize text-muted-foreground">
                {format(day, 'EEE', { locale: es })}
              </div>
              <div className={`text-base font-semibold mt-1 w-8 h-8 rounded-full flex items-center justify-center mx-auto ${
                isSameDay(day, new Date()) ? 'bg-primary text-white' : ''
              }`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}

          {/* Horas */}
          {hours.map((hour) => (
            <>
              <div key={`hour-${hour}`} className="text-xs text-muted-foreground py-2 text-right pr-2 flex items-center justify-end">
                {hour}:00
              </div>
              {daysInWeek.map((day) => {
                const appointment = getAppointmentForHour(day, hour);
                const hourBlock = getHourBlock(day, hour);

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={`min-h-[52px] rounded-lg border-2 transition-all text-xs p-1 ${getCellStyle(day, hour)}`}
                    onClick={() => {
                      if (!appointment) handleToggleHour(day, hour);
                    }}
                    title={
                      appointment
                        ? `${appointment.clientas?.nombre} — ${appointment.servicios?.nombre}`
                        : isHourInDayBlock(day, hour)
                          ? hourBlock?.bloqueado
                            ? 'Clic para desbloquear'
                            : 'Clic para bloquear esta hora'
                          : 'Sin disponibilidad'
                    }
                  >
                    {appointment && (
                      <div>
                        <div className="font-semibold text-primary truncate">
                          {appointment.clientas?.nombre}
                        </div>
                        <div className="text-muted-foreground truncate">
                          {appointment.servicios?.nombre}
                        </div>
                      </div>
                    )}
                    {!appointment && hourBlock?.bloqueado && (
                      <span className="text-red-500 font-medium">Bloqueado</span>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>

        {/* Leyenda */}
        <div className="mt-6 pt-4 border-t border-border flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded border-2 bg-green-50 border-green-200" />
            <span className="text-muted-foreground">Disponible (clic para bloquear)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded border-2 bg-red-50 border-red-200" />
            <span className="text-muted-foreground">Bloqueado (clic para desbloquear)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded border-2 bg-primary/20 border-primary" />
            <span className="text-muted-foreground">Cita reservada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded border-2 bg-gray-50 border-gray-100" />
            <span className="text-muted-foreground">Sin disponibilidad</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Agregar disponibilidad</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Agrega el horario general del día. Después puedes bloquear horas específicas haciendo clic en el calendario.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Fecha</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hora de inicio</label>
                <input
                  type="time"
                  value={blockStartTime}
                  onChange={(e) => setBlockStartTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hora de cierre</label>
                <input
                  type="time"
                  value={blockEndTime}
                  onChange={(e) => setBlockEndTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                onClick={handleAddTimeBlock}
                className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-primary to-accent text-white font-medium shadow-lg hover:shadow-xl transition-all"
              >
                Agregar horario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}