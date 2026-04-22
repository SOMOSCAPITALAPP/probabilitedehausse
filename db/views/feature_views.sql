begin;

create or replace view v_curve_2s10s_us as
select
  y10.observation_date,
  ((y10.value - y2.value) * 100.0) as curve_2s10s_bp
from normalized_series_values y10
join series_catalog s10
  on s10.id = y10.series_id
join normalized_series_values y2
  on y2.observation_date = y10.observation_date
join series_catalog s2
  on s2.id = y2.series_id
where s10.series_key = 'US_10Y_YIELD_MACRO'
  and s2.series_key = 'US_2Y_YIELD';

create or replace view v_us_real_rate_proxy as
select
  y10.observation_date,
  (y10.value - cpi.value) as real_rate_proxy
from normalized_series_values y10
join series_catalog s10
  on s10.id = y10.series_id
join lateral (
  select nsv.observation_date, nsv.value
  from normalized_series_values nsv
  join series_catalog sc
    on sc.id = nsv.series_id
  where sc.series_key = 'US_CPI_YOY'
    and nsv.observation_date <= y10.observation_date
  order by nsv.observation_date desc
  limit 1
) cpi on true
where s10.series_key = 'US_10Y_YIELD_MACRO';

create or replace view v_credit_stress_us as
select
  hy.observation_date,
  hy.value as hy_oas,
  ig.value as ig_oas,
  (hy.value - ig.value) as hy_ig_gap
from normalized_series_values hy
join series_catalog shy
  on shy.id = hy.series_id
join normalized_series_values ig
  on ig.observation_date = hy.observation_date
join series_catalog sig
  on sig.id = ig.series_id
where shy.series_key = 'US_HY_OAS'
  and sig.series_key = 'US_IG_OAS';

create or replace view v_usd_trend_1m as
with dxy as (
  select
    observation_date,
    value,
    lag(value, 21) over (order by observation_date) as lag_21
  from normalized_series_values nsv
  join series_catalog sc
    on sc.id = nsv.series_id
  where sc.series_key = 'DXY_INDEX'
)
select
  observation_date,
  case
    when lag_21 is null or lag_21 = 0 then null
    else ((value / lag_21) - 1.0) * 100.0
  end as usd_trend_1m_pct
from dxy;

create or replace view v_vix_level as
select
  nsv.observation_date,
  nsv.value as vix_level
from normalized_series_values nsv
join series_catalog sc
  on sc.id = nsv.series_id
where sc.series_key = 'VIX_INDEX';

create or replace view v_macro_feature_snapshot as
select
  d.observation_date,
  c.curve_2s10s_bp,
  r.real_rate_proxy,
  cs.hy_oas,
  cs.ig_oas,
  cs.hy_ig_gap,
  u.usd_trend_1m_pct,
  v.vix_level
from (
  select distinct observation_date
  from normalized_series_values
) d
left join v_curve_2s10s_us c
  on c.observation_date = d.observation_date
left join v_us_real_rate_proxy r
  on r.observation_date = d.observation_date
left join v_credit_stress_us cs
  on cs.observation_date = d.observation_date
left join v_usd_trend_1m u
  on u.observation_date = d.observation_date
left join v_vix_level v
  on v.observation_date = d.observation_date;

commit;
