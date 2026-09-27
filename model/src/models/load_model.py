"""
负荷预测模型 — 气候敏感性负荷模型

公式来源：
  公式(1-14) 用电需求气象条件指数: I_L = T - (V - 1.0) / 3.0
  公式(1-15) 气候影响的负荷需求模型:
    P_L = P_L0 × {
      e^(α_L × (I_L - 25.0))      当 I_L ≥ 25.0
      e^(α_L × |I_L - 16.5|)      当 8.0 < I_L < 25.0
      e^(α_L × (8.0 - I_L))       当 I_L ≤ 8.0
    }

符号含义 (参考国标):
  I_L  : 用电需求气象条件指数 (无量纲)
  T    : 日平均气温 (°C)
  V    : 日平均风速 (m/s)
  P_L  : 负荷需求 (与 P_L0 单位一致, 如 MW)
  P_L0 : 日基本负荷 (MW)
  α_L  : 气象指数敏感度系数 (分三段取值)

α_L 取值 (分档):
  I_L ≥ 25.0          → 0.1    (夏季高温, 负荷敏感)
  8.0 < I_L < 25.0    → 0.001  (温和天气, 几乎不敏感)
  I_L ≤ 8.0           → 0.05   (冬季低温, 负荷敏感但低于夏季)
"""

# ========== 气象指数敏感度系数 (分三段) ==========
ALPHA_HIGH = 0.1    # I_L ≥ 25.0 (夏季高负荷档)
ALPHA_MILD = 0.001  # 8.0 < I_L < 25.0 (温和档, 几乎无变化)
ALPHA_LOW = 0.05    # I_L ≤ 8.0 (冬季低温档)


def calc_weather_index(temp: float, wind_speed: float) -> float:
    """公式(1-14): 用电需求气象条件指数

    I_L = T - (V - 1.0) / 3.0

    temp      : 日平均气温 (°C)
    wind_speed: 日平均风速 (m/s)
    """
    return temp - (wind_speed - 1.0) / 3.0


def calc_load_factor(i_l: float) -> float:
    """负荷敏感度系数 α_L (分三段)

    I_L ≥ 25.0          → 0.1
    8.0 < I_L < 25.0    → 0.001
    I_L ≤ 8.0           → 0.05
    """
    if i_l >= 25.0:
        return ALPHA_HIGH
    if i_l > 8.0:
        return ALPHA_MILD
    return ALPHA_LOW


def calc_load_v2(
    p_l0: float,
    temp: float,
    wind_speed: float,
) -> float:
    """公式(1-15): 气候影响的负荷需求

    P_L = P_L0 × e^(α_L × g(I_L))

    其中 g(I_L) 分三段:
      I_L ≥ 25.0       → (I_L - 25.0)
      8.0 < I_L < 25.0 → |I_L - 16.5|
      I_L ≤ 8.0        → (8.0 - I_L)

    p_l0      : 日基本负荷 (MW)
    temp      : 日平均气温 (°C)
    wind_speed: 日平均风速 (m/s)
    """
    i_l = calc_weather_index(temp, wind_speed)

    if i_l >= 25.0:
        g_i = i_l - 25.0
    elif i_l > 8.0:
        g_i = abs(i_l - 16.5)
    else:
        g_i = 8.0 - i_l

    alpha = calc_load_factor(i_l)
    import math
    return p_l0 * math.exp(alpha * g_i)


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    import math

    # ===== 示例: 验证三个温度段 =====
    p_l0 = 5000.0  # 合肥日基本负荷假设 5000 MW

    print(f"日基本负荷 = {p_l0} MW")
    print("\n温度(°C) 风速(m/s) -> I_L指数 - 负荷敏感系数α - 负荷需求(MW)")
    for temp, wind in [(35, 2), (30, 3), (20, 2), (10, 3), (0, 2)]:
        i_l = calc_weather_index(temp, wind)
        alpha = calc_load_factor(i_l)
        p_l = calc_load_v2(p_l0, temp, wind)
        print(f"  {temp:>5.0f}    {wind:>5.0f}   ->  I_L={i_l:6.2f}   α={alpha:.3f}   P_L={p_l:8.1f}")
