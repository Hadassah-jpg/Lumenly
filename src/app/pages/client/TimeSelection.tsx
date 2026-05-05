import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Clock } from 'lucide-react';
import { format, parseISO, addMinutes, parse, isBefore, addHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase, NEGOCIO_ID } from '../../../supabase';

interface Service {
  id: string;
  nombre: string;
  descripcion: string;
  duracion_minutos: number;
  precio: number;
}

interface Appointment {
  id: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  servicios: { duracion_minutos: number };
}

interface TimeBlock {
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  bloqueado: boolean;
}

interface Settings {
  anticipacion_minima_horas: number;
  hora_inicio: string;
  hora_cierre: string;
}

export default function TimeSelection() {
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [timeBlock, setTimeBlock] = useState<TimeBlock | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedServiceId = sessionStorage.getItem('selectedServiceId');
  const selectedDateStr = sessionStorage.getItem('selectedDate');

  useEffect(() => {
    if (!selectedServiceId || !selectedDateStr) {
      navigate('/client/services');
      return;
    }
    fetchData();
  }, [selectedServiceId, selectedDateStr]);

  const fetchData = async () => {
    setLoading(true);
    const [
      { data: servicio },
      { data: citas },
      { data: bloque },
      { data: config }
    ] = await Promise.all([
      supabase
        .from('servicios')
        .select('*')
        .eq('id', selectedServiceId)
        .single(),
      supabase
        .from('citas')
        .select('id, hora_inicio, hora_fin, estado, servicios(duracion_minutos)')
        .eq('negocio_id', NEGOCIO_ID)
        .eq('fecha', selectedDateStr)
        .neq('estado', 'cancelada'),
      supabase
        .from('disponibilidad')
        .select('*')
        .eq('negocio_id', NEGOCIO_ID)
        .eq('fecha', selectedDateStr)
        .eq('bloqueado', false)
        .single(),
      supabase
        .from('configuracion')
        .select('anticipacion_minima_horas, hora_inicio, hora_cierre')
        .eq('negocio_id', NEGOCIO_ID)
        .single()
    ]);

    if (servicio) setService(servicio);
    if (citas) setAppointments(citas);
    if (bloque) setTimeBlock(bloque);
    if (config) setSettings(config);
    setLoading(false);
  };

  const parseTime = (timeStr: string, dateStr: string): Date => {
    return parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date());
  };

  const getAvailableTimeSlots = (): string[] => {
    if (!service || !selectedDateStr || !settings) return [];

    // Usar bloque de disponibilidad del día o caer en horario general
    const workStartStr = timeBlock?.hora_inicio || settings.hora_inicio;
    const workEndStr = timeBlock?.hora_fin || settings.hora_cierre;

    if (!timeBlock) return []; // Si no hay disponibilidad para ese día

    const slots: string[] = [];
    const serviceDuration = service.duracion_minutos;
    const workStart = parseTime(workStartStr.slice(0, 5), selectedDateStr);
    const workEnd = parseTime(workEndStr.slice(0, 5), selectedDateStr);
    const now = new Date();
    const minAdvanceTime = addHours(now, settings.anticipacion_minima_horas);

    let currentSlot = workStart;

    while (currentSlot < workEnd) {
      const slotTimeStr = format(currentSlot, 'HH:mm');
      const slotEnd = addMinutes(currentSlot, serviceDuration);

      // SMART LOGIC 1: No mostrar si es antes del tiempo mínimo de anticipación
      if (isBefore(currentSlot, minAdvanceTime)) {
        currentSlot = addMinutes(currentSlot, 30);
        continue;
      }

      // SMART LOGIC 2: No mostrar si el servicio no cabe antes del cierre
      if (slotEnd > workEnd) break;

      // SMART LOGIC 3: No mostrar si hay conflicto con citas existentes
      let hasConflict = false;
      for (const apt of appointments) {
        const aptStart = parseTime(apt.hora_inicio.slice(0, 5), selectedDateStr);
        const aptEnd = parseTime(apt.hora_fin.slice(0, 5), selectedDateStr);

        // Verificar solapamiento
        if (currentSlot < aptEnd && slotEnd > aptStart) {
          hasConflict = true;
          break;
        }
      }

      if (!hasConflict) {
        slots.push(slotTimeStr);
      }

      currentSlot = addMinutes(currentSlot, 30);
    }

    return slots;
  };

  const availableSlots = getAvailableTimeSlots();

  const morningSlots = availableSlots.filter(t => parseInt(t.split(':')[0]) < 14);
  const afternoonSlots = availableSlots.filter(t => parseInt(t.split(':')[0]) >= 14);

  const handleTimeSelect = (time: string) => {
    sessionStorage.setItem('selectedTime', time);
    navigate('/client/info');
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Cargando horarios...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/client/date')}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Selecciona la hora</h1>
            {selectedDateStr && (
              <p className="text-sm text-muted-foreground capitalize">
                {format(parseISO(selectedDateStr), "EEEE, d 'de' MMMM", { locale: es })}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {/* Info del servicio */}
        {service && (
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{service.nombre}</h3>
                <p className="text-sm text-muted-foreground mt-1">{service.descripcion}</p>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-accent font-semibold">
                <Clock className="w-4 h-4" />
                <span>{service.duracion_minutos} min</span>
              </div>
            </div>
          </div>
        )}

        {/* Slots */}
        {availableSlots.length === 0 ? (
          <div className="bg-card rounded-2xl p-8 border border-border text-center">
            <p className="text-muted-foreground">
              No hay horarios disponibles para este día. Por favor selecciona otra fecha.
            </p>
            <button
              onClick={() => navigate('/client/date')}
              className="mt-4 px-6 py-2 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary hover:text-white transition-all"
            >
              Cambiar fecha
            </button>
          </div>
        ) : (
          <>
            {morningSlots.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">Mañana</h3>
                <div className="grid grid-cols-3 gap-3">
                  {morningSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => handleTimeSelect(time)}
                      className="py-3 px-4 rounded-xl border-2 border-primary/30 bg-primary/5 text-primary font-medium hover:bg-primary hover:text-white transition-all"
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {afternoonSlots.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">Tarde</h3>
                <div className="grid grid-cols-3 gap-3">
                  {afternoonSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => handleTimeSelect(time)}
                      className="py-3 px-4 rounded-xl border-2 border-primary/30 bg-primary/5 text-primary font-medium hover:bg-primary hover:text-white transition-all"
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-medium">Starvia Digital</span>
          </p>
        </div>
      </div>
    </div>
  );
}