"""
供需平衡模型 — 汇总供给侧(光伏+风电+火电)与需求侧(负荷), 计算供需缺口

核心公式:
  总供给 = 光伏出力 + 风电出力 + 火电出力
  供需缺口 ΔP = 总供给 - 负荷需求
    ΔP > 0 → 供大于求 (富余)
    ΔP < 0 → 供不应求 (缺口, 需预警)
    ΔP ≈ 0 → 供需平衡

⚠️ 火电目前为占位模型 (见 thermal_model.py), 拿到真实公式后替换。
"""

# 天气输入: 温度(temp)、风速(wind)、辐照度(g_c)
# 容量参数: 光伏装机(pv_cap)、风电装机(wind_cap)、火电装机(thermal_cap)
# 负荷参数: 日基本负荷(p_l0)


def calc_supply(solar: float, wind: float, thermal: float) -> float:
    """总供给出力 (MW)

    供出 = 光伏 + 风电 + 火电
    """
    return solar + wind + thermal


def calc_gap(supply: float, load: float) -> float:
    """供需缺口 (MW)

    ΔP = 供给 - 负荷
    """
    return supply - load


def classify_risk(gap: float, load: float) -> dict:
    """供需风险等级分级

    gap负值比例 (缺口占负荷百分比) 越大, 风险越高。
    返回: {level, label} 或更详细的风险描述

    分级参考 (占比 = |缺口|/负荷):
      占比 < 2%      → 安全 (绿)
      2% ≤ 占比 < 5% → 关注 (蓝)
      5% ≤ 占比 < 10%→ 预警 (黄)
      10% ≤ 占比 < 20%→ 较高 (橙)
      占比 ≥ 20%     → 严重 (红)
    """
    if load <= 0:
        return {'level': 'safe', 'label': '安全', 'ratio': 0.0}

    ratio = abs(gap) / load * 100  # 缺口占负荷百分比

    if gap >= 0:
        return {'level': 'safe', 'label': '富余/平衡', 'ratio': ratio}
    if ratio < 2:
        return {'level': 'safe', 'label': '安全', 'ratio': ratio}
    if ratio < 5:
        return {'level': 'blue', 'label': '关注', 'ratio': ratio}
    if ratio < 10:
        return {'level': 'yellow', 'label': '预警', 'ratio': ratio}
    if ratio < 20:
        return {'level': 'orange', 'label': '较高', 'ratio': ratio}
    return {'level': 'red', 'label': '严重', 'ratio': ratio}


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')

    # ===== 示例: 一个城市的某时刻供需 =====
    solar, wind, thermal = 1500, 500, 4000   # 供给 MW
    load = 5500                              # 负荷 MW

    supply = calc_supply(solar, wind, thermal)
    gap = calc_gap(supply, load)
    risk = classify_risk(gap, load)

    print(f"供给: 光伏{solar} + 风电{wind} + 火电{thermal} = {supply} MW")
    print(f"负荷: {load} MW")
    print(f"供需缺口: ΔP = {gap:+} MW")
    print(f"风险等级: {risk['label']} (缺口占负荷{risk['ratio']:.1f}%)")
