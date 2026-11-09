import json
import sys
import os
from fitparse import FitFile

def fit_to_geojson(fit_file_path):
    if not os.path.exists(fit_file_path):
        print(f"Error: El archivo '{fit_file_path}' no existe.")
        sys.exit(1)

    # Reemplazar la extensión .fit por .json
    base_name = os.path.splitext(fit_file_path)[0]
    output_json_path = f"{base_name}.json"

    print(f"Procesando: {fit_file_path} ...")
    
    fitfile = FitFile(fit_file_path)
    coordinates = []
    
    for record in fitfile.get_messages('record'):
        lat, lng = None, None
        for data in record:
            if data.name == 'position_lat' and data.value:
                lat = data.value * (180.0 / (2**31))
            elif data.name == 'position_long' and data.value:
                lng = data.value * (180.0 / (2**31))
        
        if lat is not None and lng is not None:
            coordinates.append([lng, lat])

    if not coordinates:
        print("Advertencia: No se encontraron coordenadas en el archivo.")
        sys.exit(1)

    geojson = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": coordinates
            }
        }]
    }

    with open(output_json_path, 'w') as f:
        json.dump(geojson, f, indent=2)
        
    print(f"¡Éxito! Archivo guardado como: {output_json_path} ({len(coordinates)} puntos).")

if __name__ == "__main__":
    # Validar que se haya pasado un argumento
    if len(sys.argv) < 2:
        print("Uso correcto: python3 fit2geojson.py <archivo.fit>")
        sys.exit(1)
        
    archivo_entrada = sys.argv[1]
    fit_to_geojson(archivo_entrada)