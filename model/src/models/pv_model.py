"""
光伏出力模型 — 公式代码化

公式来源：
  公式(1)  阴雨天气影响系数:   η_y = D_y / 365
  公式(2)  光伏实际出力:       P_v = P_STC · η_PV · (G_c / G_STC) · [1 + (T - T_STC)]
  公式(1-19) 高温影响系数:     η_T = Σ_{T=25}^{Tmax} δ_T · (D_T / 365)
  公式(1-20) 综合影响指标:     I_PV = P_PV^N · (η_y + η_T)

"""

# ========== 标准测试条件(STC)常量 ==========
G_STC = 1000.0   # 额定辐照度 W/m²
T_STC = 25.0     # 标准测试温度 °C
BETA_T = -0.004  # 光伏温度系数 (/°C), 温度每升高1°C效率下降约0.4%

# ========== 系统级参数 (V2新增, 可配置) ==========
NOCT = 45.0      # 组件额定工作温度 NOCT (°C), 行业典型值
LOSS_PCT = 14.0  # 系统损耗百分比 (%, PVGIS默认14), 含逆变器/线损/灰尘等


def calc_yin_yu_coefficient(d_y: float) -> float:
    """公式(1): 阴雨天气对光伏出力的影响系数

    η_y = D_y / 365
    d_y: 该市一年内发生阴雨天气的天数
    """
    return d_y / 365


def calc_eta_pv(temp: float) -> float:
    """光伏组件效率 η_PV (随温度变化, 基准效率为1)

    η_PV(T) = 1                     (T ≤ 25°C, 保持基准)
    η_PV(T) = 1 - 0.004 × (T - 25)   (T > 25°C, 每升1°C降0.4%)
    """
    if temp <= T_STC:
        return 1.0
    return 1 + BETA_T * (temp - T_STC)


# ===== V1 版本 (原公式, 无组件温度修正、无系统损耗) =====
# 保留注释以便对比, 不删除
# def calc_pv_output(
#     p_stc: float,
#     g_c: float,
#     temp: float,
# ) -> float:
#     """公式(2): 光伏系统实际有功出力 (单位与 p_stc 一致, 通常为 MW)
#
#     P_v = P_STC · η_PV(T) · (G_c / G_STC)
#
#     p_stc : 光伏额定功率 (MW)
#     g_c   : 实际辐照度 (W/m²)
#     temp  : 光伏板工作温度 (°C)
#     η_PV(T): 随温度变化的效率 (基准1, 25°C以上每升1°C降0.004)
#     """
#     eta_pv = calc_eta_pv(temp)
#     return p_stc * eta_pv * (g_c / G_STC)


def calc_cell_temperature(temp_air: float, g_c: float) -> float:
    """组件工作温度 T_cell (NOCT模型)

    T_cell = T_amb + (NOCT - 20) × (G_c / 800)

    temp_air: 环境气温 (°C)
    g_c     : 辐照度 (W/m²)
    """
    if g_c <= 0:
        return temp_air
    return temp_air + (NOCT - 20) * (g_c / 800)


def calc_pv_output_v2(
    p_stc: float,
    g_c: float,
    temp_air: float,
) -> float:
    """公式(2) V2: 光伏系统实际有功出力 (含组件温度修正 + 系统损耗)

    P_v = P_STC · η_PV(T_cell) · (G_c / G_STC) · (1 - LOSS_PCT/100)

    p_stc   : 光伏额定功率 (MW)
    g_c     : 实际辐照度 (W/m²)
    temp_air: 环境气温 (°C)
    流程:
      1. 用 NOCT 模型算组件温度 T_cell
      2. 用 T_cell 算效率 η_PV
      3. 乘损耗系数 (1 - LOSS_PCT/100)
    """
    t_cell = calc_cell_temperature(temp_air, g_c)
    eta_pv = calc_eta_pv(t_cell)
    loss_factor = 1 - LOSS_PCT / 100
    return p_stc * eta_pv * (g_c / G_STC) * loss_factor


def calc_gao_wen_coefficient(temp_days: dict) -> float:
    """公式(1-19): 高温天气影响系数

    η_T = Σ_{T=25}^{Tmax} δ_T · (D_T / 365)

    temp_days  : {温度T: 一年内保持该温度的天数 D_T}
    δ_T 由 calc_eta_pv 内部根据 η 计算, 无需外部查表
    """
    total = 0.0
    for t, d_t in temp_days.items():
        if t < T_STC:
            continue  # 只统计 25°C 以上
        delta_t = calc_eta_pv(t)
        total += delta_t * (d_t / 365)
    return total


def calc_pv_impact_index(
    p_pv_n: float,
    eta_y: float,
    eta_t: float,
) -> float:
    """公式(1-20): 极端天气对该地区光伏发电的影响指标

    I_PV = P_PV^N · (η_y + η_T)

    p_pv_n: 该市光伏装机容量的标么值(归一化值)
    eta_y : 阴雨天气影响系数 (公式1结果)
    eta_t : 高温天气影响系数 (公式1-19结果)

    """
    return p_pv_n * (eta_y + eta_t)


# ===== 别名: calc_pv_output 默认用 V2 (含组件温度+损耗) =====
# 其他脚本无需修改, 自动使用修正后的模型
calc_pv_output = calc_pv_output_v2


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')

    # ===== 示例: 用一组假数据跑通流程 =====
    # 假设某市: 阴雨 90 天, 装机 1000MW
    eta_y = calc_yin_yu_coefficient(d_y=90)
    print(f"η_y(阴雨系数) = {eta_y:.4f}")

    # 假设: 辐照度 500 W/m², 温度 35°C (V2: 含组件温度+损耗)
    p_v = calc_pv_output(p_stc=1000, g_c=500, temp=35)
    print(f"P_v(实际出力, V2含损耗+组件温度) = {p_v:.2f} MW")

    # 假设: 全年温度分布 (δ_T 内部由 β 计算)
    temp_days = {30: 60, 35: 40, 40: 10}
    eta_t = calc_gao_wen_coefficient(temp_days)
    print(f"η_T(高温系数) = {eta_t:.4f}")

    # 综合影响指标 (标么值假设为 0.5)
    i_pv = calc_pv_impact_index(p_pv_n=0.5, eta_y=eta_y, eta_t=eta_t)
    print(f"I_PV(综合影响指标) = {i_pv:.4f}")
