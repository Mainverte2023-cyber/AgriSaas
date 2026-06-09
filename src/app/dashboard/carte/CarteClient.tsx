"use client";
import { useEffect, useState } from "react";

interface Champ {
  id: string; nom: string; surface_ha: number;
  gps_lat: number | null; gps_lng: number | null;
  localisation: string | null; notes: string | null;
  cultures: any[]; organisations?: any;
}

interface Props { champs: Champ[]; role: string; }

export default function CarteClient({ champs, role }: Props) {
  const [MapComponent, setMapComponent] = useState<any>(null);
  const [selected, setSelected] = useState<Champ | null>(null);
  const [filter, setFilter] = useState("tous");

  const champsAvecGPS = champs.filter(c => c.gps_lat && c.gps_lng);
  const champsFiltered = filter === "avec_gps" ? champsAvecGPS : champs;

  // Centre par défaut : Bamako, Mali
  const center: [number, number] = champsAvecGPS.length > 0
    ? [champsAvecGPS[0].gps_lat!, champsAvecGPS[0].gps_lng!]
    : [12.6500, -8.0000];

  useEffect(() => {
    // Leaflet s'importe en client uniquement (pas de SSR)
    import("react-leaflet").then(mod => {
      setMapComponent(mod);
    });
  }, []);

  if (!MapComponent) {
    return (
      <div className="animate-fade-up space-y-6">
        <div className="page-header">
          <h1 className="text-2xl font-extrabold text-slate-800">🗺️ Carte des champs</h1>
          <p className="text-slate-500 text-sm">Visualisez tous vos champs sur la carte</p>
        </div>
        <div className="section-card section-body flex items-center justify-center h-96">
          <div className="text-center text-slate-400">
            <div className="text-4xl mb-3">🗺️</div>
            <div className="font-semibold">Chargement de la carte…</div>
          </div>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, ZoomControl } = MapComponent;

  return (
    <div className="animate-fade-up space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="page-header mb-0">
          <h1 className="text-2xl font-extrabold text-slate-800">🗺️ Carte des champs</h1>
          <p className="text-slate-500 text-sm">{champsAvecGPS.length} champ(s) avec coordonnées GPS sur {champs.length} total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFilter("tous")} className={`btn-${filter === "tous" ? "primary" : "secondary"} text-sm py-2`}>
            Tous ({champs.length})
          </button>
          <button onClick={() => setFilter("avec_gps")} className={`btn-${filter === "avec_gps" ? "primary" : "secondary"} text-sm py-2`}>
            📍 Avec GPS ({champsAvecGPS.length})
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Carte */}
        <div className="lg:col-span-2 section-card overflow-hidden" style={{ height: 520 }}>
          {champsAvecGPS.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
              <div className="text-5xl mb-4">📍</div>
              <h3 className="font-bold text-slate-600 text-lg">Aucun champ avec GPS</h3>
              <p className="text-sm mt-2">Ajoutez des coordonnées GPS lors de la création de vos champs pour les voir sur la carte.</p>
              <a href="/dashboard/champs/nouveau" className="btn-primary mt-4 text-sm">+ Ajouter un champ</a>
            </div>
          ) : (
            <MapContainer
              center={center}
              zoom={10}
              style={{ width: "100%", height: "100%" }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ZoomControl position="bottomright" />
              {champsAvecGPS.map((champ) => (
                <Marker
                  key={champ.id}
                  position={[champ.gps_lat!, champ.gps_lng!]}
                  eventHandlers={{ click: () => setSelected(champ) }}
                >
                  <Popup>
                    <div className="p-1 min-w-[160px]">
                      <div className="font-bold text-slate-800 text-sm">{champ.nom}</div>
                      {champ.surface_ha && (
                        <div className="text-xs text-slate-500 mt-1">📐 {champ.surface_ha} ha</div>
                      )}
                      {champ.localisation && (
                        <div className="text-xs text-slate-500">📍 {champ.localisation}</div>
                      )}
                      {champ.cultures?.length > 0 && (
                        <div className="text-xs text-green-600 font-semibold mt-1">
                          🌾 {champ.cultures.filter((c: any) => c.statut === "en_cours").length} culture(s) active(s)
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* Liste des champs */}
        <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 520 }}>
          {champsFiltered.length === 0 ? (
            <div className="section-card section-body text-center text-slate-400 text-sm py-8">
              Aucun champ trouvé
            </div>
          ) : champsFiltered.map(champ => (
            <div
              key={champ.id}
              onClick={() => setSelected(champ)}
              className={`section-card section-body cursor-pointer transition-all ${
                selected?.id === champ.id ? "border-2 border-green-400 bg-green-50" : "hover:border-green-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold text-slate-800 text-sm">{champ.nom}</div>
                {champ.gps_lat ? (
                  <span className="badge badge-green text-[10px]">📍 GPS</span>
                ) : (
                  <span className="badge badge-slate text-[10px]">Sans GPS</span>
                )}
              </div>
              {champ.surface_ha && (
                <div className="text-xs text-slate-500 mt-1">📐 {champ.surface_ha} hectares</div>
              )}
              {champ.localisation && (
                <div className="text-xs text-slate-500">📍 {champ.localisation}</div>
              )}
              {role === "super_admin" && champ.organisations?.nom && (
                <div className="text-xs text-slate-400 mt-1">🏢 {champ.organisations.nom}</div>
              )}
              {champ.cultures?.filter((c: any) => c.statut === "en_cours").length > 0 && (
                <div className="text-xs text-green-600 font-semibold mt-1">
                  🌾 {champ.cultures.filter((c: any) => c.statut === "en_cours").length} culture(s) active(s)
                </div>
              )}
              {champ.gps_lat && (
                <a
                  href={`https://www.google.com/maps?q=${champ.gps_lat},${champ.gps_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline mt-1 block"
                  onClick={e => e.stopPropagation()}
                >
                  🔗 Voir sur Google Maps
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
