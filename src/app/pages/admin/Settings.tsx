import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase, NEGOCIO_ID } from '../../../supabase';

interface Settings {
  id: string;
  permitir_mismo_dia: boolean;
  anticipacion_minima_horas: number;
  hora_inicio: string;
  hora_cierre: string;
  bloquear_multiple_cita: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('configuracion')
      .select('*')
      .eq('negocio_id', NEGOCIO_ID)
      .single();

    if (error) {
      toast.error('Error al cargar configuración');
    } else {
      setSettings(data);
    }
    setLoading(false);
  };

  const handleUpdate = async (field: string, value: any) => {
    if (!settings) return;

    const updated = { ...settings, [field]: value };
    setSettings(updated);

    const { error } = await supabase
      .from('configuracion')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', settings.id);

    if (error) {
      toast.error('Error al guardar');
    } else {
      toast.success('Configuración actualizada');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">Cargando configuración...</p>
    </div>
  );

  if (!settings) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">No se encontró configuración</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Configuración</h1>
        <p className="text-muted-foreground">Ajusta la configuración de reservas</p>
      </div>

      <div className="bg-card rounded-2xl border border-border divide-y divide-border">
        {/* Mismo día */}
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Permitir citas el mismo día</h3>
              <p className="text-sm text-muted-foreground">
                Cuando está activado, los clientes pueden reservar citas para el día actual si hay espacios disponibles.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={settings.permitir_mismo_dia}
                onChange={(e) => handleUpdate('permitir_mismo_dia', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

        {/* Anticipación mínima */}
        <div className="p-6">
          <div>
            <h3 className="font-semibold mb-1">Tiempo mínimo de anticipación</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Número de horas de anticipación requeridas antes de que un cliente pueda reservar.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={settings.anticipacion_minima_horas}
                onChange={(e) => handleUpdate('anticipacion_minima_horas', parseInt(e.target.value))}
                min="0"
                max="48"
                className="w-32 px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">horas</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Ejemplo: Si estableces 2 horas, los clientes no pueden reservar citas que comiencen en menos de 2 horas.
            </p>
          </div>
        </div>

        {/* Horario */}
        <div className="p-6">
          <div>
            <h3 className="font-semibold mb-1">Horario de trabajo</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Establece tu horario general de trabajo.
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <label className="block text-sm font-medium mb-2">Hora de inicio</label>
                <input
                  type="time"
                  value={settings.hora_inicio}
                  onChange={(e) => handleUpdate('hora_inicio', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hora de cierre</label>
                <input
                  type="time"
                  value={settings.hora_cierre}
                  onChange={(e) => handleUpdate('hora_cierre', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bloquear múltiples */}
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Bloquear múltiples citas por teléfono</h3>
              <p className="text-sm text-muted-foreground">
                Cuando está activado, un número de teléfono no puede tener más de una cita activa. Ayuda a prevenir reservas duplicadas.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={settings.bloquear_multiple_cita}
                onChange={(e) => handleUpdate('bloquear_multiple_cita', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Consejos */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Consejos</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Establece un tiempo mínimo de anticipación para tener tiempo de prepararte.</li>
          <li>• Bloquea múltiples citas por teléfono para evitar spam y duplicados.</li>
          <li>• Ajusta tu disponibilidad en la sección "Agenda" para días específicos.</li>
          <li>• Las configuraciones se aplican inmediatamente a todas las nuevas reservas.</li>
        </ul>
      </div>
    </div>
  );
}