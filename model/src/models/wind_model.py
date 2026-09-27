"""
风电出力模型 — 公式代码化

公式来源：
  公式(1-21)  风速影响系数:   η_F = ((V - V_cut_in) / (V_r - V_cut_in))³
  总影响指标:   I_W 由四段分段函数决定 (见 calc_wind_impact_index)

典型风机参数(可配置):
  V_cut_in  = 3 m/s   切入风速
  V_r       = 13 m/s  额定风速
  V_cut_out = 25 m/s  切出风速
"""

# ========== 典型风机参数常量 ==========
V_CUT_IN = 3.0    # 切入风速 m/s (风机开始发电)
V_RATED = 13.0    # 额定风速 m/s (达到额定功率)
V_CUT_OUT = 25.0  # 切出风速 m/s (超过则停机保护)


def calc_wind_coefficient(
    wind_speed: float,
    v_cut_in: float = V_CUT_IN,
    v_rated: float = V_RATED,
) -> float:
    """公式(1-21): 风速影响系数 η_F

    η_F = ((V - V_cut_in) / (V_r - V_cut_in))³
    仅适用于 V_cut_in < V ≤ V_r 区间 (切入到额定之间)

    wind_speed: 实际风速 m/s
    """
    return ((wind_speed - v_cut_in) / (v_rated - v_cut_in)) ** 3


def calc_wind_power(
    p_wt: float,
    wind_speed: float,
    v_cut_in: float = V_CUT_IN,
    v_rated: float = V_RATED,
    v_cut_out: float = V_CUT_OUT,
) -> float:
    """实际风电输出功率 P_W(v) (单位与 p_wt 一致, 通常为 MW)

    四段分段函数 (立方差公式):
      v ≤ V_cut_in                      → 0
      V_cut_in < v ≤ V_r                → P_WT · (v³ - V_cut_in³)/(V_r³ - V_cut_in³)
      V_r < v ≤ V_cut_out               → P_WT (满发)
      v > V_cut_out                     → 0 (停机保护)

    p_wt     : 风机额定功率 (MW)
    wind_speed: 实际风速 m/s
    """
    if wind_speed <= v_cut_in or wind_speed > v_cut_out:
        return 0.0
    if wind_speed >= v_rated:
        return p_wt
    return p_wt * (wind_speed ** 3 - v_cut_in ** 3) / (v_rated ** 3 - v_cut_in ** 3)


def calc_wind_power_factor(
    wind_speed: float,
    v_cut_in: float = V_CUT_IN,
    v_rated: float = V_RATED,
    v_cut_out: float = V_CUT_OUT,
) -> float:
    """风机出力比例系数 (0~1)

    四段分段函数:
      V ≤ V_cut_in           → 0
      V_cut_in < V ≤ V_r     → ((V - V_cut_in)/(V_r - V_cut_in))³
      V_r < V ≤ V_cut_out    → 1 (满发)
      V > V_cut_out          → 0 (停机保护)
    """
    if wind_speed <= v_cut_in or wind_speed > v_cut_out:
        return 0.0
    if wind_speed > v_rated:
        return 1.0
    return calc_wind_coefficient(wind_speed, v_cut_in, v_rated)


def calc_wind_impact_index(
    p_w_n: float,
    wind_speed: float,
    v_cut_in: float = V_CUT_IN,
    v_rated: float = V_RATED,
    v_cut_out: float = V_CUT_OUT,
) -> float:
    """风速对风电出力的总影响指标 I_W

    I_W = P_W^N × 出力比例系数

    p_w_n     : 该市风电装机容量的标么值(归一化值)
    wind_speed: 实际风速 m/s
    """
    factor = calc_wind_power_factor(wind_speed, v_cut_in, v_rated, v_cut_out)
    return p_w_n * factor


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')

    # ===== 示例: 验证四段曲线 =====
    p_w_n = 1.0   # 标么值假设为 1.0
    p_wt = 2.0    # 单台风机额定功率假设 2 MW

    print("风速(m/s) -> 出力比例 -> 实际出力(MW) -> 影响指标")
    for v in [2.0, 3.0, 5.0, 8.0, 12.0, 13.0, 15.0, 25.0, 26.0]:
        factor = calc_wind_power_factor(v)
        p_w = calc_wind_power(p_wt, v)
        i_w = calc_wind_impact_index(p_w_n, v)
        print(f"  {v:>5.1f}  ->  {factor:>6.3f}    ->  {p_w:>8.3f}    ->  {i_w:.4f}")

    # 验证结果说明
    print("\n期望: 2m/s=0(低于切入), 3m/s=0(切入), 13m/s=满发, 25m/s=满发, 26m/s=0(停机)")
