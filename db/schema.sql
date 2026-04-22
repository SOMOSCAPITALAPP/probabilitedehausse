begin;

create extension if not exists pgcrypto;

create table if not exists asset_groups (
  id bigserial primary key,
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists assets (
  id bigserial primary key,
  code text not null unique,
  name text not null,
  asset_group_id bigint not null references asset_groups(id),
  base_currency text,
  quote_currency text,
  country_code text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists data_sources (
  id bigserial primary key,
  code text not null unique,
  name text not null,
  source_type text not null,
  base_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists horizons (
  id bigserial primary key,
  code text not null unique,
  name text not null,
  days_forward integer not null,
  sort_order integer not null
);

create table if not exists series_catalog (
  id bigserial primary key,
  series_key text not null unique,
  source_id bigint not null references data_sources(id),
  asset_id bigint references assets(id),
  name text not null,
  category text not null,
  frequency text not null,
  unit text,
  original_series_code text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ingestion_runs (
  id bigserial primary key,
  source_id bigint not null references data_sources(id),
  status text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  rows_fetched integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists raw_series_values (
  id bigserial primary key,
  ingestion_run_id bigint not null references ingestion_runs(id) on delete cascade,
  series_id bigint not null references series_catalog(id),
  observation_date date not null,
  raw_value numeric,
  raw_text_value text,
  source_timestamp timestamptz,
  fetched_at timestamptz not null default now(),
  raw_payload jsonb,
  unique (series_id, observation_date, ingestion_run_id)
);

create table if not exists normalized_series_values (
  id bigserial primary key,
  series_id bigint not null references series_catalog(id),
  observation_date date not null,
  value numeric not null,
  frequency text not null,
  unit text,
  quality_flag text not null default 'ok',
  revision_tag text,
  normalized_at timestamptz not null default now(),
  unique (series_id, observation_date)
);

create table if not exists daily_asset_prices (
  id bigserial primary key,
  asset_id bigint not null references assets(id),
  price_date date not null,
  open numeric,
  high numeric,
  low numeric,
  close numeric not null,
  adjusted_close numeric,
  volume numeric,
  return_1d numeric,
  source_id bigint not null references data_sources(id),
  created_at timestamptz not null default now(),
  unique (asset_id, price_date)
);

create table if not exists feature_runs (
  id bigserial primary key,
  as_of_date date not null,
  status text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  feature_set_version text not null,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  unique (as_of_date, feature_set_version)
);

create table if not exists daily_feature_snapshot (
  id bigserial primary key,
  feature_run_id bigint not null references feature_runs(id) on delete cascade,
  asset_id bigint not null references assets(id),
  as_of_date date not null,
  mom_1w numeric,
  mom_1m numeric,
  mom_3m numeric,
  mom_6m numeric,
  mom_12m numeric,
  vol_1m numeric,
  vol_3m numeric,
  vol_6m numeric,
  drawdown_3m numeric,
  drawdown_6m numeric,
  drawdown_12m numeric,
  distance_ma_50d numeric,
  distance_ma_200d numeric,
  inflation_trend numeric,
  real_rate_level numeric,
  curve_2y10y numeric,
  credit_spread_level numeric,
  usd_trend numeric,
  gold_trend numeric,
  oil_trend numeric,
  equity_breadth numeric,
  cross_asset_dispersion numeric,
  regime_code text,
  regime_score numeric,
  feature_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (asset_id, as_of_date, feature_run_id)
);

create table if not exists training_labels (
  id bigserial primary key,
  asset_id bigint not null references assets(id),
  as_of_date date not null,
  horizon_id bigint not null references horizons(id),
  future_return numeric,
  upside_binary boolean,
  future_max_drawdown numeric,
  time_to_target_days integer,
  created_at timestamptz not null default now(),
  unique (asset_id, as_of_date, horizon_id)
);

create table if not exists model_registry (
  id bigserial primary key,
  model_key text not null unique,
  model_type text not null,
  target_type text not null,
  horizon_id bigint references horizons(id),
  algorithm text not null,
  version text not null,
  is_active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists model_runs (
  id bigserial primary key,
  model_id bigint not null references model_registry(id),
  run_type text not null,
  status text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  train_start_date date,
  train_end_date date,
  validation_start_date date,
  validation_end_date date,
  metrics jsonb not null default '{}'::jsonb,
  artifact_uri text,
  error_message text
);

create table if not exists daily_model_outputs (
  id bigserial primary key,
  model_run_id bigint not null references model_runs(id),
  model_id bigint not null references model_registry(id),
  asset_id bigint not null references assets(id),
  as_of_date date not null,
  horizon_id bigint not null references horizons(id),
  upside_probability numeric,
  expected_return numeric,
  bull_case_return numeric,
  bear_case_return numeric,
  expected_drawdown numeric,
  confidence_score numeric,
  path_cluster text,
  path_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (model_id, asset_id, as_of_date, horizon_id)
);

create table if not exists published_forecasts (
  id bigserial primary key,
  asset_id bigint not null references assets(id),
  as_of_date date not null,
  horizon_id bigint not null references horizons(id),
  upside_probability numeric not null,
  expected_return numeric,
  bull_case_return numeric,
  expected_drawdown numeric,
  confidence_score numeric,
  confidence_label text,
  path_label text,
  path_summary text,
  source_model_run_id bigint references model_runs(id),
  published_at timestamptz not null default now(),
  is_current boolean not null default true,
  unique (asset_id, as_of_date, horizon_id)
);

create table if not exists forecast_explanations (
  id bigserial primary key,
  published_forecast_id bigint not null references published_forecasts(id) on delete cascade,
  driver_rank integer not null,
  driver_name text not null,
  driver_effect text not null,
  driver_value numeric,
  commentary text,
  unique (published_forecast_id, driver_rank)
);

create table if not exists users (
  id bigserial primary key,
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists watchlists (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists watchlist_assets (
  id bigserial primary key,
  watchlist_id bigint not null references watchlists(id) on delete cascade,
  asset_id bigint not null references assets(id),
  created_at timestamptz not null default now(),
  unique (watchlist_id, asset_id)
);

create index if not exists idx_assets_group on assets(asset_group_id);
create index if not exists idx_series_catalog_source on series_catalog(source_id);
create index if not exists idx_series_catalog_asset on series_catalog(asset_id);
create index if not exists idx_ingestion_runs_source_started_at on ingestion_runs(source_id, started_at desc);
create index if not exists idx_raw_series_values_series_date on raw_series_values(series_id, observation_date desc);
create index if not exists idx_normalized_series_values_series_date on normalized_series_values(series_id, observation_date desc);
create index if not exists idx_daily_asset_prices_asset_date on daily_asset_prices(asset_id, price_date desc);
create index if not exists idx_feature_runs_date on feature_runs(as_of_date desc);
create index if not exists idx_daily_feature_snapshot_asset_date on daily_feature_snapshot(asset_id, as_of_date desc);
create index if not exists idx_training_labels_asset_date_horizon on training_labels(asset_id, as_of_date desc, horizon_id);
create index if not exists idx_model_registry_horizon on model_registry(horizon_id);
create index if not exists idx_model_runs_model_started_at on model_runs(model_id, started_at desc);
create index if not exists idx_daily_model_outputs_asset_date_horizon on daily_model_outputs(asset_id, as_of_date desc, horizon_id);
create index if not exists idx_published_forecasts_asset_date_horizon on published_forecasts(asset_id, as_of_date desc, horizon_id);
create index if not exists idx_published_forecasts_current on published_forecasts(asset_id, horizon_id, is_current);
create index if not exists idx_watchlists_user on watchlists(user_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_assets_updated_at on assets;
create trigger trg_assets_updated_at
before update on assets
for each row
execute function set_updated_at();

insert into asset_groups (code, name) values
  ('equity_index', 'Equity Index'),
  ('rates', 'Rates'),
  ('fx', 'Foreign Exchange'),
  ('commodity', 'Commodity'),
  ('crypto', 'Crypto'),
  ('etf', 'ETF')
on conflict (code) do nothing;

insert into horizons (code, name, days_forward, sort_order) values
  ('1W', '1 Week', 7, 1),
  ('1M', '1 Month', 30, 2),
  ('3M', '3 Months', 90, 3),
  ('6M', '6 Months', 180, 4),
  ('12M', '12 Months', 365, 5),
  ('3Y', '3 Years', 1095, 6),
  ('5Y', '5 Years', 1825, 7)
on conflict (code) do nothing;

insert into data_sources (code, name, source_type, base_url) values
  ('fred', 'FRED', 'api', 'https://fred.stlouisfed.org'),
  ('ecb', 'European Central Bank', 'api', 'https://data.ecb.europa.eu'),
  ('eurostat', 'Eurostat', 'api', 'https://ec.europa.eu/eurostat'),
  ('manual', 'Manual Upload', 'manual', null)
on conflict (code) do nothing;

commit;
