import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, startOfDay, addMonths, subMonths, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase, NEGOCIO_ID } from '../../../supabase';

interface TimeBlock {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  bloqueado: boolean;
}

interface Settings {
  permitir_mismo_dia: boolean;
  anticipacion_minima_horas: number;
}

interface Service {
  id: string;
  nombre: string;
}

export default function DateSelection() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedServiceId = sessionStorage.getItem('selectedServiceId');

  useEffect(() => {
    if (!selectedServiceId) {
      navigate('/client/services');
      return;
    }
    fetchData();
  }, [selectedServiceId]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: bloques }, { data: config }, { data: servicio }] = await Promise.all([
      supabase
        .from('disponibilidad')
        .select('*')
        .eq('negocio_id', NEGOCIO_ID)
        .eq('bloqueado', false),
      supabase
        .from('configuracion')
        .select('permitir_mismo_dia, anticipacion_minima_horas')
        .eq('negocio_id', NEGOCIO_ID)
        .single(),
      supabase
        .from('servicios')
        .select('id, nombre')
        .eq('id', selectedServiceId)
        .single()
    ]);

    if (bloques) setTimeBlocks(bloques);
    if (config) setSettings(config);
    if (servicio) setService(servicio);
    setLoading(false);
  };

  const availableDates = timeBlocks.map(block => block.fecha);

  const isDateAvailable = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const today = startOfDay(new Date());

    if (isBefore(date, today)) return false;

    if (isSameDay(date, today) && !settings?.permitir_mismo_dia) return false;

    return availableDates.includes(dateStr);
  };

  const handleDateSelect = (date: Date) => {
    if (!isDateAvailable(date)) return;
    sessionStorage.setItem('selectedDate', format(date, 'yyyy-MM-dd'));
    navigate('/client/time');
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Cargando...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/client/services')}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Selecciona la fecha</h1>
            {service && (
              <p className="text-sm text-muted-foreground">{service.nombre}</p>
            )}
          </div>
        </div>
      </div>

      {/* Calendario */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">

          {/* Navegación de mes */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-semibold text-lg capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Grid del calendario */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {daysInMonth.map((date) => {
              const available = isDateAvailable(date);
              const isToday = isSameDay(date, new Date());

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => available && handleDateSelect(date)}
                  disabled={!available}
                  className={`
                    aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all
                    ${available
                      ? 'bg-primary/10 text-primary hover:bg-primary hover:text-white cursor-pointer'
                      : 'text-muted-foreground/40 cursor-not-allowed'
                    }
                    ${isToday && available ? 'ring-2 ring-accent' : ''}
                  `}
                >
                  {format(date, 'd')}
                </button>
              );
            })}
          </div>

          {/* Leyenda */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary/10" />
                <span className="text-muted-foreground">Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted/40" />
                <span className="text-muted-foreground">No disponible</span>
              </div>
            </div>
          </div>
        </div>

        {/* Aviso si no hay fechas */}
        {availableDates.length === 0 && (
          <div className="mt-4 p-4 bg-muted/50 rounded-xl text-center">
            <p className="text-sm text-muted-foreground">
              No hay fechas disponibles por el momento. Intenta más tarde.
            </p>
          </div>
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