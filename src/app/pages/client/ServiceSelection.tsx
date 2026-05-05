import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Clock, DollarSign } from 'lucide-react';
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

interface BusinessProfile {
  nombre: string;
}

export default function ServiceSelection() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const [{ data: serviciosData }, { data: negocioData }] = await Promise.all([
      supabase
        .from('servicios')
        .select('*')
        .eq('negocio_id', NEGOCIO_ID)
        .eq('activo', true)
        .order('orden'),
      supabase
        .from('negocios')
        .select('nombre')
        .eq('id', NEGOCIO_ID)
        .single()
    ]);

    setServices(serviciosData || []);
    setBusiness(negocioData);
    setLoading(false);
  };

  const handleServiceSelect = (serviceId: string) => {
    sessionStorage.setItem('selectedServiceId', serviceId);
    navigate('/client/date');
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Cargando servicios...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Selecciona tu servicio</h1>
            <p className="text-sm text-muted-foreground">{business?.nombre}</p>
          </div>
        </div>
      </div>

      {/* Servicios */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        {services.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No hay servicios disponibles por el momento
          </div>
        ) : (
          <div className="grid gap-4">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => handleServiceSelect(service.id)}
                className="bg-card rounded-2xl p-6 border border-border hover:border-primary hover:shadow-lg transition-all text-left group"
              >
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                    {service.nombre}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {service.descripcion}
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{service.duracion_minutos} min</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-accent">
                      <DollarSign className="w-4 h-4" />
                      <span>${service.precio} MXN</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
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