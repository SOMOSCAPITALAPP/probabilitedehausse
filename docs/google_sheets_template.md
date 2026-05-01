# Northcurve Google Sheets Template

Voici la structure exacte du fichier Google Sheets `Northcurve Data`.

## Onglet `assets`

Colonnes exactes :

```text
asset_code,asset_name,asset_class,source_symbol,source_name,target_sheet,unit,is_active
```

Exemples :

```text
SPX,S&P 500,equity_index,^GSPC,yahoo,daily_prices,index_points,TRUE
NDX,Nasdaq 100,equity_index,^NDX,yahoo,daily_prices,index_points,TRUE
SX5E,Euro Stoxx 50,equity_index,^STOXX50E,yahoo,daily_prices,index_points,TRUE
XAUUSD,Gold,commodity,GC=F,yahoo,daily_prices,usd_per_ounce,TRUE
CL1,WTI Crude Oil,commodity,CL=F,yahoo,daily_prices,usd_per_barrel,TRUE
EURUSD,EUR/USD,fx,EURUSD=X,yahoo,daily_prices,fx_rate,TRUE
BTCUSD,Bitcoin,crypto,BTC-USD,yahoo,daily_prices,usd,TRUE
US10Y,US 10Y Treasury Yield,rates,^TNX,yahoo,macro_daily,percent,TRUE
VIX,VIX Index,volatility,^VIX,yahoo,macro_daily,index_points,TRUE
```

## Onglet `daily_prices`

Colonnes exactes :

```text
date,asset_code,asset_name,open,high,low,close,adj_close,volume,unit,source,fetched_at
```

Exemple :

```text
2026-05-01,SPX,S&P 500,7088.12,7128.44,7069.55,7119.30,7119.30,2450000000,index_points,yahoo,2026-05-01T00:10:00+02:00
```

## Onglet `macro_daily`

Colonnes exactes :

```text
date,series_code,series_name,value,unit,source,fetched_at
```

Exemple :

```text
2026-05-01,US10Y,US 10Y Treasury Yield,4.31,percent,yahoo,2026-05-01T00:10:00+02:00
2026-05-01,VIX,VIX Index,18.42,index_points,yahoo,2026-05-01T00:10:00+02:00
```

## Onglet `forecasts`

Colonnes exactes :

```text
run_date,asset_code,asset_name,horizon,horizon_days,trailing_return,historical_mean,historical_vol,z_score,expected_return,upside_probability,expected_drawdown,confidence_label,path_label,sample_size,neighbor_count,model_version,computed_at
```

Exemple :

```text
2026-05-01,SPX,S&P 500,21D,21,0.098000,0.008700,0.041200,2.168000,-0.006400,0.214000,-0.028100,medium,range_then_rise,2495,60,gaussian_regression_v2,2026-05-01T00:15:00+02:00
```

## Règles simples

- `assets` est le référentiel central.
- `daily_prices` conserve l'historique complet des actifs de marché.
- `macro_daily` conserve l'historique complet des taux, indices de volatilité et séries assimilées.
- `forecasts` reçoit les sorties calculées par Python.
- La clé logique est :
  - `date + asset_code` dans `daily_prices`
  - `date + series_code` dans `macro_daily`

## Recommandation MVP

Pour démarrer proprement :

- remplis `assets`
- laisse Python créer et maintenir `daily_prices`
- laisse Python créer et maintenir `macro_daily`
- écris les prévisions plus tard dans `forecasts`

## Pré-requis Google

- crée un fichier Google Sheets nommé `Northcurve Data`
- ajoute les 4 onglets :
  - `assets`
  - `daily_prices`
  - `macro_daily`
  - `forecasts`
- partage ce Google Sheet avec l'email du service account Google utilisé par le script Python
