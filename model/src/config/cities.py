"""
安徽省16市配置 — 经纬度、城市ID、装机/负荷估算

合肥用真实数据(用户提供), 其他市用体量系数 scale 估算(相对合肥)。
经纬度为地级市中心近似坐标(2位小数, 满足和风要求)。
"""

# ========== 合肥真实装机/负荷 (MW) ==========
BASE_PV = 4151.4
BASE_WIND = 3131.6
BASE_THERMAL = 4000.0
BASE_LOAD = 5000.0

# ========== 16市基础数据 (name, city_id, lat, lon, scale) ==========
CITIES = [
    {'name': '合肥市',   'city_id': '101220101', 'lat': 31.82, 'lon': 117.23, 'scale': 1.00},
    {'name': '芜湖市',   'city_id': '101220301', 'lat': 31.35, 'lon': 118.43, 'scale': 0.75},
    {'name': '马鞍山市', 'city_id': '101220501', 'lat': 31.67, 'lon': 118.51, 'scale': 0.60},
    {'name': '蚌埠市',   'city_id': '101220201', 'lat': 32.92, 'lon': 117.39, 'scale': 0.60},
    {'name': '阜阳市',   'city_id': '101220801', 'lat': 32.90, 'lon': 115.81, 'scale': 0.70},
    {'name': '安庆市',   'city_id': '101220601', 'lat': 30.53, 'lon': 117.06, 'scale': 0.60},
    {'name': '滁州市',   'city_id': '101221101', 'lat': 32.30, 'lon': 118.32, 'scale': 0.55},
    {'name': '宿州市',   'city_id': '101220701', 'lat': 33.65, 'lon': 116.98, 'scale': 0.50},
    {'name': '六安市',   'city_id': '101221501', 'lat': 31.75, 'lon': 116.50, 'scale': 0.50},
    {'name': '亳州市',   'city_id': '101220901', 'lat': 33.85, 'lon': 115.78, 'scale': 0.50},
    {'name': '淮南市',   'city_id': '101220401', 'lat': 32.63, 'lon': 117.00, 'scale': 0.50},
    {'name': '淮北市',   'city_id': '101221201', 'lat': 33.95, 'lon': 116.80, 'scale': 0.45},
    {'name': '宣城市',   'city_id': '101221401', 'lat': 30.94, 'lon': 118.76, 'scale': 0.40},
    {'name': '铜陵市',   'city_id': '101221301', 'lat': 30.93, 'lon': 117.81, 'scale': 0.35},
    {'name': '池州市',   'city_id': '101221701', 'lat': 30.66, 'lon': 117.49, 'scale': 0.30},
    {'name': '黄山市',   'city_id': '101221001', 'lat': 29.71, 'lon': 118.34, 'scale': 0.25},
]


def city_info(name='合肥市'):
    """返回某市配置(含按scale估算的装机/负荷)"""
    info = next((c for c in CITIES if c['name'] == name), CITIES[0])
    s = info['scale']
    return {
        'name': info['name'],
        'city_id': info['city_id'],
        'lat': info['lat'],
        'lon': info['lon'],
        'scale': s,
        'pv_capacity': round(BASE_PV * s, 1),
        'wind_capacity': round(BASE_WIND * s, 1),
        'thermal_capacity': round(BASE_THERMAL * s, 1),
        'p_l0': round(BASE_LOAD * s, 1),
    }


if __name__ == '__main__':
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    print(f"{'城市':<8} {'光伏':>8} {'风电':>8} {'火电':>8} {'负荷':>8}")
    print('-' * 46)
    for c in CITIES:
        i = city_info(c['name'])
        print(f"{i['name']:<8} {i['pv_capacity']:>8.0f} {i['wind_capacity']:>8.0f} "
              f"{i['thermal_capacity']:>8.0f} {i['p_l0']:>8.0f}")
