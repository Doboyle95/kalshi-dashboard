from __future__ import annotations

from pathlib import Path

import pandas as pd


REPO_ROOT = Path(__file__).resolve().parents[1]
KALSHI_ROOT = Path(r"C:\Users\doboy\OneDrive\Documents\KalshiData")
POLY_DIR = KALSHI_ROOT / "data" / "raw_polymarket"
FORECASTEX_DIR = KALSHI_ROOT / "data" / "raw_forecastex"
OUT_PATH = REPO_ROOT / "src" / "data" / "trade_size_daily.csv"

BUCKET_LABELS = ["1-9", "10-99", "100-999", "1k-9k", "10k-49k", "50k-99k", "100k+"]
BUCKET_BINS = [0, 9, 99, 999, 9_999, 49_999, 99_999, float("inf")]
BUCKET_ORDER = {label: i + 1 for i, label in enumerate(BUCKET_LABELS)}


def _existing_kalshi_rows() -> pd.DataFrame:
    """Reuse the already-built Kalshi aggregate so competitor refreshes stay quick."""
    if not OUT_PATH.exists():
        raise FileNotFoundError(
            f"{OUT_PATH} does not exist. Restore the Kalshi-only aggregate first, "
            "or extend this script to rebuild Kalshi from parquet."
        )

    df = pd.read_csv(OUT_PATH, parse_dates=["date"])
    if "platform" in df.columns:
        kalshi = df[df["platform"].eq("Kalshi")].copy()
    else:
        kalshi = df.copy()
        kalshi.insert(0, "platform", "Kalshi")
    return kalshi


def _date_from_name(path: Path, suffix: str) -> str:
    return path.name.replace(suffix, "")


def _bucket_quantities(qty: pd.Series) -> pd.Series:
    return pd.cut(qty, bins=BUCKET_BINS, labels=BUCKET_LABELS, include_lowest=True)


def _aggregate_one_platform(
    platform: str,
    files: list[Path],
    suffix: str,
    quantity_col: str,
) -> pd.DataFrame:
    pieces: list[pd.DataFrame] = []

    for path in files:
        try:
            df = pd.read_csv(path, usecols=[quantity_col])
        except (pd.errors.EmptyDataError, ValueError):
            continue

        if df.empty:
            continue

        qty = pd.to_numeric(df[quantity_col], errors="coerce")
        qty = qty[qty.gt(0)]
        if qty.empty:
            continue

        day = pd.to_datetime(_date_from_name(path, suffix))
        tmp = pd.DataFrame({
            "date": day,
            "contracts_traded": qty.astype(float),
            "size_bucket": _bucket_quantities(qty),
        }).dropna(subset=["size_bucket"])

        grouped = tmp.groupby(["date", "size_bucket"], observed=False).agg(
            trade_count=("contracts_traded", "size"),
            contracts=("contracts_traded", "sum"),
            max_trade_size=("contracts_traded", "max"),
            avg_trade_size=("contracts_traded", "mean"),
        ).reset_index()
        grouped["platform"] = platform
        grouped["segment_type"] = "All"
        grouped["segment"] = "All"
        grouped["bucket_order"] = grouped["size_bucket"].map(BUCKET_ORDER).astype(int)
        pieces.append(grouped)

    if not pieces:
        return pd.DataFrame(columns=[
            "platform", "date", "segment_type", "segment", "size_bucket", "bucket_order",
            "trade_count", "contracts", "max_trade_size", "avg_trade_size",
        ])

    out = pd.concat(pieces, ignore_index=True)
    return out[[
        "platform", "date", "segment_type", "segment", "size_bucket", "bucket_order",
        "trade_count", "contracts", "max_trade_size", "avg_trade_size",
    ]]


def main() -> None:
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    kalshi = _existing_kalshi_rows()

    polymarket = _aggregate_one_platform(
        "Polymarket US",
        sorted(POLY_DIR.glob("*-time-and-sales.csv")),
        "-time-and-sales.csv",
        "Last Quantity",
    )
    forecastex = _aggregate_one_platform(
        "ForecastEx",
        sorted(FORECASTEX_DIR.glob("*-pairs.csv")),
        "-pairs.csv",
        "quantity",
    )

    combined = pd.concat([kalshi, polymarket, forecastex], ignore_index=True)
    combined["date"] = pd.to_datetime(combined["date"]).dt.date
    combined = combined.sort_values(["platform", "date", "segment_type", "segment", "bucket_order"])
    combined.to_csv(OUT_PATH, index=False)

    print(f"Wrote {len(combined):,} rows to {OUT_PATH}")
    print(combined.groupby("platform")["contracts"].sum().sort_values(ascending=False).to_string())


if __name__ == "__main__":
    main()
