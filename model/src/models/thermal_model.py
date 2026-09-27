"""
火力发电模型 — 占位版本

⚠️ 说明: 暂时没有原始火电公式, 先用常用火电出力模型占位, 用于打通接入流程。
      后续拿到真实公式, 替换本文件即可 (局部替换, 不影响链路)。

火电特点: 可控电源, 不受天气驱动, 出力由调度决定。

V2 实时出力模型 (方案B: 24小时日曲线):
  火电实时出力 = 装机容量 × 可用率 × 出力系数(hour)
  出力系数按一天用电峰谷变化, 早/晚高峰高, 凌晨低。
"""

# ========== 火电参数 (可配置, 默认典型值) ==========
THERMAL_CAPACITY = 4000.0   # 火电装机容量 (MW) — 合肥示例值, 后续替换真实值
AVAILABILITY = 0.90         # 可用率 (考虑检修、非计划停运)

# 24小时出力系数 (方案B日曲线): 按一天用电峰谷
# 索引0=0点, 1=1点, ... 23=23点
# 深夜低、早高峰(8-11)、晚高峰(18-22)高
HOURLY_OUTPUT_RATIO = [
    0.55, 0.50, 0.48, 0.48, 0.50, 0.55,   # 0-5点 深夜低谷
    0.62, 0.72, 0.85, 0.88, 0.86, 0.80,   # 6-11点 早高峰
    0.75, 0.72, 0.70, 0.72, 0.78, 0.85,   # 12-17点 白天腰荷
    0.92, 0.95, 0.90, 0.85, 0.78, 0.65,   # 18-23点 晚高峰回落
]


def calc_thermal_available(capacity: float = THERMAL_CAPACITY,
                           availability: float = AVAILABILITY) -> float:
    """火电可用容量 (MW)

    P_avail = 装机容量 × 可用率
    """
    return capacity * availability


def calc_output_ratio(hour: int) -> float:
    """某小时的出力系数 (0~1, 方案B日曲线)

    hour: 0~23
    """
    hour = hour % 24
    return HOURLY_OUTPUT_RATIO[hour]


def calc_thermal_power_v2(hour: int, capacity: float = THERMAL_CAPACITY,
                          availability: float = AVAILABILITY) -> float:
    """火电实时出力 (MW) — 方案B

    P = 装机容量 × 可用率 × 出力系数(hour)
    火电按日曲线带基荷/腰荷, 不依赖负荷缺口。
    """
    p_avail = calc_thermal_available(capacity, availability)
    return p_avail * calc_output_ratio(hour)


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')

    print(f"火电装机容量: {THERMAL_CAPACITY} MW")
    print(f"可用容量: {calc_thermal_available():.0f} MW (可用率{AVAILABILITY*100:.0f}%)")

    print("\n== 24小时实时出力曲线 (方案B) ==")
    for h in range(24):
        p = calc_thermal_power_v2(h)
        print(f"  {h:02d}:00  系数={calc_output_ratio(h):.2f}  出力={p:6.1f} MW")
