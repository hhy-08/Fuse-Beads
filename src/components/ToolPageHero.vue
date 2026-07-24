<template>
  <header class="hero">
    <div class="hero-copy">
      <p class="brand">{{ appBrand }}</p>
      <h1>{{ title }}</h1>
      <p class="subtitle">{{ subtitle }}</p>
    </div>
    <nav class="hero-nav">
      <router-link v-for="link in resolvedLinks" :key="link.to" :to="link.to">
        {{ link.label }}
      </router-link>
    </nav>
  </header>
</template>

<script lang="ts">
/**
 * 工具页顶部 Hero：品牌、标题、副标题与导航
 */
import { defineComponent, type PropType } from 'vue'
import { APPBRAND } from '@/utils/Brand'

/** 导航链接 */
export type ToolPageHeroLink = {
  to: string
  label: string
}

const DEFAULTLINKS: ToolPageHeroLink[] = [
  { to: '/', label: '工具列表' },
  { to: '/about', label: '关于' },
]

export default defineComponent({
  name: 'ToolPageHero',
  props: {
    /** 页面标题 */
    title: {
      type: String,
      required: true,
    },
    /** 页面副标题 */
    subtitle: {
      type: String,
      required: true,
    },
    /** 右侧导航；默认「工具列表」「关于」 */
    links: {
      type: Array as PropType<ToolPageHeroLink[]>,
      default: undefined,
    },
  },
  data() {
    return {
      appBrand: APPBRAND,
    }
  },
  computed: {
    /**
     * 解析导航链接（未传则用默认）
     * @returns 链接列表
     */
    resolvedLinks(): ToolPageHeroLink[] {
      return this.links?.length ? this.links : DEFAULTLINKS
    },
  },
})
</script>

<style scoped>
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

@media (max-width: 900px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
