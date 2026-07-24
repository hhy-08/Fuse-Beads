<template>
  <div class="clock-page">
    <header class="hero">
      <div class="hero-copy">
        <p class="brand">{{ appBrand }}</p>
        <h1>世界时钟（各国时间）</h1>
        <p class="subtitle">
          实时查看各国当前时间，含模拟表盘与上午/下午等时段，支持按大洲筛选、搜索与收藏
        </p>
      </div>
      <nav class="hero-nav">
        <router-link to="/">工具列表</router-link>
        <router-link to="/timestamp-converter">时间戳转换</router-link>
        <router-link to="/about">关于</router-link>
      </nav>
    </header>

    <main class="workspace">
      <section class="toolbar-card">
        <div class="search-box">
          <input
            class="search-input"
            type="search"
            :value="keyword"
            placeholder="搜索国家 / 城市 / 时区，如 尼日利亚、Lagos、UTC"
            @input="HandleKeywordInput"
          />
        </div>
        <div class="region-tabs">
          <button
            v-for="region in regionTabs"
            :key="region"
            type="button"
            class="chip"
            :class="{ active: selectedRegion === region }"
            @click="HandleSelectRegion(region)"
          >
            {{ region }}
          </button>
        </div>
        <p class="toolbar-meta">
          本地刷新：{{ localNowText }} · 共 {{ visibleClocks.length }} 个时区
          <template v-if="favorites.length"> · 已收藏 {{ favorites.length }}</template>
        </p>
      </section>

      <section v-if="favoriteClocks.length" class="clock-section">
        <header class="section-head">
          <h2>我的收藏</h2>
        </header>
        <div class="clock-grid">
          <WorldClockCard
            v-for="item in favoriteClocks"
            :key="`fav-${item.timezone}`"
            :item="item"
            :is-favorite="true"
            @ToggleFavorite="HandleToggleFavorite"
            @Copy="HandleCopy"
          />
        </div>
      </section>

      <section
        v-for="group in groupedVisibleClocks"
        :key="group.region"
        class="clock-section"
      >
        <header class="section-head">
          <h2>{{ group.region }}</h2>
          <span class="count">{{ group.items.length }}</span>
        </header>
        <div class="clock-grid">
          <WorldClockCard
            v-for="item in group.items"
            :key="item.timezone"
            :item="item"
            :is-favorite="IsFavorite(item.timezone)"
            @ToggleFavorite="HandleToggleFavorite"
            @Copy="HandleCopy"
          />
        </div>
      </section>

      <p v-if="!visibleClocks.length" class="empty-tip">没有匹配的国家或时区，试试换个关键词</p>
      <p v-if="statusText" class="status ok">{{ statusText }}</p>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 世界时钟（各国时间）工具页
 * 实时展示多国当地时间，含模拟表盘与时段，支持筛选、搜索与收藏
 */
import { defineComponent } from 'vue'
import { APPBRAND } from '@/utils/Brand'
import {
  BuildWorldClockItem,
  BuildWorldClockList,
  FilterWorldClockOptions,
  GetWorldClockTimezones,
  LoadWorldClockFavorites,
  SaveWorldClockFavorites,
  ToggleWorldClockFavorite,
  type WorldClockItem,
} from '@/utils/WorldClock'
import { FormatDateTimeInTimezone, type TimezoneOption } from '@/utils/TimestampConverter'
import WorldClockCard from './WorldClockCard.vue'

type ClockGroup = {
  region: string
  items: WorldClockItem[]
}

export default defineComponent({
  name: 'WorldClockView',
  components: {
    WorldClockCard,
  },
  data() {
    return {
      appBrand: APPBRAND,
      allTimezones: GetWorldClockTimezones() as TimezoneOption[],
      keyword: '',
      selectedRegion: '全部',
      nowMs: Date.now(),
      favorites: [] as string[],
      statusText: '',
      timer: null as ReturnType<typeof setInterval> | null,
      statusTimer: null as ReturnType<typeof setTimeout> | null,
    }
  },
  computed: {
    /**
     * 大洲筛选项
     * @returns 标签
     */
    regionTabs(): string[] {
      const regions = Array.from(new Set(this.allTimezones.map((item) => item.region)))
      return ['全部', ...regions]
    },
    /**
     * 本地当前时间文案
     * @returns 文案
     */
    localNowText(): string {
      return FormatDateTimeInTimezone(this.nowMs, Intl.DateTimeFormat().resolvedOptions().timeZone)
    },
    /**
     * 筛选后的时区选项
     * @returns 选项
     */
    filteredOptions(): TimezoneOption[] {
      return FilterWorldClockOptions(this.allTimezones, this.keyword, this.selectedRegion)
    },
    /**
     * 可见时钟卡片
     * @returns 卡片
     */
    visibleClocks(): WorldClockItem[] {
      return BuildWorldClockList(this.filteredOptions, this.nowMs)
    },
    /**
     * 收藏时钟（始终展示，不受筛选影响时也更新时间）
     * @returns 卡片
     */
    favoriteClocks(): WorldClockItem[] {
      const map = new Map(this.allTimezones.map((item) => [item.value, item]))
      return this.favorites
        .map((timezone) => map.get(timezone))
        .filter((item): item is TimezoneOption => Boolean(item))
        .map((item) => BuildWorldClockItem(item, this.nowMs))
    },
    /**
     * 按大洲分组的可见时钟
     * @returns 分组
     */
    groupedVisibleClocks(): ClockGroup[] {
      const regionOrder = this.regionTabs.filter((item) => item !== '全部')
      return regionOrder
        .map((region) => ({
          region,
          items: this.visibleClocks.filter((item) => item.region === region),
        }))
        .filter((group) => group.items.length > 0)
    },
  },
  /**
   * 挂载：读收藏并启动秒级刷新
   */
  mounted() {
    this.favorites = LoadWorldClockFavorites()
    this.timer = setInterval(() => {
      this.nowMs = Date.now()
    }, 1000)
  },
  beforeUnmount() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.statusTimer) {
      clearTimeout(this.statusTimer)
      this.statusTimer = null
    }
  },
  methods: {
    /**
     * 是否已收藏
     * @param timezone 时区
     * @returns 布尔
     */
    IsFavorite(timezone: string): boolean {
      return this.favorites.includes(timezone)
    },
    /**
     * 搜索输入
     * @param event 输入事件
     */
    HandleKeywordInput(event: Event) {
      this.keyword = (event.target as HTMLInputElement).value
    },
    /**
     * 切换大洲筛选
     * @param region 大洲
     */
    HandleSelectRegion(region: string) {
      this.selectedRegion = region
    },
    /**
     * 切换收藏
     * @param timezone 时区
     */
    HandleToggleFavorite(timezone: string) {
      this.favorites = ToggleWorldClockFavorite(this.favorites, timezone)
      SaveWorldClockFavorites(this.favorites)
      this.FlashStatus(this.IsFavorite(timezone) ? '已加入收藏' : '已取消收藏')
    },
    /**
     * 短暂状态提示
     * @param text 文案
     */
    FlashStatus(text: string) {
      this.statusText = text
      if (this.statusTimer) {
        clearTimeout(this.statusTimer)
      }
      this.statusTimer = setTimeout(() => {
        this.statusText = ''
        this.statusTimer = null
      }, 1600)
    },
    /**
     * 复制文案
     * @param text 文案
     */
    async HandleCopy(text: string) {
      try {
        await navigator.clipboard.writeText(text)
        this.FlashStatus('已复制到剪贴板')
      } catch {
        this.FlashStatus('复制失败')
      }
    },
  },
})
</script>

<style scoped>
.clock-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.hero {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 48px 6vw 36px;
  background:
    radial-gradient(circle at 18% 20%, rgba(255, 196, 92, 0.45), transparent 42%),
    radial-gradient(circle at 82% 10%, rgba(84, 148, 255, 0.35), transparent 40%),
    linear-gradient(145deg, #1d2a44 0%, #31486f 48%, #4d6d9a 100%);
  overflow: hidden;
}

.hero-copy {
  position: relative;
  z-index: 1;
  color: #fff8ef;
}

.brand {
  margin: 0 0 8px;
  font-family: 'ZCOOL KuaiLe', cursive;
  font-size: clamp(2.2rem, 5vw, 3.4rem);
  line-height: 1;
}

.hero h1 {
  margin: 0;
  font-size: clamp(1.3rem, 2.4vw, 1.8rem);
}

.subtitle {
  margin: 10px 0 0;
  opacity: 0.88;
  max-width: 42rem;
  line-height: 1.5;
}

.hero-nav {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 12px;
  align-self: flex-start;
  flex-wrap: wrap;
}

.hero-nav a {
  color: #fff8ef;
  text-decoration: none;
  padding: 8px 14px;
  border: 1px solid rgba(255, 248, 239, 0.35);
  border-radius: 999px;
  font-size: 0.9rem;
}

.hero-nav a:hover,
.hero-nav a.router-link-active {
  background: rgba(255, 248, 239, 0.16);
  border-color: rgba(255, 248, 239, 0.7);
}

.workspace {
  flex: 1;
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: 28px 6vw 48px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.toolbar-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(49, 65, 95, 0.1);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-input {
  width: 100%;
  border: 1px solid rgba(49, 65, 95, 0.2);
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
  box-sizing: border-box;
  background: #fff;
  color: #1f2a3d;
}

.region-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  border: 1px solid rgba(49, 65, 95, 0.22);
  background: #fff;
  color: #31415f;
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  font: inherit;
  font-size: 0.86rem;
}

.chip.active {
  background: #31486f;
  border-color: #31486f;
  color: #fff8ef;
}

.toolbar-meta {
  margin: 0;
  color: #6a7a94;
  font-size: 0.86rem;
}

.clock-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-head h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #1f2a3d;
}

.count {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(49, 72, 111, 0.1);
  color: #31486f;
  font-size: 0.78rem;
}

.clock-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.empty-tip,
.status {
  margin: 0;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 0.9rem;
}

.empty-tip {
  background: rgba(49, 72, 111, 0.06);
  color: #6a7a94;
}

.status.ok {
  background: rgba(46, 125, 90, 0.1);
  color: #1f6b4a;
}

@media (max-width: 700px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
