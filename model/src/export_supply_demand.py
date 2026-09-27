"""
导出安徽省16市供需数据 → 前端 public/data/supply-demand-all.json

【数据源】
  未来温度/风速/云量 → v7/weather/72h  (逐小时预报)
  过去温度/风速/图标 → v7/historical/weather (逐小时历史, 无cloud字段)
  辐照度:
    · 合肥市      → 和风太阳辐射 v1 接口 (真实预报, 按次收费)
    · 其他15市    → 云量估算模型 (免费, 见 models/irradiance_model.py)

【窗口】前3天 + 今天 + 后2天 = 6天
【锚定】运行时间 >= 23:00 时自动锚定次日
        (和风预报从"下一个整点"起, 故 23:30 运行可拿到次日完整24小时)

【合并模式】
  读入已有JSON → 新数据覆盖对应时段 → 拿不到的时段保留旧值
  · 当天已过时段(历史接口拒绝查当天) → 保留上次运行存下的数据
  · 下次运行时该天变旧, 会被真实历史刷新 (自愈)

用法: python src/export_supply_demand.py   (需 conda: cryptography)
"""
import os
import sys
import json
import gzip
import time
import urllib.request
from pathlib import Path
from datetime import datetime, timedelta

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / 'src'))


def find_data_dir() -> Path:
    """自动定位前端 public/data 目录 (本地/云端两种布局通用)

    优先级:
      1. 环境变量 SUPPLY_DATA_DIR (CI 可显式指定)
      2. 仓库布局: <repo>/model/src/xxx.py → <repo>/public/data
      3. 本地开发路径 (兜底)
    """
    env = os.environ.get('SUPPLY_DATA_DIR')
    if env:
        return Path(env)
    repo_candidate = Path(__file__).resolve().parent.parent.parent / 'public' / 'data'
    if repo_candidate.parent.is_dir():
        return repo_candidate
    return Path(r'C:\Users\21014\power-risk-platform\public\data')


FRONTEND_DATA_DIR = find_data_dir()
OUT_FILE = FRONTEND_DATA_DIR / 'supply-demand-all.json'

from models.pv_model import calc_pv_output
from models.wind_model import calc_wind_power
from models.thermal_model import calc_thermal_power_v2
from models.load_model import calc_load_v2
from models.supply_balance import calc_supply, calc_gap
from models.irradiance_model import estimate_ghi, cloud_from_icon
from config.cities import CITIES, city_info

# ========== 配置 ==========
API_HOST = os.environ.get('QWEATHER_API_HOST', 'https://nq2tuphf9j.re.qweatherapi.com')
PRIVATE_KEY_FILE = ROOT / 'config' / 'qweather_private.pem'   # 本地调试用
PRIVATE_KEY_ENV = 'QWEATHER_PRIVATE_KEY'                       # 云端CI用(私钥文本)
CREDENTIAL_ID = os.environ.get('QWEATHER_CREDENTIAL_ID', 'C8WJXTKWHU')
PROJECT_ID = os.environ.get('QWEATHER_PROJECT_ID', '3KTHBB4MAT')


def load_private_key_pem() -> bytes:
    """加载私钥: 优先环境变量(云端), 其次本地文件(调试)"""
    env_val = os.environ.get(PRIVATE_KEY_ENV)
    if env_val and env_val.strip():
        return env_val.strip().encode('utf-8')
    if PRIVATE_KEY_FILE.exists():
        return PRIVATE_KEY_FILE.read_bytes()
    raise FileNotFoundError(
        f'未找到私钥。请设置环境变量 {PRIVATE_KEY_ENV}, 或把私钥放到 {PRIVATE_KEY_FILE}'
    )

# 使用真实辐照度接口的城市 (其余用云量估算, 以节省费用)
REAL_IRRADIANCE_CITIES = {'合肥市'}

# 锚定偏移阈值: 运行时刻 >= 该小时 → 锚定次日
ANCHOR_SHIFT_HOUR = 23


def make_token():
    import base64
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
    from cryptography.hazmat.primitives import serialization
    private_key = serialization.load_pem_private_key(load_private_key_pem(), password=None)
    now = int(time.time())
    headers = {'alg': 'EdDSA', 'kid': CREDENTIAL_ID}
    payload = {'sub': PROJECT_ID, 'iat': now - 30, 'exp': now + 3600}

    def b64(d):
        return base64.urlsafe_b64encode(d).rstrip(b'=').decode()

    h = b64(json.dumps(headers, separators=(',', ':')).encode())
    p = b64(json.dumps(payload, separators=(',', ':')).encode())
    return f'{h}.{p}.{b64(private_key.sign(f"{h}.{p}".encode()))}'


def get_json(url, token, timeout=60):
    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Bearer {token}')
    req.add_header('Accept-Encoding', 'gzip')
    with urllib.request.urlopen(req, timeout=timeout) as r:
        d = r.read()
        if r.headers.get('Content-Encoding') == 'gzip':
            d = gzip.decompress(d)
        return json.loads(d)


def hour_label(iso):
    dt = datetime.fromisoformat(iso)
    return dt.strftime('%Y-%m-%d'), dt.hour


def get_anchor_date():
    """锚定日期: 23点后运行则锚定次日 (以拿到次日完整预报)"""
    now = datetime.now()
    if now.hour >= ANCHOR_SHIFT_HOUR:
        now = now + timedelta(days=1)
    return now.date()


# ========== 数据获取 ==========
def fetch_hourly_forecast(token, city_id):
    """72h逐小时预报 → {slot: {temp, wind(m/s), cloud(0~1)}}"""
    r = get_json(f'{API_HOST}/v7/weather/72h?location={city_id}', token)
    out = {}
    for h in r.get('hourly', []):
        date, hr = hour_label(h['fxTime'])
        out[f'{date} {hr:02d}'] = {
            'temp': float(h['temp']),
            'wind': float(h['windSpeed']) / 3.6,      # km/h → m/s
            'cloud': float(h.get('cloud', 50)) / 100.0,
        }
    return out


def fetch_history(token, city_id, date_str):
    """历史逐小时 → {hour: {temp, wind(m/s), cloud(0~1)}}
    注: 历史接口无 cloud 字段, 由 icon 天气现象码推算
    """
    r = get_json(f'{API_HOST}/v7/historical/weather?location={city_id}&date={date_str}', token)
    out = {}
    for h in r.get('weatherHourly', []):
        _, hr = hour_label(h['time'])
        out[hr] = {
            'temp': float(h['temp']),
            'wind': float(h['windSpeed']) / 3.6,
            'cloud': cloud_from_icon(h.get('icon')),
        }
    return out


def fetch_solar_forecast(token, lat, lon):
    """合肥专用: 太阳辐射预报 → {slot(北京时): ghi}"""
    try:
        r = get_json(f'{API_HOST}/solarradiation/v1/forecast/{lat}/{lon}', token, timeout=90)
    except Exception as e:
        print(f'    ⚠️ 太阳辐射接口失败: {e}')
        return {}
    out = {}
    for f in r.get('forecasts', []):
        d, hr = hour_label(f['forecastTime'].replace('Z', '+00:00'))
        dt = datetime.strptime(f'{d} {hr:02d}', '%Y-%m-%d %H') + timedelta(hours=8)
        out[dt.strftime('%Y-%m-%d %H')] = float(f['ghi']['value'])
    return out


# ========== 单小时供需记录 ==========
def build_hour_final(hour, temp, wind, ghi, cap, solar_src):
    """由温度/风速/辐照度算最终供需记录"""
    solar = calc_pv_output(cap['pv'], ghi, temp)
    wind_power = calc_wind_power(cap['wind'], wind)
    thermal = calc_thermal_power_v2(hour, capacity=cap['thermal'])
    load = calc_load_v2(cap['load'], temp, wind)
    supply = calc_supply(solar, wind_power, thermal)
    gap = calc_gap(supply, load)
    return {
        'hour': hour,
        'solar': round(solar, 1),
        'wind': round(wind_power, 1),
        'thermal': round(thermal, 1),
        'load': round(load, 1),
        'supply': round(supply, 1),
        'gap': round(gap, 1),
        'source': 'real',
        'solarSource': solar_src,     # 'api' 真实 / 'estimated' 估算
    }


def make_placeholder(hour):
    return {'hour': hour, 'solar': 0, 'wind': 0, 'thermal': 0,
            'load': 0, 'supply': 0, 'gap': 0, 'source': 'placeholder',
            'solarSource': None}


# ========== 构建某市新数据 ==========
def build_city_days(token, city, anchor):
    """生成窗口内 6 天的新数据 (仅含本次能拿到的时段, 拿不到的返回 None)"""
    name = city['name']
    lat, lon = city['lat'], city['lon']
    use_real_irr = name in REAL_IRRADIANCE_CITIES

    forecast = fetch_hourly_forecast(token, city['city_id'])
    solar = fetch_solar_forecast(token, lat, lon) if use_real_irr else {}

    # 历史: 前3天逐天取
    history = {}
    for d in range(1, 4):
        past_date = anchor - timedelta(days=d)
        try:
            history[past_date.strftime('%Y-%m-%d')] = fetch_history(
                token, city['city_id'], past_date.strftime('%Y%m%d'))
        except Exception as e:
            print(f'    ⚠️ 历史({past_date})失败: {e}')

    days = []
    for offset in range(-3, 3):          # 前3天, 今天, 后2天
        day = anchor + timedelta(days=offset)
        date_str = day.strftime('%Y-%m-%d')
        hours = []

        for hr in range(24):
            dt = datetime(day.year, day.month, day.day, hr)
            rec = None

            if offset < 0:
                # 过去天: 用历史实测
                hist = history.get(date_str, {})
                if hr in hist:
                    h = hist[hr]
                    ghi = estimate_ghi(lat, lon, dt, h['cloud'])
                    rec = build_hour_final(hr, h['temp'], h['wind'], ghi, city, 'estimated')
            else:
                # 今天及未来: 用预报
                slot = f'{date_str} {hr:02d}'
                if slot in forecast:
                    f = forecast[slot]
                    if slot in solar:
                        ghi, src = solar[slot], 'api'
                    else:
                        ghi, src = estimate_ghi(lat, lon, dt, f['cloud']), 'estimated'
                    rec = build_hour_final(hr, f['temp'], f['wind'], ghi, city, src)

            hours.append(rec)

        days.append({'date': date_str, 'hours': hours})

    return days


# ========== 合并新旧数据 ==========
def merge_days(new_days, old_days, anchor):
    """新数据优先; 新数据拿不到的时段, 保留旧数据"""
    old_map = {}
    for d in (old_days or []):
        old_map[d['date']] = {
            h['hour']: h for h in d.get('hours', [])
            if h.get('source') != 'placeholder'
        }

    anchor_str = str(anchor)
    merged = []
    for d in new_days:
        date_str = d['date']
        old_hours = old_map.get(date_str, {})
        hours = []
        for hr in range(24):
            new_rec = d['hours'][hr]
            if new_rec is not None:
                hours.append(new_rec)
            elif hr in old_hours:
                kept = dict(old_hours[hr])
                kept['source'] = 'carried'      # 标记: 沿用上次运行的数据
                hours.append(kept)
            else:
                hours.append(make_placeholder(hr))

        day_src = 'past' if date_str < anchor_str else 'real'
        merged.append({'date': date_str, 'source': day_src, 'hours': hours})
    return merged


# ========== 主流程 ==========
def main():
    anchor = get_anchor_date()
    token = make_token()

    now = datetime.now()
    print(f'运行时刻: {now.strftime("%Y-%m-%d %H:%M")}')
    print(f'锚定日期: {anchor}   (窗口 {anchor - timedelta(days=3)} ~ {anchor + timedelta(days=2)})')
    print(f'真实辐照城市: {", ".join(REAL_IRRADIANCE_CITIES)}\n')

    # 读已有数据 (供合并)
    old_cities = {}
    if OUT_FILE.exists():
        try:
            old = json.loads(OUT_FILE.read_text(encoding='utf-8'))
            old_cities = {c['city']: c for c in old.get('cities', [])}
            print(f'已读入旧数据: {len(old_cities)} 市 (将用于合并)\n')
        except Exception as e:
            print(f'⚠️ 旧数据读取失败, 将全量重建: {e}\n')

    result_cities = []
    for i, c in enumerate(CITIES):
        name = c['name']
        print(f'[{i+1}/{len(CITIES)}] {name} ...', end=' ', flush=True)
        try:
            info = city_info(name)
            cap = {
                'pv': info['pv_capacity'], 'wind': info['wind_capacity'],
                'thermal': info['thermal_capacity'], 'load': info['p_l0'],
            }
            city_ctx = {**info, **cap, 'name': name}

            new_days = build_city_days(token, city_ctx, anchor)
            old_days = old_cities.get(name, {}).get('days')
            days = merge_days(new_days, old_days, anchor)

            real_h = sum(1 for d in days for h in d['hours'] if h.get('source') == 'real')
            carr_h = sum(1 for d in days for h in d['hours'] if h.get('source') == 'carried')
            print(f'✅ (实时{real_h}h / 沿用{carr_h}h)')

            result_cities.append({
                'city': name,
                'irradianceSource': 'api' if name in REAL_IRRADIANCE_CITIES else 'estimated',
                'capacity': {
                    'pv': info['pv_capacity'],
                    'wind': info['wind_capacity'],
                    'thermal': info['thermal_capacity'],
                },
                'days': days,
            })
        except Exception as e:
            print(f'❌ {e}')
            if name in old_cities:
                result_cities.append(old_cities[name])
                print(f'    ↳ 已沿用旧数据')

    out = {
        'generatedAt': now.strftime('%Y-%m-%dT%H:%M:%S'),
        'anchorDate': str(anchor),
        'cities': result_cities,
    }
    FRONTEND_DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'\n✅ 已写入 {OUT_FILE}')
    print(f'   城市数: {len(result_cities)}')


if __name__ == '__main__':
    main()


# ============================================================================
# ===== 旧版本代码 (V1, 保留备查) ==============================================
# ============================================================================
# 说明: 以下是改造前的实现, 保留供对照/回退。
#       主要差异:
#         1. 无合并模式 (每次全量覆盖)
#         2. 无锚定偏移 (直接以当天为锚)
#         3. 辐照度: 方案C停用状态(恒为0), 无云量估算
#
# import sys
# import json
# import gzip
# import time
# import urllib.request
# from pathlib import Path
# from datetime import datetime, timedelta
#
# sys.stdout.reconfigure(encoding='utf-8')
#
# ROOT = Path(__file__).parent.parent
# sys.path.insert(0, str(ROOT / 'src'))
# FRONTEND_DATA_DIR = Path(r'C:\Users\21014\power-risk-platform\public\data')
#
# from models.pv_model import calc_pv_output
# from models.wind_model import calc_wind_power
# from models.thermal_model import calc_thermal_power_v2
# from models.load_model import calc_load_v2
# from models.supply_balance import calc_supply, calc_gap
# from config.cities import CITIES, city_info
#
# # ========== 和风认证 ==========
# API_HOST = 'https://nq2tuphf9j.re.qweatherapi.com'
# PRIVATE_KEY_FILE = ROOT / 'config' / 'qweather_private.pem'
# CREDENTIAL_ID = 'C8WJXTKWHU'
# PROJECT_ID = '3KTHBB4MAT'
#
#
# def make_token():
#     import base64
#     from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
#     from cryptography.hazmat.primitives import serialization
#     private_key = serialization.load_pem_private_key(PRIVATE_KEY_FILE.read_bytes(), password=None)
#     now = int(time.time())
#     headers = {'alg': 'EdDSA', 'kid': CREDENTIAL_ID}
#     payload = {'sub': PROJECT_ID, 'iat': now - 30, 'exp': now + 3600}
#     def b64(d): return base64.urlsafe_b64encode(d).rstrip(b'=').decode()
#     si = f'{b64(json.dumps(headers,separators=(",",":")).encode())}.{b64(json.dumps(payload,separators=(",",":")).encode())}'.encode()
#     return f'{si.decode()}.{b64(private_key.sign(si))}'
#
#
# def get_json(url, token, timeout=60):
#     req = urllib.request.Request(url)
#     req.add_header('Authorization', f'Bearer {token}')
#     req.add_header('Accept-Encoding', 'gzip')
#     with urllib.request.urlopen(req, timeout=timeout) as r:
#         d = r.read()
#         if r.headers.get('Content-Encoding') == 'gzip':
#             d = gzip.decompress(d)
#         return json.loads(d)
#
#
# def hour_label(iso):
#     dt = datetime.fromisoformat(iso)
#     return dt.strftime('%Y-%m-%d'), dt.hour
#
#
# # ========== 各接口 (按城市参数化) ==========
# def fetch_hourly_forecast(token, city_id):
#     r = get_json(f'{API_HOST}/v7/weather/72h?location={city_id}', token)
#     out = {}
#     for h in r.get('hourly', []):
#         date, hr = hour_label(h['fxTime'])
#         # 和风 windSpeed 单位是 km/h, 需 ÷3.6 转成 m/s (模型期望 m/s)
#         wind_ms = float(h['windSpeed']) / 3.6
#         out[f'{date} {hr:02d}'] = (float(h['temp']), wind_ms)
#     return out
#
#
# def fetch_solar_forecast(token, lat, lon):
#     """太阳辐射 — 【方案C：已停用】
#
#     为节省和风太阳辐射接口费用(每次约0.3元), 停止真实调用。
#     返回空 dict → 未来天 ghi 恒为0 → 光伏出力为0 (前端标注"辐照数据暂未接入")。
#     如需恢复真实辐照, 取消下面注释并删掉 return {} 即可。
#     """
#     return {}
#     # 恢复真实辐照时启用以下代码:
#     # r = get_json(f'{API_HOST}/solarradiation/v1/forecast/{lat}/{lon}', token)
#     # out = {}
#     # for f in r.get('forecasts', []):
#     #     date, hr = hour_label(f['forecastTime'].replace('Z', '+00:00'))
#     #     out[f'{date} {hr:02d}'] = float(f['ghi']['value'])
#     # return out
#
#
# def fetch_history(token, city_id, date_str):
#     r = get_json(f'{API_HOST}/v7/historical/weather?location={city_id}&date={date_str}', token)
#     out = {}
#     for h in r.get('weatherHourly', []):
#         _, hr = hour_label(h['time'])
#         # 和风 windSpeed 单位 km/h → m/s
#         wind_ms = float(h['windSpeed']) / 3.6
#         out[hr] = (float(h['temp']), wind_ms)
#     return out
#
#
# # ========== 计算某小时供需 (按城市容量) ==========
# def calc_hour_supply(hour, temp, wind, ghi, cap):
#     solar = calc_pv_output(cap['pv'], ghi, temp)
#     wind_power = calc_wind_power(cap['wind'], wind)
#     thermal = calc_thermal_power_v2(hour, capacity=cap['thermal'])
#     load = calc_load_v2(cap['load'], temp, wind)
#     supply = calc_supply(solar, wind_power, thermal)
#     gap = calc_gap(supply, load)
#     return {
#         "hour": hour,
#         "solar": round(solar, 1),
#         "wind": round(wind_power, 1),
#         "thermal": round(thermal, 1),
#         "load": round(load, 1),
#         "supply": round(supply, 1),
#         "gap": round(gap, 1),
#     }
#
#
# def build_future_days(token, city):
#     """今天+后2天: 72h预报温度风速 + 太阳辐射GHI"""
#     hf = fetch_hourly_forecast(token, city['city_id'])
#     solar = fetch_solar_forecast(token, city['lat'], city['lon'])
#
#     # UTC太阳辐射转北京时
#     solar_beijing = {}
#     for k, v in solar.items():
#         dt = datetime.strptime(k, '%Y-%m-%d %H') + timedelta(hours=8)
#         solar_beijing[dt.strftime('%Y-%m-%d %H')] = v
#
#     day_map = {}
#     for slot, (temp, wind) in hf.items():
#         date, hr = slot.split()
#         ghi = solar_beijing.get(slot, 0.0)
#         rec = calc_hour_supply(int(hr), temp, wind, ghi, city)
#         rec['source'] = 'real'
#         day_map.setdefault(date, [None] * 24)
#         day_map[date][int(hr)] = rec
#
#     result = []
#     for d, hours_list in day_map.items():
#         full = []
#         for hr in range(24):
#             r = hours_list[hr]
#             if r is not None:
#                 full.append(r)
#             else:
#                 full.append({"hour": hr, "solar": 0, "wind": 0, "thermal": 0,
#                              "load": 0, "supply": 0, "gap": 0, "source": "placeholder"})
#         result.append({"date": d, "source": "real", "hours": full})
#     return result
#
#
# def build_past_days(token, city, n_days=3):
#     """过去3天: 历史温度风速(真实) + 辐照填0占位"""
#     days = []
#     for d in range(1, n_days + 1):
#         past_date = datetime.now() - timedelta(days=d)
#         hist = fetch_history(token, city['city_id'], past_date.strftime('%Y%m%d'))
#         if not hist:
#             continue
#         hours = []
#         for hr in range(24):
#             if hr in hist:
#                 temp, wind = hist[hr]
#                 rec = calc_hour_supply(hr, temp, wind, 0.0, city)
#                 rec["source"] = "placeholder"
#             else:
#                 rec = {"hour": hr, "solar": 0, "wind": 0,
#                        "thermal": round(calc_thermal_power_v2(hr, capacity=city['thermal']), 1),
#                        "load": 0, "supply": 0, "gap": 0, "source": "placeholder"}
#             hours.append(rec)
#         days.append({"date": past_date.strftime('%Y-%m-%d'), "source": "past", "hours": hours})
#     return days
#
#
# def build_city_data(token, name):
#     """生成某市的完整供需数据"""
#     info = city_info(name)
#     cap = {
#         'pv': info['pv_capacity'],
#         'wind': info['wind_capacity'],
#         'thermal': info['thermal_capacity'],
#         'load': info['p_l0'],
#     }
#     city = {**info, **cap}  # 含 name/city_id/lat/lon/pv/wind/thermal/load
#
#     today_str = datetime.now().strftime('%Y-%m-%d')
#     future = [d for d in build_future_days(token, city) if d['date'] >= today_str][:3]
#     past = build_past_days(token, city)
#
#     return {
#         "city": name,
#         "capacity": {"pv": info['pv_capacity'], "wind": info['wind_capacity'], "thermal": info['thermal_capacity']},
#         "days": sorted(past + future, key=lambda d: d['date']),
#     }
#
#
# def main():
#     token = make_token()
#     print(f"正在生成安徽省 {len(CITIES)} 市供需数据...\n")
#
#     all_cities = []
#     for i, c in enumerate(CITIES):
#         name = c['name']
#         print(f"[{i+1}/{len(CITIES)}] {name} ...", end=' ', flush=True)
#         try:
#             data = build_city_data(token, name)
#             all_cities.append(data)
#             print(f"✅ ({len(data['days'])}天)")
#         except Exception as e:
#             print(f"❌ {e}")
#
#     result = {
#         "generatedAt": datetime.now().strftime('%Y-%m-%dT%H:%M:%S'),
#         "cities": all_cities,
#     }
#
#     FRONTEND_DATA_DIR.mkdir(parents=True, exist_ok=True)
#     out = FRONTEND_DATA_DIR / 'supply-demand-all.json'
#     out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
#     print(f"\n✅ 已写入 {out}")
#     print(f"   城市数: {len(all_cities)}")
#
#
# if __name__ == '__main__':
#     main()
