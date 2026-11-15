"""Procesa archivos mensuales GPM IMERG V07 y genera una serie para Chimayoy.

Entrada esperada: data/raw/GPM_3IMERGM/*.HDF5
Salida: data/processed/precipitacion_chimayoy.csv

La variable precipitation de GPM_3IMERGM suele estar expresada como tasa media
(mm/h). El script verifica las unidades del archivo antes de convertir a mm/mes.
"""
from pathlib import Path
import re
import numpy as np
import pandas as pd
import xarray as xr

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "GPM_3IMERGM"
OUT = ROOT / "data" / "processed" / "precipitacion_chimayoy.csv"

LAT_CENTER, LON_CENTER, RADIUS = 1.19, -77.30, 0.25
SOUTH, NORTH = LAT_CENTER - RADIUS, LAT_CENTER + RADIUS
WEST, EAST = LON_CENTER - RADIUS, LON_CENTER + RADIUS
VARIABLE = "precipitation"


def normalized_units(value: str) -> str:
    return (value or "").lower().replace(" ", "").replace("per", "/").replace("hours", "h").replace("hour", "h")


def main() -> None:
    files = sorted(RAW.glob("*.HDF5")) + sorted(RAW.glob("*.hdf5"))
    if not files:
        raise FileNotFoundError(f"No se encontraron archivos HDF5 en {RAW}")

    versions = set()
    for file in files:
        match = re.search(r"\.V(\d+[A-Z]?)\.HDF5$", file.name, flags=re.IGNORECASE)
        if match:
            versions.add(match.group(1).upper())
    if len(versions) > 1:
        raise ValueError(f"Se encontraron varias versiones de IMERG en la misma carpeta: {sorted(versions)}. Separa los archivos y procesa una sola versión por serie.")

    ds = xr.open_mfdataset(files, combine="by_coords", group="Grid", engine="h5netcdf")
    if VARIABLE not in ds.data_vars:
        raise KeyError(f"No se encontró la variable {VARIABLE}. Variables: {list(ds.data_vars)}")

    # Unificar longitudes en [-180, 180) para que el recorte funcione en Colombia.
    if float(ds.lon.max()) > 180:
        ds = ds.assign_coords(lon=((ds.lon + 180) % 360) - 180).sortby("lon")

    lat_slice = slice(NORTH, SOUTH) if float(ds.lat[0]) > float(ds.lat[-1]) else slice(SOUTH, NORTH)
    zona = ds.sel(lat=lat_slice, lon=slice(WEST, EAST))
    if zona.sizes.get("lat", 0) == 0 or zona.sizes.get("lon", 0) == 0:
        raise ValueError("El recorte no contiene celdas. Verifica las coordenadas y el sistema de referencia.")

    units = normalized_units(ds[VARIABLE].attrs.get("units", ""))
    accepted = {"mm/h", "mmh-1", "mmhr-1", "mmhour-1", "mmh^-1"}
    if units not in accepted:
        raise ValueError(
            f"Unidades no reconocidas para {VARIABLE}: {ds[VARIABLE].attrs.get('units')!r}. "
            "No se realizará una conversión sin confirmar las unidades del producto."
        )

    weights = np.cos(np.deg2rad(zona.lat))
    rate = zona[VARIABLE].weighted(weights).mean(dim=("lat", "lon"), skipna=True).compute()
    series = rate.to_series().dropna()
    series.index = pd.to_datetime(series.index.astype(str))
    series = series.sort_index()

    output = pd.DataFrame({
        "date": series.index.strftime("%Y-%m-%d"),
        "precipitation_rate_mm_h": series.to_numpy(),
        "precipitation_mm_month": (series.to_numpy() * 24 * series.index.days_in_month),
        "grid_cells": int(zona.sizes["lat"] * zona.sizes["lon"]),
    })

    # Anomalía respecto al promedio del mismo mes calendario en el periodo disponible.
    output["month"] = pd.to_datetime(output["date"]).dt.month
    climatology = output.groupby("month")["precipitation_mm_month"].mean()
    output["climatology_mm_month"] = output["month"].map(climatology)
    output["anomaly_mm_month"] = output["precipitation_mm_month"] - output["climatology_mm_month"]
    output.drop(columns=["month"], inplace=True)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    output.to_csv(OUT, index=False, float_format="%.4f")
    print(f"Archivo generado: {OUT}")
    print(f"Meses procesados: {len(output)}")
    print(f"Periodo: {output.date.iloc[0]} a {output.date.iloc[-1]}")
    print(f"Celdas incluidas por mes: {int(zona.sizes['lat'] * zona.sizes['lon'])}")
    ds.close()


if __name__ == "__main__":
    main()
