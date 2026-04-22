begin;

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
  ('US_CPI_YOY', (select id from data_sources where code = 'fred'), null, 'US CPI YoY', 'macro_inflation', 'monthly', 'percent', 'CPIAUCSL', jsonb_build_object('region', 'US', 'transformation', 'year_over_year', 'theme', 'inflation')),
  ('US_CORE_CPI_YOY', (select id from data_sources where code = 'fred'), null, 'US Core CPI YoY', 'macro_inflation', 'monthly', 'percent', 'CPILFESL', jsonb_build_object('region', 'US', 'transformation', 'year_over_year', 'theme', 'core_inflation')),
  ('US_UNEMPLOYMENT', (select id from data_sources where code = 'fred'), null, 'US Unemployment Rate', 'macro_labor', 'monthly', 'percent', 'UNRATE', jsonb_build_object('region', 'US', 'theme', 'labor')),
  ('US_FEDFUNDS', (select id from data_sources where code = 'fred'), null, 'Effective Federal Funds Rate', 'macro_rates', 'monthly', 'percent', 'FEDFUNDS', jsonb_build_object('region', 'US', 'theme', 'policy_rate')),
  ('US_2Y_YIELD', (select id from data_sources where code = 'fred'), null, 'US 2Y Treasury Yield', 'macro_rates', 'daily', 'percent', 'DGS2', jsonb_build_object('region', 'US', 'theme', 'yield_curve')),
  ('US_10Y_YIELD_MACRO', (select id from data_sources where code = 'fred'), (select id from assets where code = 'US10Y'), 'US 10Y Treasury Yield', 'macro_rates', 'daily', 'percent', 'DGS10', jsonb_build_object('region', 'US', 'theme', 'yield_curve')),
  ('US_2S10S_SPREAD', (select id from data_sources where code = 'manual'), null, 'US 2s10s Curve Slope', 'macro_rates', 'daily', 'basis_points', 'US_2S10S_SPREAD', jsonb_build_object('region', 'US', 'theme', 'yield_curve', 'derived_from', jsonb_build_array('US_2Y_YIELD', 'US_10Y_YIELD_MACRO'))),
  ('US_REAL_RATE_PROXY', (select id from data_sources where code = 'manual'), null, 'US Real Rate Proxy', 'macro_rates', 'daily', 'percent', 'US_REAL_RATE_PROXY', jsonb_build_object('region', 'US', 'theme', 'real_rates', 'derived_from', jsonb_build_array('US_10Y_YIELD_MACRO', 'US_CPI_YOY'))),
  ('US_IG_OAS', (select id from data_sources where code = 'fred'), null, 'US Investment Grade OAS', 'macro_credit', 'daily', 'basis_points', 'BAMLC0A0CM', jsonb_build_object('region', 'US', 'theme', 'credit_spread')),
  ('US_HY_OAS', (select id from data_sources where code = 'fred'), null, 'US High Yield OAS', 'macro_credit', 'daily', 'basis_points', 'BAMLH0A0HYM2', jsonb_build_object('region', 'US', 'theme', 'credit_spread')),
  ('DXY_INDEX', (select id from data_sources where code = 'manual'), null, 'US Dollar Index', 'macro_fx', 'daily', 'index_points', 'DXY_INDEX', jsonb_build_object('region', 'Global', 'theme', 'usd')),
  ('VIX_INDEX', (select id from data_sources where code = 'manual'), null, 'VIX Index', 'macro_risk', 'daily', 'index_points', 'VIX_INDEX', jsonb_build_object('region', 'US', 'theme', 'volatility')),
  ('BRENT_WTI_SPREAD', (select id from data_sources where code = 'manual'), null, 'Brent-WTI Spread', 'macro_commodity', 'daily', 'usd_per_barrel', 'BRENT_WTI_SPREAD', jsonb_build_object('region', 'Global', 'theme', 'energy')),
  ('EU_HICP_YOY', (select id from data_sources where code = 'ecb'), null, 'Euro Area HICP YoY', 'macro_inflation', 'monthly', 'percent', 'ICP.M.U2.N.000000.4.ANR', jsonb_build_object('region', 'EA', 'theme', 'inflation')),
  ('ECB_DEPOSIT_RATE', (select id from data_sources where code = 'ecb'), null, 'ECB Deposit Facility Rate', 'macro_rates', 'daily', 'percent', 'ECBDFR', jsonb_build_object('region', 'EA', 'theme', 'policy_rate')),
  ('EA_UNEMPLOYMENT', (select id from data_sources where code = 'eurostat'), null, 'Euro Area Unemployment Rate', 'macro_labor', 'monthly', 'percent', 'TEILM020', jsonb_build_object('region', 'EA', 'theme', 'labor'))
on conflict (series_key) do update
set
  source_id = excluded.source_id,
  asset_id = excluded.asset_id,
  name = excluded.name,
  category = excluded.category,
  frequency = excluded.frequency,
  unit = excluded.unit,
  original_series_code = excluded.original_series_code,
  metadata = excluded.metadata,
  is_active = true;

commit;
