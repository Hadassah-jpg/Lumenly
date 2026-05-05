import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Sparkles, Instagram } from 'lucide-react';
import { supabase, NEGOCIO_ID } from '../../supabase';

interface BusinessProfile {
  nombre: string;
  slogan: string;
  instagram: string;
  logo_url: string | null;
}

interface Photo {
  id: string;
  url: string;
  destacada: boolean;
}

export default function Home() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: negocio }, { data: fotos }] = await Promise.all([
      supabase
        .from('negocios')
        .select('nombre, slogan, instagram, logo_url')
        .eq('id', NEGOCIO_ID)
        .single(),
      supabase
        .from('fotos_negocio')
        .select('*')
        .eq('negocio_id', NEGOCIO_ID)
        .eq('destacada', true)
        .order('orden')
    ]);

    if (negocio) setProfile(negocio);
    if (fotos) setPhotos(fotos);
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Cargando...</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex flex-col items-center px-6 py-12">
        <div className="max-w-md w-full space-y-8">

          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden shadow-lg">
              {profile?.logo_url ? (
                <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Sparkles className="w-12 h-12 text-white" />
              )}
            </div>
          </div>

          {/* Nombre y slogan */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold text-foreground">
              {profile?.nombre}
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {profile?.slogan}
            </p>
            {profile?.instagram && (
              <a
                href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-accent hover:text-primary transition-colors"
              >
                <Instagram className="w-4 h-4" />
                <span className="text-sm">{profile.instagram}</span>
              </a>
            )}
          </div>

          {/* Galería de fotos destacadas */}
          {photos.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground text-center">
                Nuestro trabajo
              </p>
              <div className="grid grid-cols-3 gap-2">
                {photos.slice(0, 6).map((photo) => (
                  <div
                    key={photo.id}
                    className="aspect-square rounded-2xl overflow-hidden border border-border shadow-sm"
                  >
                    <img
                      src={photo.url}
                      alt="Trabajo"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="space-y-4 pt-2">
            <button
              onClick={() => navigate('/client/services')}
              className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-primary to-accent text-white font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              Soy clienta
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-4 px-6 rounded-full border-2 border-primary text-primary font-medium hover:bg-primary hover:text-white transition-all"
            >
              Acceso negocio
            </button>
          </div>

          {/* Footer */}
          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              Powered by <span className="font-medium text-accent">Starvia Digital</span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}