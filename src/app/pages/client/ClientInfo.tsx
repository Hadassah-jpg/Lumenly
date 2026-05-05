import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, User, Phone, AlertCircle } from 'lucide-react';
import { format, parseISO, addMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase, NEGOCIO_ID } from '../../../supabase';

interface Service {
  id: string;
  nombre: string;
  duracion_minutos: number;
  precio: number;
}

interface Settings {
  bloquear_multiple_cita: boolean;
}

export default function ClientInfo() {
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [mathAnswer, setMathAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const selectedServiceId = sessionStorage.getItem('selectedServiceId');
  const selectedDateStr = sessionStorage.getItem('selectedDate');
  const selectedTime = sessionStorage.getItem('selectedTime');

  useEffect(() => {
    if (!selectedServiceId || !selectedDateStr || !selectedTime) {
      navigate('/client/services');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: servicio }, { data: config }] = await Promise.all([
      supabase.from('servicios').select('*').eq('id', selectedServiceId).single(),
      supabase.from('configuracion').select('bloquear_multiple_cita').eq('negocio_id', NEGOCIO_ID).single()
    ]);

    if (servicio) setService(servicio);
    if (config) setSettings(config);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones básicas
    if (!clientName.trim() || !clientPhone.trim()) {
      setError('Por favor completa todos los campos');
      return;
    }

    if (clientPhone.length < 10) {
      setError('Por favor ingresa un número de teléfono válido');
      return;
    }

    // Anti-spam
    if (mathAnswer !== '8') {
      setError('Respuesta incorrecta. Por favor intenta de nuevo.');
      return;
    }

    setSubmitting(true);

    // Verificar si el teléfono ya tiene una cita activa
    if (settings?.bloquear_multiple_cita) {
      const { data: citasExistentes } = await supabase
        .from('citas')
        .select('id')
        .eq('negocio_id', NEGOCIO_ID)
        .neq('estado', 'cancelada')
        .gte('fecha', format(new Date(), 'yyyy-MM-dd'))
        .limit(1)
        // Buscar por whatsapp en clientas
        .eq('clientas.whatsapp', clientPhone);

      // Verificar desde clientas
      const { data: clientaExistente } = await supabase
        .from('clientas')
        .select('id')
        .eq('negocio_id', NEGOCIO_ID)
        .eq('whatsapp', clientPhone)
        .single();

      if (clientaExistente) {
        const { data: citaActiva } = await supabase
          .from('citas')
          .select('id')
          .eq('clienta_id', clientaExistente.id)
          .neq('estado', 'cancelada')
          .gte('fecha', format(new Date(), 'yyyy-MM-dd'))
          .limit(1);

        if (citaActiva && citaActiva.length > 0) {
          setError('Este número ya tiene una cita activa. Contáctanos para reagendar.');
          setSubmitting(false);
          return;
        }
      }
    }

    try {
      // Buscar o crear clienta
      let clientaId: string;

      const { data: clientaExistente } = await supabase
        .from('clientas')
        .select('id')
        .eq('negocio_id', NEGOCIO_ID)
        .eq('whatsapp', clientPhone)
        .single();

      if (clientaExistente) {
        clientaId = clientaExistente.id;
        // Actualizar nombre por si cambió
        await supabase
          .from('clientas')
          .update({ nombre: clientName.trim() })
          .eq('id', clientaId);
      } else {
        const { data: nuevaClienta, error: errorClienta } = await supabase
          .from('clientas')
          .insert({
            negocio_id: NEGOCIO_ID,
            nombre: clientName.trim(),
            whatsapp: clientPhone.trim()
          })
          .select('id')
          .single();

        if (errorClienta || !nuevaClienta) {
          setError('Error al registrar tus datos. Intenta de nuevo.');
          setSubmitting(false);
          return;
        }

        clientaId = nuevaClienta.id;
      }

      // Calcular hora_fin
      const [h, m] = selectedTime!.split(':').map(Number);
      const inicio = new Date(0, 0, 0, h, m);
      const fin = addMinutes(inicio, service!.duracion_minutos);
      const hora_fin = `${String(fin.getHours()).padStart(2, '0')}:${String(fin.getMinutes()).padStart(2, '0')}`;

      // Crear la cita
      const { error: errorCita } = await supabase
        .from('citas')
        .insert({
          negocio_id: NEGOCIO_ID,
          clienta_id: clientaId,
          servicio_id: selectedServiceId,
          fecha: selectedDateStr,
          hora_inicio: selectedTime,
          hora_fin,
          estado: 'confirmada',
          whatsapp_confirmacion_enviado: false
        });

      if (errorCita) {
        setError('Error al crear la cita. Intenta de nuevo.');
        setSubmitting(false);
        return;
      }

      // Guardar datos para pantalla de confirmación
      sessionStorage.setItem('clientName', clientName.trim());
      sessionStorage.setItem('clientPhone', clientPhone.trim());

      navigate('/client/confirmation');

    } catch (err) {
      setError('Ocurrió un error inesperado. Intenta de nuevo.');
      setSubmitting(false);
    }
  };

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
            onClick={() => navigate('/client/time')}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Tus datos</h1>
            {selectedDateStr && selectedTime && (
              <p className="text-sm text-muted-foreground capitalize">
                {format(parseISO(selectedDateStr), "d 'de' MMMM", { locale: es })} • {selectedTime}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Resumen del servicio */}
          {service && (
            <div className="bg-card rounded-2xl p-6 border border-border">
              <h3 className="font-semibold mb-2">{service.nombre}</h3>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{service.duracion_minutos} minutos</span>
                <span className="font-semibold text-accent">${service.precio} MXN</span>
              </div>
            </div>
          )}

          {/* Campos */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="María González"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Teléfono WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="5512345678"
                  maxLength={10}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Recibirás la confirmación por WhatsApp
              </p>
            </div>

            {/* Anti-spam */}
            <div className="bg-muted/50 rounded-xl p-4 border border-border">
              <label className="block text-sm font-medium mb-2">
                Pregunta de seguridad: ¿Cuánto es 3 + 5?
              </label>
              <input
                type="text"
                value={mathAnswer}
                onChange={(e) => setMathAnswer(e.target.value)}
                placeholder="Tu respuesta"
                className="w-full px-4 py-3 rounded-xl border border-input bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-primary to-accent text-white font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {submitting ? 'Confirmando cita...' : 'Confirmar cita'}
          </button>
        </form>
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