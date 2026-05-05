import { useState, useEffect } from 'react';
import { Upload, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, NEGOCIO_ID } from '../../../supabase';

interface BusinessProfile {
  id: string;
  nombre: string;
  slogan: string;
  ciudad: string;
  colonia: string;
  whatsapp: string;
  instagram: string;
  logo_url: string | null;
}

interface Photo {
  id: string;
  url: string;
  destacada: boolean;
  orden: number;
}

export default function Business() {
  const [activeTab, setActiveTab] = useState<'profile' | 'photos'>('profile');
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: negocio }, { data: fotos }] = await Promise.all([
      supabase.from('negocios').select('*').eq('id', NEGOCIO_ID).single(),
      supabase.from('fotos_negocio').select('*').eq('negocio_id', NEGOCIO_ID).order('orden')
    ]);
    if (negocio) setProfile(negocio);
    if (fotos) setPhotos(fotos);
    setLoading(false);
  };

  const handleProfileUpdate = async (field: string, value: string) => {
    if (!profile) return;
    const updated = { ...profile, [field]: value };
    setProfile(updated);

    setSaving(true);
    const { error } = await supabase
      .from('negocios')
      .update({ [field]: value })
      .eq('id', NEGOCIO_ID);

    if (error) {
      toast.error('Error al guardar');
    } else {
      toast.success('Cambios guardados');
    }
    setSaving(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop();
    const fileName = `logo_${NEGOCIO_ID}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('negocios')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast.error('Error al subir logo');
      return;
    }

    const { data } = supabase.storage.from('negocios').getPublicUrl(fileName);
    await handleProfileUpdate('logo_url', data.publicUrl);
    toast.success('Logo actualizado');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (photos.length + files.length > 20) {
      toast.error('Máximo 20 fotos permitidas');
      return;
    }

    for (const file of Array.from(files)) {
      const fileName = `${NEGOCIO_ID}_${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('fotos')
        .upload(fileName, file);

      if (uploadError) {
        toast.error(`Error al subir ${file.name}`);
        continue;
      }

      const { data } = supabase.storage.from('fotos').getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('fotos_negocio')
        .insert({
          negocio_id: NEGOCIO_ID,
          url: data.publicUrl,
          destacada: false,
          orden: photos.length + 1
        });

      if (dbError) {
        toast.error('Error al guardar foto');
      }
    }

    toast.success('Fotos agregadas');
    fetchData();
  };

  const handleDeletePhoto = async (photo: Photo) => {
    const fileName = photo.url.split('/').pop();
    if (fileName) {
      await supabase.storage.from('fotos').remove([fileName]);
    }

    const { error } = await supabase
      .from('fotos_negocio')
      .delete()
      .eq('id', photo.id);

    if (error) {
      toast.error('Error al eliminar');
      return;
    }

    toast.success('Foto eliminada');
    fetchData();
  };

  const handleToggleFeatured = async (photo: Photo) => {
    const { error } = await supabase
      .from('fotos_negocio')
      .update({ destacada: !photo.destacada })
      .eq('id', photo.id);

    if (error) {
      toast.error('Error al actualizar');
      return;
    }

    toast.success(photo.destacada ? 'Foto quitada de destacadas' : 'Foto marcada como destacada');
    fetchData();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">Cargando...</p>
    </div>
  );

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Mi Negocio</h1>
        <p className="text-muted-foreground">
          Personaliza la información de tu negocio
          {saving && <span className="ml-2 text-xs text-accent">Guardando...</span>}
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'profile'
                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Perfil
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'photos'
                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Galería de fotos
          </button>
        </div>

        {/* Perfil */}
        {activeTab === 'profile' && (
          <div className="p-6 space-y-6">
            {/* Logo */}
            <div>
              <label className="block text-sm font-medium mb-3">Logo del negocio</label>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden">
                  {profile.logo_url ? (
                    <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-10 h-10 text-white" />
                  )}
                </div>
                <div>
                  <label className="px-4 py-2 rounded-lg bg-primary/10 text-primary font-medium cursor-pointer hover:bg-primary hover:text-white transition-all inline-block">
                    Cambiar logo
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  <p className="text-sm text-muted-foreground mt-2">PNG o JPG, máximo 2MB</p>
                </div>
              </div>
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium mb-2">Nombre del negocio</label>
              <input
                type="text"
                value={profile.nombre}
                onChange={(e) => handleProfileUpdate('nombre', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Slogan */}
            <div>
              <label className="block text-sm font-medium mb-2">Slogan</label>
              <textarea
                value={profile.slogan || ''}
                onChange={(e) => handleProfileUpdate('slogan', e.target.value)}
                maxLength={120}
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(profile.slogan || '').length}/120 caracteres
              </p>
            </div>

            {/* Ubicación */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Ciudad</label>
                <input
                  type="text"
                  value={profile.ciudad || ''}
                  onChange={(e) => handleProfileUpdate('ciudad', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Colonia</label>
                <input
                  type="text"
                  value={profile.colonia || ''}
                  onChange={(e) => handleProfileUpdate('colonia', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Contacto */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Teléfono WhatsApp</label>
                <input
                  type="tel"
                  value={profile.whatsapp || ''}
                  onChange={(e) => handleProfileUpdate('whatsapp', e.target.value)}
                  placeholder="5512345678"
                  className="w-full px-4 py-3 rounded-xl border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Instagram</label>
                <input
                  type="text"
                  value={profile.instagram || ''}
                  onChange={(e) => handleProfileUpdate('instagram', e.target.value)}
                  placeholder="@tunegocio"
                  className="w-full px-4 py-3 rounded-xl border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Fotos */}
        {activeTab === 'photos' && (
          <div className="p-6 space-y-6">
            <div>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary font-medium cursor-pointer hover:bg-primary hover:text-white transition-all">
                <Upload className="w-5 h-5" />
                Subir fotos
                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
              </label>
              <p className="text-sm text-muted-foreground mt-2">
                Máximo 20 fotos. Toca ⭐ para que aparezcan en la página de inicio.
              </p>
            </div>

            {photos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      photo.destacada ? 'border-amber-400' : 'border-border'
                    }`}
                  >
                    <img src={photo.url} alt="Gallery" className="w-full h-full object-cover" />

                    {/* Botones siempre visibles */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2 flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleToggleFeatured(photo)}
                        className={`p-2 rounded-lg transition-all ${
                          photo.destacada
                            ? 'bg-amber-500 text-white'
                            : 'bg-white/90 text-foreground hover:bg-amber-100'
                        }`}
                        title={photo.destacada ? 'Quitar de destacadas' : 'Marcar como destacada'}
                      >
                        <Star className={`w-4 h-4 ${photo.destacada ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleDeletePhoto(photo)}
                        className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all"
                        title="Eliminar foto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Badge destacada */}
                    {photo.destacada && (
                      <div className="absolute top-2 right-2 bg-amber-500 text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        Destacada
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/50 rounded-xl">
                <Upload className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">No hay fotos aún</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Sube fotos de tu trabajo para mostrarlas a tus clientes
                </p>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary font-medium cursor-pointer hover:bg-primary hover:text-white transition-all">
                  <Upload className="w-5 h-5" />
                  Subir primera foto
                  <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}