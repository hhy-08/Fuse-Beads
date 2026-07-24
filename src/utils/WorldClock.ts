/**
 * 世界时钟 / 各国当前时间模块
 * 基于共用时区列表，实时格式化各地当地时间
 */

import {
  FormatDateTimeInTimezone,
  GetTimezoneGroups,
  GetTimezoneOptions,
  ResolveTimezoneOffsetText,
  type TimezoneGroup,
  type TimezoneOption,
} from '@/utils/TimestampConverter'

/** 表盘时分秒部件 */
export type ClockHandParts = {
  hour: number
  minute: number
  second: number
}

/** 单条城市当前时间 */
export type WorldClockItem = {
  timezone: string
  country: string
  label: string
  region: string
  dateText: string
  timeText: string
  time12Text: string
  weekdayText: string
  offsetText: string
  periodLabel: string
  ampm: string
  hour: number
  minute: number
  second: number
  hourDeg: number
  minuteDeg: number
  secondDeg: number
  isDaytime: boolean
}

/** 收藏城市本地存储键 */
export const WORLD_CLOCK_FAVORITES_KEY = 'fuse-kit-world-clock-favorites'

/**
 * 获取全部可展示时区
 * @returns 时区选项
 */
export function GetWorldClockTimezones(): TimezoneOption[] {
  return GetTimezoneOptions()
}

/**
 * 获取分组时区
 * @returns 分组
 */
export function GetWorldClockGroups(): TimezoneGroup[] {
  return GetTimezoneGroups()
}

/**
 * 读取星期文案（指定时区）
 * @param ms 毫秒
 * @param timezone IANA 时区
 * @returns 星期
 */
export function FormatWeekdayInTimezone(ms: number, timezone: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: timezone,
    weekday: 'long',
  }).format(new Date(ms))
}

/**
 * 读取指定时区的时分秒
 * @param ms 毫秒
 * @param timezone IANA 时区
 * @returns 时分秒
 */
export function ResolveClockPartsInTimezone(ms: number, timezone: string): ClockHandParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(ms))

  const ReadPart = (type: Intl.DateTimeFormatPartTypes): number => {
    const found = parts.find((part) => part.type === type)
    const raw = found ? found.value : '0'
    if (type === 'hour' && raw === '24') {
      return 0
    }
    return Number(raw)
  }

  return {
    hour: ReadPart('hour'),
    minute: ReadPart('minute'),
    second: ReadPart('second'),
  }
}

/**
 * 读取小时（0-23）用于判断昼夜
 * @param ms 毫秒
 * @param timezone IANA 时区
 * @returns 小时
 */
export function ResolveHourInTimezone(ms: number, timezone: string): number {
  return ResolveClockPartsInTimezone(ms, timezone).hour
}

/**
 * 根据小时解析中文时段与 AM/PM
 * @param hour 0-23 小时
 * @returns 时段文案
 */
export function ResolveDayPeriod(hour: number): { periodLabel: string; ampm: string } {
  const ampm = hour < 12 ? '上午' : '下午'
  let periodLabel = '晚上'
  if (hour >= 0 && hour < 5) {
    periodLabel = '凌晨'
  } else if (hour >= 5 && hour < 8) {
    periodLabel = '清晨'
  } else if (hour >= 8 && hour < 12) {
    periodLabel = '上午'
  } else if (hour === 12) {
    periodLabel = '中午'
  } else if (hour > 12 && hour < 18) {
    periodLabel = '下午'
  } else if (hour >= 18 && hour < 20) {
    periodLabel = '傍晚'
  } else {
    periodLabel = '晚上'
  }
  return { periodLabel, ampm }
}

/**
 * 生成 12 小时制时间文案
 * @param hour 0-23
 * @param minute 分钟
 * @param second 秒
 * @param ampm 上午/下午
 * @returns 如 02:30:15 下午
 */
export function FormatTime12Text(
  hour: number,
  minute: number,
  second: number,
  ampm: string
): string {
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  const Pad = (value: number) => String(value).padStart(2, '0')
  return `${Pad(hour12)}:${Pad(minute)}:${Pad(second)} ${ampm}`
}

/**
 * 计算表盘指针角度
 * @param hour 0-23
 * @param minute 分钟
 * @param second 秒
 * @returns 时分秒角度
 */
export function ResolveClockHandDegrees(
  hour: number,
  minute: number,
  second: number
): { hourDeg: number; minuteDeg: number; secondDeg: number } {
  return {
    hourDeg: (hour % 12) * 30 + minute * 0.5 + second * (0.5 / 60),
    minuteDeg: minute * 6 + second * 0.1,
    secondDeg: second * 6,
  }
}

/**
 * 生成单个城市当前时间卡片数据
 * @param option 时区选项
 * @param ms 当前毫秒
 * @returns 卡片数据
 */
export function BuildWorldClockItem(option: TimezoneOption, ms: number): WorldClockItem {
  const full = FormatDateTimeInTimezone(ms, option.value)
  const [dateText = '', timeText = ''] = full.split(' ')
  const { hour, minute, second } = ResolveClockPartsInTimezone(ms, option.value)
  const { periodLabel, ampm } = ResolveDayPeriod(hour)
  const { hourDeg, minuteDeg, secondDeg } = ResolveClockHandDegrees(hour, minute, second)
  return {
    timezone: option.value,
    country: option.country,
    label: option.label,
    region: option.region,
    dateText,
    timeText,
    time12Text: FormatTime12Text(hour, minute, second, ampm),
    weekdayText: FormatWeekdayInTimezone(ms, option.value),
    offsetText: ResolveTimezoneOffsetText(option.value, ms),
    periodLabel,
    ampm,
    hour,
    minute,
    second,
    hourDeg,
    minuteDeg,
    secondDeg,
    isDaytime: hour >= 6 && hour < 18,
  }
}

/**
 * 批量生成世界时钟列表
 * @param options 时区选项
 * @param ms 当前毫秒
 * @returns 卡片列表
 */
export function BuildWorldClockList(
  options: TimezoneOption[],
  ms = Date.now()
): WorldClockItem[] {
  return options.map((option) => BuildWorldClockItem(option, ms))
}

/**
 * 按关键词与大洲筛选时区
 * @param options 全部选项
 * @param keyword 搜索词
 * @param region 大洲；空或「全部」不过滤
 * @returns 筛选结果
 */
export function FilterWorldClockOptions(
  options: TimezoneOption[],
  keyword: string,
  region: string
): TimezoneOption[] {
  const key = keyword.trim().toLowerCase()
  return options.filter((item) => {
    if (region && region !== '全部' && item.region !== region) {
      return false
    }
    if (!key) {
      return true
    }
    const haystack = `${item.country} ${item.label} ${item.value} ${item.region}`.toLowerCase()
    return haystack.includes(key)
  })
}

/**
 * 读取收藏时区
 * @returns 时区 id 列表
 */
export function LoadWorldClockFavorites(): string[] {
  try {
    const raw = localStorage.getItem(WORLD_CLOCK_FAVORITES_KEY)
    if (!raw) {
      return ['Asia/Shanghai', 'Africa/Lagos', 'Africa/Accra', 'Africa/Nairobi', 'UTC']
    }
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return ['Asia/Shanghai']
  }
}

/**
 * 保存收藏时区
 * @param favorites 时区 id 列表
 */
export function SaveWorldClockFavorites(favorites: string[]) {
  localStorage.setItem(WORLD_CLOCK_FAVORITES_KEY, JSON.stringify(favorites))
}

/**
 * 切换收藏
 * @param favorites 当前列表
 * @param timezone 时区
 * @returns 新列表
 */
export function ToggleWorldClockFavorite(favorites: string[], timezone: string): string[] {
  if (favorites.includes(timezone)) {
    return favorites.filter((item) => item !== timezone)
  }
  return [timezone, ...favorites]
}
