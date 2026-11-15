"""Descarga la serie mensual GPM IMERG para el recuadro de Chimayoy.

Requiere una cuenta NASA Earthdata y EARTHDATA_TOKEN como variable de entorno.
No almacena credenciales en el proyecto ni en el sitio web.
"""
from datetime import date
from pathlib import Path
import os
import earthaccess

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "raw" / "GPM_3IMERGM"
SHORT_NAME = "GPM_3IMERGM"
VERSION = "07"  # En el catálogo Earthdata, la serie descargada se identifica como V07/V07B.
START_DATE = "2020-01-01"
END_DATE = date.today().isoformat()

LAT_CENTER, LON_CENTER, RADIUS = 1.19, -77.30, 0.25
WEST, EAST = LON_CENTER - RADIUS, LON_CENTER + RADIUS
SOUTH, NORTH = LAT_CENTER - RADIUS, LAT_CENTER + RADIUS


def main() -> None:
    if not os.environ.get("EARTHDATA_TOKEN"):
        raise EnvironmentError("Define EARTHDATA_TOKEN en el entorno antes de ejecutar la descarga.")
    DEST.mkdir(parents=True, exist_ok=True)
    auth = earthaccess.login(strategy="environment")
    if not auth.authenticated:
        raise RuntimeError("No se pudo autenticar la sesión con NASA Earthdata.")

    granules = earthaccess.search_data(
        short_name=SHORT_NAME,
        version=VERSION,
        bounding_box=(WEST, SOUTH, EAST, NORTH),
        temporal=(START_DATE, END_DATE),
    )
    if not granules:
        raise RuntimeError("NASA Earthdata no devolvió archivos para el periodo y recuadro solicitados.")

    total_bytes = 0
    for granule in granules:
        size = granule.size
        total_bytes += size() if callable(size) else size
    print(f"Productos encontrados: {len(granules)}")
    print(f"Tamaño aproximado: {total_bytes / (1024**2):.1f} MB")
    print(f"Periodo consultado: {START_DATE} a {END_DATE}")
    print(f"Recuadro: lon {WEST:.2f} a {EAST:.2f}, lat {SOUTH:.2f} a {NORTH:.2f}")
    earthaccess.download(granules, str(DEST))
    print(f"Archivos guardados en: {DEST}")


if __name__ == "__main__":
    main()
