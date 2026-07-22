/**
 * 单位转换工具模块
 * 参考 toolbox unit-converter：长度/重量/面积/体积/温度换算
 */

/** 转换类型 */
export type UnitMeasureType =
  | 'length'
  | 'weight'
  | 'area'
  | 'volume'
  | 'temperature'

/** 单位选项 */
export type UnitOption = {
  label: string
  value: string
}

/** 转换类型选项 */
export type MeasureTypeOption = {
  label: string
  value: UnitMeasureType
}

/** 转换历史记录 */
export type UnitConversionRecord = {
  type: UnitMeasureType
  input: string
  output: string
  timestamp: string
}

/**
 * 获取转换类型列表
 * @returns 类型选项
 */
export function GetMeasureTypes(): MeasureTypeOption[] {
  return [
    { label: '长度', value: 'length' },
    { label: '重量', value: 'weight' },
    { label: '面积', value: 'area' },
    { label: '体积', value: 'volume' },
    { label: '温度', value: 'temperature' },
  ]
}

/**
 * 获取各类型可用单位
 * @returns 单位定义表
 */
export function GetUnitDefinitions(): Record<UnitMeasureType, UnitOption[]> {
  return {
    length: [
      { label: '米 (m)', value: 'm' },
      { label: '厘米 (cm)', value: 'cm' },
      { label: '毫米 (mm)', value: 'mm' },
      { label: '千米 (km)', value: 'km' },
      { label: '英寸 (in)', value: 'in' },
      { label: '英尺 (ft)', value: 'ft' },
    ],
    weight: [
      { label: '千克 (kg)', value: 'kg' },
      { label: '克 (g)', value: 'g' },
      { label: '毫克 (mg)', value: 'mg' },
      { label: '磅 (lb)', value: 'lb' },
      { label: '盎司 (oz)', value: 'oz' },
    ],
    area: [
      { label: '平方米 (m²)', value: 'm2' },
      { label: '平方厘米 (cm²)', value: 'cm2' },
      { label: '平方千米 (km²)', value: 'km2' },
      { label: '公顷 (ha)', value: 'ha' },
      { label: '英亩 (acre)', value: 'acre' },
    ],
    volume: [
      { label: '立方米 (m³)', value: 'm3' },
      { label: '立方厘米 (cm³)', value: 'cm3' },
      { label: '升 (L)', value: 'L' },
      { label: '毫升 (mL)', value: 'mL' },
      { label: '加仑 (gal)', value: 'gal' },
    ],
    temperature: [
      { label: '摄氏度 (°C)', value: 'C' },
      { label: '华氏度 (°F)', value: 'F' },
      { label: '开尔文 (K)', value: 'K' },
    ],
  }
}

/**
 * 获取相对基准单位的换算系数（温度除外）
 * @returns 系数表
 */
export function GetConversionFactors(): Record<
  Exclude<UnitMeasureType, 'temperature'>,
  Record<string, number>
> {
  return {
    length: {
      m: 1,
      cm: 0.01,
      mm: 0.001,
      km: 1000,
      in: 0.0254,
      ft: 0.3048,
    },
    weight: {
      kg: 1,
      g: 0.001,
      mg: 0.000001,
      lb: 0.45359237,
      oz: 0.028349523125,
    },
    area: {
      m2: 1,
      cm2: 0.0001,
      km2: 1_000_000,
      ha: 10_000,
      acre: 4046.8564224,
    },
    volume: {
      m3: 1,
      cm3: 0.000001,
      L: 0.001,
      mL: 0.000001,
      gal: 0.003785411784,
    },
  }
}

/**
 * 获取类型默认单位对
 * @param type 转换类型
 * @returns from / to
 */
export function ResolveDefaultUnits(type: UnitMeasureType): {
  fromUnit: string
  toUnit: string
} {
  const defaults: Record<UnitMeasureType, { fromUnit: string; toUnit: string }> =
    {
      length: { fromUnit: 'm', toUnit: 'cm' },
      weight: { fromUnit: 'kg', toUnit: 'g' },
      area: { fromUnit: 'm2', toUnit: 'cm2' },
      volume: { fromUnit: 'L', toUnit: 'mL' },
      temperature: { fromUnit: 'C', toUnit: 'F' },
    }
  return defaults[type]
}

/**
 * 从单位选项中取简称标签
 * @param units 单位列表
 * @param unitValue 单位值
 * @returns 简称
 */
export function ResolveUnitShortLabel(
  units: UnitOption[],
  unitValue: string,
): string {
  const unit = units.find((item) => item.value === unitValue)
  if (!unit) {
    return unitValue
  }
  return unit.label.split(' ')[0]
}

/**
 * 温度换算
 * @param value 输入值
 * @param from 源单位
 * @param to 目标单位
 * @returns 结果
 */
export function ConvertTemperature(
  value: number,
  from: string,
  to: string,
): number {
  let celsius = value

  if (from === 'F') {
    celsius = ((value - 32) * 5) / 9
  } else if (from === 'K') {
    celsius = value - 273.15
  }

  if (to === 'C') {
    return celsius
  }
  if (to === 'F') {
    return (celsius * 9) / 5 + 32
  }
  return celsius + 273.15
}

/**
 * 执行单位换算
 * @param type 类型
 * @param value 输入值
 * @param fromUnit 源单位
 * @param toUnit 目标单位
 * @returns 结果数值
 */
export function ConvertUnitValue(
  type: UnitMeasureType,
  value: number,
  fromUnit: string,
  toUnit: string,
): number {
  if (!Number.isFinite(value) || !fromUnit || !toUnit) {
    return 0
  }
  if (fromUnit === toUnit) {
    return value
  }

  if (type === 'temperature') {
    return ConvertTemperature(value, fromUnit, toUnit)
  }

  const factors = GetConversionFactors()[type]
  const fromFactor = factors[fromUnit]
  const toFactor = factors[toUnit]
  if (!fromFactor || !toFactor) {
    return 0
  }
  return (value * fromFactor) / toFactor
}

/**
 * 格式化换算结果（最多 6 位有效小数，去掉多余 0）
 * @param value 数值
 * @returns 字符串
 */
export function FormatUnitNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '0'
  }
  const fixed = Number(value.toPrecision(10))
  return String(parseFloat(fixed.toFixed(6)))
}

/**
 * 获取换算比率说明文案
 * @param type 类型
 * @param fromUnit 源单位
 * @param toUnit 目标单位
 * @returns 说明
 */
export function ResolveConversionRateText(
  type: UnitMeasureType,
  fromUnit: string,
  toUnit: string,
): string {
  if (!fromUnit || !toUnit) {
    return ''
  }

  if (type === 'temperature') {
    const formulas: Record<string, string> = {
      'C-F': '°F = °C × 9/5 + 32',
      'C-K': 'K = °C + 273.15',
      'F-C': '°C = (°F - 32) × 5/9',
      'F-K': 'K = (°F - 32) × 5/9 + 273.15',
      'K-C': '°C = K - 273.15',
      'K-F': '°F = (K - 273.15) × 9/5 + 32',
      'C-C': '相同单位',
      'F-F': '相同单位',
      'K-K': '相同单位',
    }
    return formulas[`${fromUnit}-${toUnit}`] || ''
  }

  const rate = ConvertUnitValue(type, 1, fromUnit, toUnit)
  return FormatUnitNumber(rate)
}
