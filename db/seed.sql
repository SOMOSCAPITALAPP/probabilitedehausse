begin;

insert into assets (
  code,
  name,
  asset_group_id,
  base_currency,
  quote_currency,
  country_code,
  metadata
)
values
  (
    'SPX',
    'S&P 500',
    (select id from asset_groups where code = 'equity_index'),
    'USD',
    'USD',
    'US',
    jsonb_build_object('region', 'United States', 'category', 'Large Cap Equity Index', 'benchmark', true)
  ),
  (
    'NDX',
    'Nasdaq 100',
    (select id from asset_groups where code = 'equity_index'),
    'USD',
    'USD',
    'US',
    jsonb_build_object('region', 'United States', 'category', 'Technology Equity Index', 'benchmark', true)
  ),
  (
    'SX5E',
    'Euro Stoxx 50',
    (select id from asset_groups where code = 'equity_index'),
    'EUR',
    'EUR',
    'EU',
    jsonb_build_object('region', 'Euro Area', 'category', 'Large Cap Equity Index', 'benchmark', true)
  ),
  (
    'US10Y',
    'US 10Y Treasury Yield',
    (select id from asset_groups where code = 'rates'),
    'USD',
    'USD',
    'US',
    jsonb_build_object('region', 'United States', 'category', 'Sovereign Rates', 'instrument_type', 'Yield')
  ),
  (
    'EURUSD',
    'EUR/USD',
    (select id from asset_groups where code = 'fx'),
    'EUR',
    'USD',
    null,
    jsonb_build_object('region', 'Global', 'category', 'Major FX Pair', 'instrument_type', 'Spot FX')
  ),
  (
    'XAUUSD',
    'Gold',
    (select id from asset_groups where code = 'commodity'),
    'XAU',
    'USD',
    null,
    jsonb_build_object('region', 'Global', 'category', 'Precious Metal', 'instrument_type', 'Spot Commodity')
  ),
  (
    'CL1',
    'WTI Crude Oil',
    (select id from asset_groups where code = 'commodity'),
    'USD',
    'USD',
    null,
    jsonb_build_object('region', 'Global', 'category', 'Energy', 'instrument_type', 'Front Contract Proxy')
  ),
  (
    'BTCUSD',
    'Bitcoin',
    (select id from asset_groups where code = 'crypto'),
    'BTC',
    'USD',
    null,
    jsonb_build_object('region', 'Global', 'category', 'Digital Asset', 'instrument_type', 'Spot Crypto')
  )
on conflict (code) do update
set
  name = excluded.name,
  asset_group_id = excluded.asset_group_id,
  base_currency = excluded.base_currency,
  quote_currency = excluded.quote_currency,
  country_code = excluded.country_code,
  metadata = excluded.metadata,
  updated_at = now();

insert into series_catalog (
  series_key,
  source_id,
  asset_id,
  name,
  category,
  frequency,
  unit,
  original_series_code,
  metadata
)
values
  ('SPX_CLOSE', (select id from data_sources where code = 'manual'), (select id from assets where code = 'SPX'), 'S&P 500 Close', 'market_price', 'daily', 'index_points', 'SPX_CLOSE', jsonb_build_object('field', 'close')),
  ('NDX_CLOSE', (select id from data_sources where code = 'manual'), (select id from assets where code = 'NDX'), 'Nasdaq 100 Close', 'market_price', 'daily', 'index_points', 'NDX_CLOSE', jsonb_build_object('field', 'close')),
  ('SX5E_CLOSE', (select id from data_sources where code = 'manual'), (select id from assets where code = 'SX5E'), 'Euro Stoxx 50 Close', 'market_price', 'daily', 'index_points', 'SX5E_CLOSE', jsonb_build_object('field', 'close')),
  ('US10Y_YIELD', (select id from data_sources where code = 'fred'), (select id from assets where code = 'US10Y'), 'US 10Y Treasury Yield', 'rates', 'daily', 'percent', 'DGS10', jsonb_build_object('field', 'yield')),
  ('EURUSD_CLOSE', (select id from data_sources where code = 'manual'), (select id from assets where code = 'EURUSD'), 'EUR/USD Close', 'fx', 'daily', 'fx_rate', 'EURUSD_CLOSE', jsonb_build_object('field', 'close')),
  ('XAUUSD_CLOSE', (select id from data_sources where code = 'manual'), (select id from assets where code = 'XAUUSD'), 'Gold Spot Close', 'commodity', 'daily', 'usd_per_ounce', 'XAUUSD_CLOSE', jsonb_build_object('field', 'close')),
  ('CL1_CLOSE', (select id from data_sources where code = 'manual'), (select id from assets where code = 'CL1'), 'WTI Crude Oil Front Contract Proxy Close', 'commodity', 'daily', 'usd_per_barrel', 'CL1_CLOSE', jsonb_build_object('field', 'close')),
  ('BTCUSD_CLOSE', (select id from data_sources where code = 'manual'), (select id from assets where code = 'BTCUSD'), 'Bitcoin Close', 'crypto', 'daily', 'usd', 'BTCUSD_CLOSE', jsonb_build_object('field', 'close'))
on conflict (series_key) do update
set
  source_id = excluded.source_id,
  asset_id = excluded.asset_id,
  name = excluded.name,
  category = excluded.category,
  frequency = excluded.frequency,
  unit = excluded.unit,
  original_series_code = excluded.original_series_code,
  metadata = excluded.metadata;

commit;
