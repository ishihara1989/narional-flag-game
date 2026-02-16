import { useEffect, useRef, type FC } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Feature, Geometry, GeoJsonProperties } from 'geojson';

// Fix for default marker icon in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapBoardProps {
    onMapClick?: (latlng: L.LatLng) => void;
    markers?: { lat: number; lng: number; message?: string }[];
    center?: [number, number];
    zoom?: number;
    highlightCountry?: Feature<Geometry, GeoJsonProperties> | null;
    height?: string;
}

function ClickHandler({ onClick }: { onClick: (latlng: L.LatLng) => void }) {
    useMapEvents({
        click(e) {
            onClick(e.latlng);
        },
    });
    return null;
}

function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, zoom);
    }, [center, zoom, map]);
    return null;
}

const MapBoard: FC<MapBoardProps> = ({
    onMapClick,
    markers = [],
    center = [20, 0],
    zoom = 2,
    highlightCountry,
    height = '100%'
}) => {
    const geoJsonLayerRef = useRef<L.GeoJSON>(null);

    useEffect(() => {
        if (geoJsonLayerRef.current) {
            geoJsonLayerRef.current.clearLayers();
            if (highlightCountry) {
                geoJsonLayerRef.current.addData(highlightCountry);
            }
        }
    }, [highlightCountry]);

    return (
        <div
            className="w-full h-full rounded-xl overflow-hidden shadow-lg border-2 border-white/20"
            style={{ width: '100%', height, minHeight: '420px' }}
        >
            <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {onMapClick && <ClickHandler onClick={onMapClick} />}
                <MapUpdater center={center} zoom={zoom} />
                {markers.map((marker, idx) => (
                    <Marker key={idx} position={[marker.lat, marker.lng]}>
                        {marker.message && <Popup>{marker.message}</Popup>}
                    </Marker>
                ))}
                {highlightCountry && (
                    <GeoJSON
                        key={String(highlightCountry.id ?? 'highlight-country')}
                        data={highlightCountry}
                        style={{
                            color: '#ffeb3b',
                            weight: 2,
                            fillColor: '#ffeb3b',
                            fillOpacity: 0.5
                        }}
                    />
                )}
            </MapContainer>
        </div>
    );
};

export default MapBoard;
