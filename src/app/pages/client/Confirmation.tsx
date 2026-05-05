import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, Calendar, Clock, DollarSign, Phone, Home } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase, NEGOCIO_ID } from '../../../supabase';

interface Service {
  id: string;
  nombre: string;
  descripcion: string;
  duracion_minutos: number;
  precio: number;
}

interface Business {
  nombre: string;
  whatsapp: string;
}

export default function Confirmation() {
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedServiceId = sessionStorage.getItem('selectedServiceId');
  const selectedDateStr = sessionStorage.getItem('selectedDate');
  const selectedTime = sessionStorage.getItem('selectedTime');
  const clientName = sessionStorage.getItem('clientName');
  const clientPhone = sessionStorage.getItem('clientPhone');

  useEffect(() => {
    if (!selectedServiceId || !selectedDateStr || !selectedTime || !clientName) {
      navigate('/client/services');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: servicio }, { data: negocio }] = await Promise.all([
      supabase.from('servicios').select('*').eq('id', selectedServiceId).single(),
      supabase.from('negocios').select('nombre, whatsapp').eq('id', NEGOCIO_ID).single()
    ]);

    if (servicio) setService(servicio);
    if (negocio) setBusiness(negocio);
    setLoading(false);
  };

  const handleNewBooking = () => {
    sessionStorage.removeItem('selectedServiceId');
    sessionStorage.removeItem('selectedDate');
    sessionStorage.removeItem('selectedTime');
    sessionStorage.removeItem('clientName');
    sessionStorage.removeItem('clientPhone');
    navigate('/client/services');
  };

  // Generar link de WhatsApp para recordatorio
  const getWhatsAppLink = () => {
    if (!business || !service || !selectedDateStr || !selectedTime) return '#';

    const mensaje = encodeURIComponent(
      `Hola ${clientName} 💅 Tu cita en ${business.nombre} ha sido confirmada para el ${format(parseISO(selectedDateStr), "d 'de' MMMM", { locale: es })} a las ${selectedTime} (${service.duracion_minutos} minutos). ¡Te esperamos!`
    );
    const telefono = clientPhone?.replace(/\D/g, '');
    return `https://wa.me/52${telefono}?text=${mensaje}`;
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Cargando...</p>
    </div>
  );

  if (!service || !selectedDateStr || !selectedTime || !clientName) return null;

  const whatsappMessage = `Hola ${clientName}, tu cita en ${business?.nombre} ha sido confirmada para el ${format(parseISO(selectedDateStr), "d 'de' MMMM", { locale: es })} a las ${selectedTime} (${service.duracion_minutos} minutos). ¡Te esperamos!`;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full">

        {/* Ícono de éxito */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">¡Cita confirmada!</h1>
          <p className="text-muted-foreground">
            Recibirás un recordatorio por WhatsApp 24 horas antes
          </p>
        </div>

        {/* Detalles de la cita */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-lg space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-1">{service.nombre}</h3>
            <p className="text-sm text-muted-foreground">{service.descripcion}</p>
          </div>

          <div className="border-t border-border" />

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha</p>
                <p className="font-medium capitalize">
                  {format(parseISO(selectedDateStr), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hora</p>
                <p className="font-medium">
                  {selectedTime} ({service.duracion_minutos} minutos)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Precio</p>
                <p className="font-medium text-accent">${service.precio} MXN</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/30 flex items-center justify-center">
                <Phone className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{clientName}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Preview del mensaje WhatsApp */}
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <p className="text-xs font-semibold text-green-800 mb-2">
              Mensaje de confirmación:
            </p>
            <p className="text-sm text-green-900">{whatsappMessage}</p>
          </div>

          {/* Botón de WhatsApp */}
          <a
            href={getWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-6 rounded-full bg-green-500 hover:bg-green-600 text-white font-medium transition-all flex items-center justify-center gap-2"
          >
            Enviar por WhatsApp
          </a>
        </div>

        {/* Acciones */}
        <div className="mt-6 space-y-3">
          <button
            onClick={handleNewBooking}
            className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-primary to-accent text-white font-medium shadow-lg hover:shadow-xl transition-all"
          >
            Agendar otra cita
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 px-6 rounded-full border-2 border-border bg-white text-foreground font-medium hover:bg-muted transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Volver al inicio
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-medium">Starvia Digital</span>
          </p>
        </div>
      </div>
    </div>
  );
}