"""Post-process the monthly SMAP CSV exported from Google Earth Engine.

Input : data/raw/SMAP/smap_chimayoy_mensual_2015_2025.csv
Output: data/processed/humedad_suelo_chimayoy.csv

The script preserves the native volumetric units (m3/m3), adds a calendar-
month climatology and anomaly, and never fills missing observations.
"""
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "data" / "raw" / "SMAP" / "smap_chimayoy_mensual_2015_2025.csv"
OUTPUT = ROOT / "data" / "processed" / "humedad_suelo_chimayoy.csv"


def main():
    if not INPUT.exists():
        raise FileNotFoundError(
            f"No se encontró {INPUT}. Exporta primero el CSV desde Google Earth Engine."
        )

    df = pd.read_csv(INPUT)
    required = {"month", "soil_moisture_m3m3"}
    missing = required.difference(df.columns)
    if missing:
        raise ValueError(f"Faltan columnas requeridas en el CSV: {sorted(missing)}")

    df["month"] = pd.to_datetime(df["month"], format="%Y-%m", errors="coerce")
    df["soil_moisture_m3m3"] = pd.to_numeric(
        df["soil_moisture_m3m3"], errors="coerce"
    )
    df = df.dropna(subset=["month"]).sort_values("month").reset_index(drop=True)

    # Values outside the physically plausible product range are treated as missing.
    valid = df["soil_moisture_m3m3"].between(0.0, 1.0)
    df.loc[~valid, "soil_moisture_m3m3"] = pd.NA

    df["year"] = df["month"].dt.year
    df["month_number"] = df["month"].dt.month

    # Monthly climatology: average of the same calendar month across available years.
    climatology = df.groupby("month_number")["soil_moisture_m3m3"].mean()
    df["climatology_m3m3"] = df["month_number"].map(climatology)
    df["anomaly_m3m3"] = df["soil_moisture_m3m3"] - df["climatology_m3m3"]

    # Export ISO month labels for straightforward frontend parsing.
    df["month"] = df["month"].dt.strftime("%Y-%m-01")
    preferred = [
        "month", "year", "month_number", "soil_moisture_m3m3",
        "climatology_m3m3", "anomaly_m3m3", "valid_pixels",
        "daily_images", "source_version"
    ]
    columns = [column for column in preferred if column in df.columns]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    df[columns].to_csv(OUTPUT, index=False, float_format="%.6f")

    valid_rows = int(df["soil_moisture_m3m3"].notna().sum())
    print(f"Archivo generado: {OUTPUT}")
    print(f"Meses en el archivo: {len(df)} | Meses con datos válidos: {valid_rows}")
    print("Unidad conservada: m³/m³ (fracción volumétrica)")
    print("Nota: la serie combina colecciones V005 y V006; revisar source_version.")


if __name__ == "__main__":
    main()
