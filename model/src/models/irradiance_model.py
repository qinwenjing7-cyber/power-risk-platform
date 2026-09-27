"""
辐照度估算模型（用于非合肥的15个城市）

背景：和风太阳辐射接口按次收费，只给合肥调用真实辐照；其他城市用本模型估算。
原理：
  ① 晴空辐照度 —— Haurwitz 模型（由太阳几何算出无云时的辐照）
  ② 云量衰减   —— Kasten-Czeplak 模型（云越多, 到达地面的辐照越少）

数据来源差异：
  · 未来时段（72h预报）：有 cloud 云量字段 → 直接用精确云量
  · 过去时段（历史接口）：无 cloud 字段 → 用天气现象(icon/text)映射云量档位

参考文献：
  Haurwitz, B. (1945). Insolation in relation to cloudiness and cloud density.
  Kasten, F. & Czeplak, G. (1980). Solar and terrestrial radiation dependent on
    the amount and type of cloud.
"""
import math
from datetime import datetime

# ========== 常量 ==========
SOLAR_CONSTANT_W = 1098.0   # Haurwitz 模型系数 (W/m²)
EAST_LONGITUDE_STD = 120.0  # 东八区标准经线

# 天气现象码 → 云量档位 (0~1)，用于历史数据兜底
# 和风 icon 编码规范: 1xx晴/多云, 3xx雨, 4xx雪, 5xx雾霾
ICON_CLOUD_MAP = [
    (100, 0.10),  # 晴
    (102, 0.25),  # 少云
    (103, 0.40),  # 晴间多云
    (101, 0.60),  # 多云
    (104, 0.90),  # 阴
    (150, 0.10),  # 晴(夜)
    (152, 0.25),  # 少云(夜)
    (153, 0.40),  # 晴间多云(夜)
    (151, 0.60),  # 多云(夜)
    (154, 0.90),  # 阴(夜)
]


def cloud_from_icon(icon_code) -> float:
    """由和风 icon 编码推算云量档位 (0~1)"""
    try:
        code = int(icon_code)
    except (TypeError, ValueError):
        return 0.5

    for c, v in ICON_CLOUD_MAP:
        if code == c:
            return v
    if 300 <= code < 400:      # 雨
        return 0.90
    if 400 <= code < 500:      # 雪
        return 0.90
    if 500 <= code < 600:      # 雾霾
        return 0.85
    return 0.5                 # 未知 → 中间值


def cloud_from_text(text: str) -> float:
    """由天气描述文字推算云量档位 (0~1), 作为 icon 不可用时的兜底"""
    if not text:
        return 0.5
    t = str(text)
    if '晴' in t and ('间' in t or '多云' in t):
        return 0.40
    if '晴' in t:
        return 0.10
    if '少云' in t:
        return 0.25
    if '多云' in t:
        return 0.60
    if '阴' in t:
        return 0.90
    if any(k in t for k in ('雨', '雪', '雾', '霾', '沙', '尘')):
        return 0.88
    return 0.5


def solar_elevation(lat: float, lon: float, dt: datetime) -> float:
    """计算太阳高度角 (度)

    lat/lon: 纬度/经度 (度)
    dt     : 北京时间 datetime
    """
    # 一年中的第几天
    n = dt.timetuple().tm_yday

    # 太阳赤纬 (度)
    decl = 23.45 * math.sin(math.radians(360.0 * (284 + n) / 365.0))

    # 真太阳时(小时) ≈ 地方时 + 经度修正  (忽略时差方程, 误差可接受)
    solar_time = dt.hour + dt.minute / 60.0 + (lon - EAST_LONGITUDE_STD) / 15.0

    # 时角 (度) : 正午为0, 每小时15度
    hour_angle = (solar_time - 12.0) * 15.0

    lat_r = math.radians(lat)
    decl_r = math.radians(decl)
    ha_r = math.radians(hour_angle)

    sin_h = (math.sin(lat_r) * math.sin(decl_r)
             + math.cos(lat_r) * math.cos(decl_r) * math.cos(ha_r))

    return math.degrees(math.asin(max(-1.0, min(1.0, sin_h))))


def clear_sky_ghi(elevation_deg: float) -> float:
    """晴空水平面辐照度 (W/m²) —— Haurwitz 模型

    GHI_clear = 1098 × cos(z) × exp(-0.059 / cos(z))
    其中 z 为天顶角 = 90° - 高度角
    """
    if elevation_deg <= 0:
        return 0.0
    cos_z = math.cos(math.radians(90.0 - elevation_deg))
    if cos_z <= 0.01:
        return 0.0
    return SOLAR_CONSTANT_W * cos_z * math.exp(-0.059 / cos_z)


def cloud_attenuation(cloud_frac: float) -> float:
    """云量衰减系数 (0~1) —— Kasten-Czeplak 模型

    GHI = GHI_clear × (1 - 0.75 × C^3.4)
    C 为云量比例 0~1
    """
    c = max(0.0, min(1.0, cloud_frac))
    return 1.0 - 0.75 * (c ** 3.4)


def estimate_ghi(lat: float, lon: float, dt: datetime, cloud_frac: float) -> float:
    """估算水平面总辐照度 (W/m²)

    lat/lon    : 城市经纬度
    dt         : 北京时间
    cloud_frac : 云量比例 0~1 (可由 cloud 字段/icon/text 得到)
    """
    elev = solar_elevation(lat, lon, dt)
    ghi_clear = clear_sky_ghi(elev)
    return ghi_clear * cloud_attenuation(cloud_frac)


if __name__ == '__main__':
    import sys
    sys.stdout.reconfigure(encoding='utf-8')

    # 合肥 2026-09-27 各时刻, 假设晴天(云量0.1)
    print('=== 合肥 2026-09-27 (晴天, 云量0.1) ===')
    for h in range(0, 24, 2):
        dt = datetime(2026, 9, 27, h, 0)
        elev = solar_elevation(31.82, 117.23, dt)
        ghi = estimate_ghi(31.82, 117.23, dt, 0.1)
        print(f'  {h:02d}:00  太阳高度角={elev:6.2f}°  GHI={ghi:7.1f} W/m²')

    print('\n=== 同日不同云量对比 (12:00) ===')
    dt = datetime(2026, 9, 27, 12, 0)
    for name, c in [('晴', 0.1), ('少云', 0.25), ('多云', 0.6), ('阴', 0.9), ('雨', 1.0)]:
        ghi = estimate_ghi(31.82, 117.23, dt, c)
        print(f'  {name}(云量{c:.2f})  GHI={ghi:7.1f} W/m²')
