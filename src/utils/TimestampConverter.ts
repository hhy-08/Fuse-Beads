/**
 * 时间戳转换模块
 * 秒 / 毫秒时间戳与多时区本地时间互转，支持批量解析
 */

/** 时间戳单位 */
export type TimestampUnit = 's' | 'ms'

/** 时区选项 */
export type TimezoneOption = {
  value: string
  label: string
  country: string
  /** 大洲 / 地区分组 */
  region: string
}

/** 时区分组 */
export type TimezoneGroup = {
  region: string
  options: TimezoneOption[]
}

/** 单次转换结果 */
export type TimestampConvertItem = {
  input: string
  ok: boolean
  message: string
  timestampMs: number | null
  timestampSec: number | null
  datetimeText: string
  timezone: string
  unit: TimestampUnit
}

/** 转换历史记录 */
export type TimestampHistoryRecord = {
  id: string
  direction: 'ts-to-time' | 'time-to-ts'
  input: string
  output: string
  timezoneLabel: string
  unitLabel: string
  createdAt: string
}

/**
 * 获取常用时区列表（含北京时间与非洲多国）
 * @returns 时区选项
 */
export function GetTimezoneOptions(): TimezoneOption[] {
  return [
    // 东亚 / 东南亚
    { value: 'Asia/Shanghai', label: '北京时间 (UTC+8)', country: '中国', region: '亚洲' },
    { value: 'Asia/Hong_Kong', label: '香港时间 (UTC+8)', country: '中国香港', region: '亚洲' },
    { value: 'Asia/Taipei', label: '台北时间 (UTC+8)', country: '中国台湾', region: '亚洲' },
    { value: 'Asia/Tokyo', label: '东京时间 (UTC+9)', country: '日本', region: '亚洲' },
    { value: 'Asia/Seoul', label: '首尔时间 (UTC+9)', country: '韩国', region: '亚洲' },
    { value: 'Asia/Singapore', label: '新加坡时间 (UTC+8)', country: '新加坡', region: '亚洲' },
    { value: 'Asia/Bangkok', label: '曼谷时间 (UTC+7)', country: '泰国', region: '亚洲' },
    { value: 'Asia/Ho_Chi_Minh', label: '胡志明市时间 (UTC+7)', country: '越南', region: '亚洲' },
    { value: 'Asia/Jakarta', label: '雅加达时间 (UTC+7)', country: '印度尼西亚', region: '亚洲' },
    { value: 'Asia/Manila', label: '马尼拉时间 (UTC+8)', country: '菲律宾', region: '亚洲' },
    { value: 'Asia/Kuala_Lumpur', label: '吉隆坡时间 (UTC+8)', country: '马来西亚', region: '亚洲' },
    { value: 'Asia/Kolkata', label: '印度时间 (UTC+5:30)', country: '印度', region: '亚洲' },
    { value: 'Asia/Karachi', label: '卡拉奇时间 (UTC+5)', country: '巴基斯坦', region: '亚洲' },
    { value: 'Asia/Dhaka', label: '达卡时间 (UTC+6)', country: '孟加拉国', region: '亚洲' },
    { value: 'Asia/Dubai', label: '迪拜时间 (UTC+4)', country: '阿联酋', region: '亚洲' },
    { value: 'Asia/Riyadh', label: '利雅得时间 (UTC+3)', country: '沙特阿拉伯', region: '亚洲' },
    { value: 'Asia/Tehran', label: '德黑兰时间', country: '伊朗', region: '亚洲' },
    { value: 'Asia/Jerusalem', label: '耶路撒冷时间', country: '以色列', region: '亚洲' },

    // 非洲
    { value: 'Africa/Lagos', label: '拉各斯时间 (UTC+1)', country: '尼日利亚', region: '非洲' },
    { value: 'Africa/Accra', label: '阿克拉时间 (UTC+0)', country: '加纳', region: '非洲' },
    { value: 'Africa/Nairobi', label: '内罗毕时间 (UTC+3)', country: '肯尼亚', region: '非洲' },
    { value: 'Africa/Cairo', label: '开罗时间', country: '埃及', region: '非洲' },
    { value: 'Africa/Johannesburg', label: '约翰内斯堡时间 (UTC+2)', country: '南非', region: '非洲' },
    { value: 'Africa/Casablanca', label: '卡萨布兰卡时间', country: '摩洛哥', region: '非洲' },
    { value: 'Africa/Addis_Ababa', label: '亚的斯亚贝巴时间 (UTC+3)', country: '埃塞俄比亚', region: '非洲' },
    { value: 'Africa/Dar_es_Salaam', label: '达累斯萨拉姆时间 (UTC+3)', country: '坦桑尼亚', region: '非洲' },
    { value: 'Africa/Kampala', label: '坎帕拉时间 (UTC+3)', country: '乌干达', region: '非洲' },
    { value: 'Africa/Kigali', label: '基加利时间 (UTC+2)', country: '卢旺达', region: '非洲' },
    { value: 'Africa/Dakar', label: '达喀尔时间 (UTC+0)', country: '塞内加尔', region: '非洲' },
    { value: 'Africa/Abidjan', label: '阿比让时间 (UTC+0)', country: '科特迪瓦', region: '非洲' },
    { value: 'Africa/Douala', label: '杜阿拉时间 (UTC+1)', country: '喀麦隆', region: '非洲' },
    { value: 'Africa/Algiers', label: '阿尔及尔时间 (UTC+1)', country: '阿尔及利亚', region: '非洲' },
    { value: 'Africa/Tunis', label: '突尼斯时间 (UTC+1)', country: '突尼斯', region: '非洲' },
    { value: 'Africa/Tripoli', label: '的黎波里时间 (UTC+2)', country: '利比亚', region: '非洲' },
    { value: 'Africa/Khartoum', label: '喀土穆时间 (UTC+2)', country: '苏丹', region: '非洲' },
    { value: 'Africa/Juba', label: '朱巴时间 (UTC+2)', country: '南苏丹', region: '非洲' },
    { value: 'Africa/Harare', label: '哈拉雷时间 (UTC+2)', country: '津巴布韦', region: '非洲' },
    { value: 'Africa/Lusaka', label: '卢萨卡时间 (UTC+2)', country: '赞比亚', region: '非洲' },
    { value: 'Africa/Maputo', label: '马普托时间 (UTC+2)', country: '莫桑比克', region: '非洲' },
    { value: 'Africa/Luanda', label: '罗安达时间 (UTC+1)', country: '安哥拉', region: '非洲' },
    { value: 'Africa/Kinshasa', label: '金沙萨时间 (UTC+1)', country: '刚果（金）西部', region: '非洲' },
    { value: 'Africa/Lubumbashi', label: '卢本巴希时间 (UTC+2)', country: '刚果（金）东部', region: '非洲' },
    { value: 'Africa/Brazzaville', label: '布拉柴维尔时间 (UTC+1)', country: '刚果（布）', region: '非洲' },
    { value: 'Africa/Windhoek', label: '温得和克时间', country: '纳米比亚', region: '非洲' },
    { value: 'Africa/Gaborone', label: '哈博罗内时间 (UTC+2)', country: '博茨瓦纳', region: '非洲' },
    { value: 'Africa/Mogadishu', label: '摩加迪沙时间 (UTC+3)', country: '索马里', region: '非洲' },
    { value: 'Indian/Antananarivo', label: '塔那那利佛时间 (UTC+3)', country: '马达加斯加', region: '非洲' },
    { value: 'Indian/Mauritius', label: '毛里求斯时间 (UTC+4)', country: '毛里求斯', region: '非洲' },

    // 欧洲
    { value: 'Europe/London', label: '伦敦时间', country: '英国', region: '欧洲' },
    { value: 'Europe/Paris', label: '巴黎时间', country: '法国', region: '欧洲' },
    { value: 'Europe/Berlin', label: '柏林时间', country: '德国', region: '欧洲' },
    { value: 'Europe/Amsterdam', label: '阿姆斯特丹时间', country: '荷兰', region: '欧洲' },
    { value: 'Europe/Rome', label: '罗马时间', country: '意大利', region: '欧洲' },
    { value: 'Europe/Madrid', label: '马德里时间', country: '西班牙', region: '欧洲' },
    { value: 'Europe/Lisbon', label: '里斯本时间', country: '葡萄牙', region: '欧洲' },
    { value: 'Europe/Zurich', label: '苏黎世时间', country: '瑞士', region: '欧洲' },
    { value: 'Europe/Stockholm', label: '斯德哥尔摩时间', country: '瑞典', region: '欧洲' },
    { value: 'Europe/Warsaw', label: '华沙时间', country: '波兰', region: '欧洲' },
    { value: 'Europe/Athens', label: '雅典时间', country: '希腊', region: '欧洲' },
    { value: 'Europe/Istanbul', label: '伊斯坦布尔时间 (UTC+3)', country: '土耳其', region: '欧洲' },
    { value: 'Europe/Moscow', label: '莫斯科时间 (UTC+3)', country: '俄罗斯', region: '欧洲' },
    { value: 'Europe/Kyiv', label: '基辅时间', country: '乌克兰', region: '欧洲' },

    // 美洲
    { value: 'America/New_York', label: '纽约时间', country: '美国东部', region: '美洲' },
    { value: 'America/Chicago', label: '芝加哥时间', country: '美国中部', region: '美洲' },
    { value: 'America/Denver', label: '丹佛时间', country: '美国山地', region: '美洲' },
    { value: 'America/Los_Angeles', label: '洛杉矶时间', country: '美国西部', region: '美洲' },
    { value: 'America/Toronto', label: '多伦多时间', country: '加拿大', region: '美洲' },
    { value: 'America/Vancouver', label: '温哥华时间', country: '加拿大西部', region: '美洲' },
    { value: 'America/Mexico_City', label: '墨西哥城时间', country: '墨西哥', region: '美洲' },
    { value: 'America/Sao_Paulo', label: '圣保罗时间', country: '巴西', region: '美洲' },
    { value: 'America/Buenos_Aires', label: '布宜诺斯艾利斯时间', country: '阿根廷', region: '美洲' },
    { value: 'America/Bogota', label: '波哥大时间 (UTC-5)', country: '哥伦比亚', region: '美洲' },
    { value: 'America/Lima', label: '利马时间 (UTC-5)', country: '秘鲁', region: '美洲' },
    { value: 'America/Santiago', label: '圣地亚哥时间', country: '智利', region: '美洲' },

    // 大洋洲
    { value: 'Australia/Sydney', label: '悉尼时间', country: '澳大利亚东部', region: '大洋洲' },
    { value: 'Australia/Melbourne', label: '墨尔本时间', country: '澳大利亚', region: '大洋洲' },
    { value: 'Australia/Perth', label: '珀斯时间 (UTC+8)', country: '澳大利亚西部', region: '大洋洲' },
    { value: 'Pacific/Auckland', label: '奥克兰时间', country: '新西兰', region: '大洋洲' },
    { value: 'Pacific/Fiji', label: '斐济时间', country: '斐济', region: '大洋洲' },
    { value: 'Pacific/Honolulu', label: '檀香山时间 (UTC-10)', country: '美国夏威夷', region: '大洋洲' },

    // 全球
    { value: 'UTC', label: '协调世界时 UTC', country: '全球', region: '全球' },
  ]
}

/**
 * 按时区分组获取选项（用于下拉 optgroup）
 * @returns 分组列表
 */
export function GetTimezoneGroups(): TimezoneGroup[] {
  const regionOrder = ['亚洲', '非洲', '欧洲', '美洲', '大洋洲', '全球']
  const options = GetTimezoneOptions()
  return regionOrder
    .map((region) => ({
      region,
      options: options.filter((item) => item.region === region),
    }))
    .filter((group) => group.options.length > 0)
}

/**
 * 解析时区展示标签
 * @param timezone IANA 时区
 * @returns 标签
 */
export function ResolveTimezoneLabel(timezone: string): string {
  const hit = GetTimezoneOptions().find((item) => item.value === timezone)
  return hit ? `${hit.country} · ${hit.label}` : timezone
}

/**
 * 解析单位文案
 * @param unit 单位
 * @returns 文案
 */
export function ResolveUnitLabel(unit: TimestampUnit): string {
  return unit === 'ms' ? '毫秒' : '秒'
}

/**
 * 根据数值位数猜测时间戳单位
 * @param value 数值
 * @returns 单位
 */
export function GuessTimestampUnit(value: number): TimestampUnit {
  const abs = Math.abs(value)
  // 10 位左右按秒，13 位左右按毫秒
  if (abs >= 1e12) {
    return 'ms'
  }
  if (abs >= 1e9) {
    return 's'
  }
  return 'ms'
}

/**
 * 将时间戳统一为毫秒
 * @param value 时间戳数值
 * @param unit 单位
 * @returns 毫秒
 */
export function ToTimestampMs(value: number, unit: TimestampUnit): number {
  return unit === 'ms' ? value : value * 1000
}

/**
 * 毫秒转秒（向下取整）
 * @param ms 毫秒
 * @returns 秒
 */
export function ToTimestampSec(ms: number): number {
  return Math.floor(ms / 1000)
}

/**
 * 判断日期是否有效
 * @param date Date
 * @returns 是否有效
 */
export function IsValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime())
}

/**
 * 格式化指定时区的日期时间文本
 * @param ms 毫秒时间戳
 * @param timezone IANA 时区
 * @returns 文案，如 2026-07-24 14:15:00
 */
export function FormatDateTimeInTimezone(ms: number, timezone: string): string {
  const date = new Date(ms)
  if (!IsValidDate(date)) {
    return ''
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const map: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value
    }
  }

  // en-CA 在部分环境 hour 可能为 24，规范为 00
  const hour = map.hour === '24' ? '00' : map.hour
  return `${map.year}-${map.month}-${map.day} ${hour}:${map.minute}:${map.second}`
}

/**
 * 获取时区当前偏移文案（如 UTC+8）
 * @param timezone IANA 时区
 * @param ms 参考时间毫秒
 * @returns 偏移文案
 */
export function ResolveTimezoneOffsetText(timezone: string, ms = Date.now()): string {
  try {
    const text = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).format(new Date(ms))
    const match = text.match(/GMT([+-]\d{1,2}(?::\d{2})?)/i)
    if (match) {
      return `UTC${match[1]}`
    }
    const gmt = text.match(/(UTC|GMT.*)$/i)
    return gmt ? gmt[1].replace('GMT', 'UTC') : timezone
  } catch {
    return timezone
  }
}

/**
 * 解析日期时间字符串为毫秒（按指定时区理解）
 * 支持：2026-07-24 14:15:00 / 2026/07/24 14:15:00 / 2026-07-24T14:15:00
 * @param text 日期时间文本
 * @param timezone IANA 时区
 * @returns 毫秒；失败 null
 */
export function ParseDateTimeInTimezone(text: string, timezone: string): number | null {
  const raw = text.trim()
  if (!raw) {
    return null
  }

  const normalized = raw
    .replace(/\//g, '-')
    .replace('T', ' ')
    .replace(/\s+/, ' ')
    .trim()

  const match = normalized.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2})(?::(\d{1,2})(?::(\d{1,2}))?)?)?$/
  )
  if (!match) {
    // 兜底：尝试 Date 解析后按本地再校正不稳，直接失败
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4] ?? 0)
  const minute = Number(match[5] ?? 0)
  const second = Number(match[6] ?? 0)

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null
  }

  return ResolveZonedTimeToUtcMs(year, month, day, hour, minute, second, timezone)
}

/**
 * 将「某时区墙钟时间」转为 UTC 毫秒
 * @param year 年
 * @param month 月 1-12
 * @param day 日
 * @param hour 时
 * @param minute 分
 * @param second 秒
 * @param timezone IANA 时区
 * @returns 毫秒；失败 null
 */
export function ResolveZonedTimeToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timezone: string
): number | null {
  // 先按 UTC 构造猜测值，再根据目标时区显示值校正偏移
  const guess = Date.UTC(year, month - 1, day, hour, minute, second)
  if (!Number.isFinite(guess)) {
    return null
  }

  /**
   * 读取某时刻在目标时区的墙钟分量
   * @param ms 毫秒
   * @returns 分量
   */
  const ReadParts = (ms: number) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date(ms))
    const map: Record<string, number> = {}
    for (const part of parts) {
      if (part.type !== 'literal') {
        map[part.type] = Number(part.value === '24' ? '0' : part.value)
      }
    }
    return map
  }

  const asUtc = (parts: Record<string, number>) =>
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)

  // 迭代两次以处理 DST 边界
  let utc = guess
  for (let index = 0; index < 2; index += 1) {
    const parts = ReadParts(utc)
    const actualAsUtc = asUtc(parts)
    const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second)
    utc += targetAsUtc - actualAsUtc
  }

  const verify = ReadParts(utc)
  if (
    verify.year !== year ||
    verify.month !== month ||
    verify.day !== day ||
    verify.hour !== hour ||
    verify.minute !== minute ||
    verify.second !== second
  ) {
    return null
  }

  return utc
}

/**
 * 时间戳 → 日期时间
 * @param input 输入文本
 * @param unit 单位（auto 时按位数猜测）
 * @param timezone 时区
 * @returns 结果
 */
export function ConvertTimestampToDateTime(
  input: string,
  unit: TimestampUnit | 'auto',
  timezone: string
): TimestampConvertItem {
  const text = input.trim()
  if (!text) {
    return {
      input,
      ok: false,
      message: '请输入时间戳',
      timestampMs: null,
      timestampSec: null,
      datetimeText: '',
      timezone,
      unit: 's',
    }
  }

  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    return {
      input,
      ok: false,
      message: '时间戳需为数字',
      timestampMs: null,
      timestampSec: null,
      datetimeText: '',
      timezone,
      unit: 's',
    }
  }

  const numeric = Number(text)
  if (!Number.isFinite(numeric)) {
    return {
      input,
      ok: false,
      message: '时间戳无效',
      timestampMs: null,
      timestampSec: null,
      datetimeText: '',
      timezone,
      unit: 's',
    }
  }

  const resolvedUnit = unit === 'auto' ? GuessTimestampUnit(numeric) : unit
  const ms = ToTimestampMs(numeric, resolvedUnit)
  const datetimeText = FormatDateTimeInTimezone(ms, timezone)
  if (!datetimeText) {
    return {
      input,
      ok: false,
      message: '无法格式化该时间戳',
      timestampMs: null,
      timestampSec: null,
      datetimeText: '',
      timezone,
      unit: resolvedUnit,
    }
  }

  return {
    input,
    ok: true,
    message: '转换成功',
    timestampMs: Math.trunc(ms),
    timestampSec: ToTimestampSec(ms),
    datetimeText,
    timezone,
    unit: resolvedUnit,
  }
}

/**
 * 日期时间 → 时间戳
 * @param input 日期时间文本
 * @param unit 输出单位
 * @param timezone 输入所在时区
 * @returns 结果
 */
export function ConvertDateTimeToTimestamp(
  input: string,
  unit: TimestampUnit,
  timezone: string
): TimestampConvertItem {
  const text = input.trim()
  if (!text) {
    return {
      input,
      ok: false,
      message: '请输入日期时间',
      timestampMs: null,
      timestampSec: null,
      datetimeText: '',
      timezone,
      unit,
    }
  }

  const ms = ParseDateTimeInTimezone(text, timezone)
  if (ms == null) {
    return {
      input,
      ok: false,
      message: '日期格式无效，请用 YYYY-MM-DD HH:mm:ss',
      timestampMs: null,
      timestampSec: null,
      datetimeText: '',
      timezone,
      unit,
    }
  }

  const datetimeText = FormatDateTimeInTimezone(ms, timezone)
  return {
    input,
    ok: true,
    message: '转换成功',
    timestampMs: ms,
    timestampSec: ToTimestampSec(ms),
    datetimeText,
    timezone,
    unit,
  }
}

/**
 * 批量按行转换时间戳 → 日期时间
 * @param text 多行文本
 * @param unit 单位
 * @param timezone 时区
 * @returns 结果列表
 */
export function ConvertTimestampBatch(
  text: string,
  unit: TimestampUnit | 'auto',
  timezone: string
): TimestampConvertItem[] {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  return lines.map((line) => ConvertTimestampToDateTime(line, unit, timezone))
}

/**
 * 格式化当前时刻文案
 * @returns 本地可读时间
 */
export function FormatNowLabel(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

/**
 * 获取当前时间戳（按单位）
 * @param unit 单位
 * @returns 数值
 */
export function GetNowTimestamp(unit: TimestampUnit): number {
  const ms = Date.now()
  return unit === 'ms' ? ms : ToTimestampSec(ms)
}

/**
 * 创建转换记录
 * @param direction 方向
 * @param input 输入
 * @param output 输出
 * @param timezone 时区
 * @param unit 单位
 * @returns 记录
 */
export function CreateHistoryRecord(
  direction: TimestampHistoryRecord['direction'],
  input: string,
  output: string,
  timezone: string,
  unit: TimestampUnit
): TimestampHistoryRecord {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    direction,
    input,
    output,
    timezoneLabel: ResolveTimezoneLabel(timezone),
    unitLabel: ResolveUnitLabel(unit),
    createdAt: FormatNowLabel(),
  }
}
