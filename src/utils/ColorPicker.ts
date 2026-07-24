/**
 * 拾色器 / 色值转换模块
 * 支持 HEX、RGB、HSL 互转（含透明度），以及自定义调色板本地存储
 */

/** RGB 颜色 */
export type RgbColor = {
  r: number
  g: number
  b: number
}

/** HSL 颜色 */
export type HslColor = {
  h: number
  s: number
  l: number
}

/** 统一色值模型（alpha：0~100） */
export type ColorValue = {
  /** 展示用 HEX：不透明为 #RRGGBB，半透明为 #RRGGBBAA */
  hex: string
  /** 不含透明度的 #RRGGBB（供原生 color input） */
  hexOpaque: string
  rgb: RgbColor
  hsl: HslColor
  /** 透明度百分比 0~100 */
  alpha: number
}

/** 调色板条目 */
export type PaletteColor = {
  id: string
  hex: string
  createdAt: number
}

/** 本地调色板存储键 */
export const COLOR_PALETTE_STORAGE_KEY = 'fuse-kit-color-palette'

/** 调色板最大数量 */
export const COLOR_PALETTE_MAX = 24

/**
 * 将数值限制在区间内
 * @param value 原值
 * @param min 最小
 * @param max 最大
 * @returns 限制后的值
 */
export function ClampColorNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.min(max, Math.max(min, value))
}

/**
 * 将 0~255 通道转为两位十六进制
 * @param channel 通道值
 * @returns 两位 hex
 */
export function ChannelToHex(channel: number): string {
  const safe = ClampColorNumber(Math.round(channel), 0, 255)
  return safe.toString(16).padStart(2, '0').toUpperCase()
}

/**
 * 透明度百分比转 0~255 通道
 * @param alphaPercent 0~100
 * @returns 0~255
 */
export function AlphaPercentToChannel(alphaPercent: number): number {
  return ClampColorNumber(Math.round((ClampColorNumber(alphaPercent, 0, 100) / 100) * 255), 0, 255)
}

/**
 * 0~255 通道转透明度百分比
 * @param channel 0~255
 * @returns 0~100
 */
export function AlphaChannelToPercent(channel: number): number {
  return ClampColorNumber(Math.round((ClampColorNumber(channel, 0, 255) / 255) * 100), 0, 100)
}

/**
 * 规范化 HEX：支持 #RGB / #RGBA / #RRGGBB / #RRGGBBAA
 * @param input 用户输入
 * @returns { hexOpaque, alpha }；非法则 null
 */
export function ParseHexColor(
  input: string
): { hexOpaque: string; alpha: number } | null {
  if (!input) {
    return null
  }
  let hex = input.trim().replace(/^#/, '').toUpperCase()
  if (/^[0-9A-F]{3}$/.test(hex) || /^[0-9A-F]{4}$/.test(hex)) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('')
  }
  if (/^[0-9A-F]{6}$/.test(hex)) {
    return { hexOpaque: `#${hex}`, alpha: 100 }
  }
  if (/^[0-9A-F]{8}$/.test(hex)) {
    return {
      hexOpaque: `#${hex.slice(0, 6)}`,
      alpha: AlphaChannelToPercent(parseInt(hex.slice(6, 8), 16)),
    }
  }
  return null
}

/**
 * 规范化为展示 HEX（含可选 alpha）
 * @param input 用户输入
 * @returns 规范化 HEX；非法则 null
 */
export function NormalizeHex(input: string): string | null {
  const parsed = ParseHexColor(input)
  if (!parsed) {
    return null
  }
  return FormatHexWithAlpha(parsed.hexOpaque, parsed.alpha)
}

/**
 * 组合不透明 HEX 与透明度生成展示 HEX
 * @param hexOpaque #RRGGBB
 * @param alpha 0~100
 * @returns HEX
 */
export function FormatHexWithAlpha(hexOpaque: string, alpha: number): string {
  const opaque = hexOpaque.toUpperCase().startsWith('#')
    ? hexOpaque.toUpperCase()
    : `#${hexOpaque.toUpperCase()}`
  const safeAlpha = ClampColorNumber(Math.round(alpha), 0, 100)
  if (safeAlpha >= 100) {
    return opaque.slice(0, 7)
  }
  return `${opaque.slice(0, 7)}${ChannelToHex(AlphaPercentToChannel(safeAlpha))}`
}

/**
 * HEX 转 RGB（忽略 alpha）
 * @param hex HEX 色值
 * @returns RGB；非法则 null
 */
export function HexToRgb(hex: string): RgbColor | null {
  const parsed = ParseHexColor(hex)
  if (!parsed) {
    return null
  }
  const raw = parsed.hexOpaque.slice(1)
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  }
}

/**
 * RGB 转不透明 HEX
 * @param rgb RGB
 * @returns #RRGGBB
 */
export function RgbToHex(rgb: RgbColor): string {
  return `#${ChannelToHex(rgb.r)}${ChannelToHex(rgb.g)}${ChannelToHex(rgb.b)}`
}

/**
 * RGB 转 HSL
 * @param rgb RGB
 * @returns HSL（h:0-360, s/l:0-100）
 */
export function RgbToHsl(rgb: RgbColor): HslColor {
  const r = ClampColorNumber(rgb.r, 0, 255) / 255
  const g = ClampColorNumber(rgb.g, 0, 255) / 255
  const b = ClampColorNumber(rgb.b, 0, 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / delta + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / delta + 2) / 6
        break
      default:
        h = ((r - g) / delta + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

/**
 * HSL 转 RGB
 * @param hsl HSL
 * @returns RGB
 */
export function HslToRgb(hsl: HslColor): RgbColor {
  const h = ClampColorNumber(hsl.h, 0, 360) / 360
  const s = ClampColorNumber(hsl.s, 0, 100) / 100
  const l = ClampColorNumber(hsl.l, 0, 100) / 100

  if (s === 0) {
    const gray = Math.round(l * 255)
    return { r: gray, g: gray, b: gray }
  }

  /**
   * HSL 色轮辅助插值
   * @param p 参数 p
   * @param q 参数 q
   * @param t 色相偏移
   * @returns 0~1 通道
   */
  const HueToRgb = (p: number, q: number, t: number): number => {
    let next = t
    if (next < 0) {
      next += 1
    }
    if (next > 1) {
      next -= 1
    }
    if (next < 1 / 6) {
      return p + (q - p) * 6 * next
    }
    if (next < 1 / 2) {
      return q
    }
    if (next < 2 / 3) {
      return p + (q - p) * (2 / 3 - next) * 6
    }
    return p
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    r: Math.round(HueToRgb(p, q, h + 1 / 3) * 255),
    g: Math.round(HueToRgb(p, q, h) * 255),
    b: Math.round(HueToRgb(p, q, h - 1 / 3) * 255),
  }
}

/**
 * 由 HEX 构建完整色值（支持含 alpha）
 * @param hex HEX
 * @returns 色值；非法则 null
 */
export function BuildColorFromHex(hex: string): ColorValue | null {
  const parsed = ParseHexColor(hex)
  if (!parsed) {
    return null
  }
  const rgb = HexToRgb(parsed.hexOpaque)
  if (!rgb) {
    return null
  }
  return AssembleColorValue(rgb, parsed.alpha)
}

/**
 * 组装完整色值
 * @param rgb RGB
 * @param alpha 透明度 0~100
 * @returns 色值
 */
export function AssembleColorValue(rgb: RgbColor, alpha = 100): ColorValue {
  const safe = {
    r: ClampColorNumber(Math.round(rgb.r), 0, 255),
    g: ClampColorNumber(Math.round(rgb.g), 0, 255),
    b: ClampColorNumber(Math.round(rgb.b), 0, 255),
  }
  const safeAlpha = ClampColorNumber(Math.round(alpha), 0, 100)
  const hexOpaque = RgbToHex(safe)
  return {
    hex: FormatHexWithAlpha(hexOpaque, safeAlpha),
    hexOpaque,
    rgb: safe,
    hsl: RgbToHsl(safe),
    alpha: safeAlpha,
  }
}

/**
 * 由 RGB 构建完整色值
 * @param rgb RGB
 * @param alpha 透明度 0~100
 * @returns 色值
 */
export function BuildColorFromRgb(rgb: RgbColor, alpha = 100): ColorValue {
  return AssembleColorValue(rgb, alpha)
}

/**
 * 由 HSL 构建完整色值
 * @param hsl HSL
 * @param alpha 透明度 0~100
 * @returns 色值
 */
export function BuildColorFromHsl(hsl: HslColor, alpha = 100): ColorValue {
  const safe = {
    h: ClampColorNumber(Math.round(hsl.h), 0, 360),
    s: ClampColorNumber(Math.round(hsl.s), 0, 100),
    l: ClampColorNumber(Math.round(hsl.l), 0, 100),
  }
  const rgb = HslToRgb(safe)
  const next = AssembleColorValue(rgb, alpha)
  return {
    ...next,
    hsl: safe,
  }
}

/**
 * 仅更新透明度
 * @param color 当前色值
 * @param alpha 新透明度 0~100
 * @returns 新色值
 */
export function BuildColorWithAlpha(color: ColorValue, alpha: number): ColorValue {
  return AssembleColorValue(color.rgb, alpha)
}

/**
 * 格式化 RGB / RGBA 展示文案
 * @param rgb RGB
 * @param alpha 透明度 0~100
 * @returns 文案
 */
export function FormatRgbText(rgb: RgbColor, alpha = 100): string {
  const safeAlpha = ClampColorNumber(Math.round(alpha), 0, 100)
  if (safeAlpha >= 100) {
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  }
  const a = Number((safeAlpha / 100).toFixed(2))
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`
}

/**
 * 格式化 HSL / HSLA 展示文案
 * @param hsl HSL
 * @param alpha 透明度 0~100
 * @returns 文案
 */
export function FormatHslText(hsl: HslColor, alpha = 100): string {
  const safeAlpha = ClampColorNumber(Math.round(alpha), 0, 100)
  if (safeAlpha >= 100) {
    return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
  }
  const a = Number((safeAlpha / 100).toFixed(2))
  return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${a})`
}

/**
 * 生成 CSS 预览色（始终 rgba，便于叠棋盘格）
 * @param color 色值
 * @returns CSS 颜色
 */
export function FormatCssRgba(color: ColorValue): string {
  const a = Number((ClampColorNumber(color.alpha, 0, 100) / 100).toFixed(2))
  return `rgba(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}, ${a})`
}

/**
 * 判断当前环境是否支持 EyeDropper
 * @returns 是否支持
 */
export function IsEyeDropperSupported(): boolean {
  return typeof window !== 'undefined' && 'EyeDropper' in window
}

/**
 * 调用系统屏幕取色（EyeDropper）
 * @returns 取到的 HEX；取消或失败返回 null
 */
export async function PickScreenColor(): Promise<string | null> {
  if (!IsEyeDropperSupported()) {
    return null
  }
  try {
    // EyeDropper 尚未进入全部 TS DOM 类型
    const EyeDropperCtor = (
      window as Window & {
        EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> }
      }
    ).EyeDropper
    const dropper = new EyeDropperCtor()
    const result = await dropper.open()
    return NormalizeHex(result.sRGBHex)
  } catch {
    return null
  }
}

/**
 * 读取本地调色板
 * @returns 调色板列表
 */
export function LoadColorPalette(): PaletteColor[] {
  try {
    const raw = localStorage.getItem(COLOR_PALETTE_STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as PaletteColor[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter((item) => item && typeof item.hex === 'string' && NormalizeHex(item.hex))
      .slice(0, COLOR_PALETTE_MAX)
      .map((item) => ({
        id: String(item.id || `${item.hex}-${item.createdAt}`),
        hex: NormalizeHex(item.hex) || '#000000',
        createdAt: Number(item.createdAt) || Date.now(),
      }))
  } catch {
    return []
  }
}

/**
 * 保存本地调色板
 * @param palette 调色板
 */
export function SaveColorPalette(palette: PaletteColor[]) {
  localStorage.setItem(
    COLOR_PALETTE_STORAGE_KEY,
    JSON.stringify(palette.slice(0, COLOR_PALETTE_MAX))
  )
}

/**
 * 添加颜色到调色板（去重，新色置顶）
 * @param palette 现有列表
 * @param hex 色值
 * @returns 新列表
 */
export function AddColorToPalette(palette: PaletteColor[], hex: string): PaletteColor[] {
  const normalized = NormalizeHex(hex)
  if (!normalized) {
    return palette
  }
  const next = palette.filter((item) => item.hex !== normalized)
  next.unshift({
    id: `${normalized}-${Date.now()}`,
    hex: normalized,
    createdAt: Date.now(),
  })
  return next.slice(0, COLOR_PALETTE_MAX)
}

/**
 * 从调色板移除颜色
 * @param palette 现有列表
 * @param id 条目 id
 * @returns 新列表
 */
export function RemoveColorFromPalette(palette: PaletteColor[], id: string): PaletteColor[] {
  return palette.filter((item) => item.id !== id)
}

/**
 * 根据亮度判断前景文字用深色还是浅色
 * @param hex HEX（可含 alpha）
 * @returns 文字色
 */
export function ResolveContrastTextColor(hex: string): string {
  const rgb = HexToRgb(hex)
  if (!rgb) {
    return '#1f2a3d'
  }
  const parsed = ParseHexColor(hex)
  const alpha = parsed ? parsed.alpha : 100
  // 透明度较低时默认用深色字，避免叠在棋盘格上看不清
  if (alpha < 45) {
    return '#1f2a3d'
  }
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.62 ? '#1f2a3d' : '#fff8ef'
}
