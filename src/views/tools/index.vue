<template>
  <div class="tools-page">
    <header class="hero">
      <div class="hero-copy">
        <p class="brand">{{ appBrand }}</p>
        <h1>工具箱</h1>
        <p class="subtitle">{{ appDescription }}</p>
      </div>
      <nav class="hero-nav">
        <router-link to="/about">关于</router-link>
      </nav>
    </header>

    <main class="tools-main">
      <section
        v-for="(group, groupIndex) in toolGroups"
        :key="group.category.id"
        class="tool-group"
      >
        <header class="group-header">
          <div>
            <h2>{{ group.category.name }}</h2>
            <p>{{ group.category.description }}</p>
          </div>
          <span class="group-count">{{ group.tools.length }} 个工具</span>
        </header>

        <ul class="tool-list">
          <li v-for="(tool, index) in group.tools" :key="tool.id">
            <router-link
              v-if="tool.available && tool.path"
              :to="tool.path"
              class="tool-card"
              :style="{ animationDelay: `${0.06 * (groupIndex * 4 + index)}s` }"
            >
              <div class="tool-head">
                <h3>{{ tool.name }}</h3>
                <span class="badge">{{ tool.badge }}</span>
              </div>
              <p>{{ tool.description }}</p>
              <span class="tool-action">进入工具</span>
            </router-link>

            <div
              v-else
              class="tool-card disabled"
              :style="{ animationDelay: `${0.06 * (groupIndex * 4 + index)}s` }"
            >
              <div class="tool-head">
                <h3>{{ tool.name }}</h3>
                <span class="badge muted">{{ tool.badge }}</span>
              </div>
              <p>{{ tool.description }}</p>
              <span class="tool-action">敬请期待</span>
            </div>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 工具列表首页
 * 按分类展示可用工具入口
 */
import { defineComponent } from 'vue'
import { APPBRAND, APPDESCRIPTION, APPNAME } from '@/utils/Brand'
import { GetGroupedToolList } from '@/utils/ToolList'

export default defineComponent({
  name: 'ToolsView',
  data() {
    return {
      appBrand: APPBRAND,
      appDescription: APPDESCRIPTION,
      toolGroups: GetGroupedToolList(),
    }
  },
  /**
   * 挂载时同步页面标题
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', APPNAME)
  },
})
</script>

<style scoped>
.tools-page {
  min-height: 100vh;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    radial-gradient(900px 420px at 12% -8%, rgba(84, 148, 255, 0.1), transparent 55%),
    linear-gradient(180deg, #f4f7fb 0%, #e8eef6 100%);
}

.hero {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 36px 6vw 28px;
  background:
    radial-gradient(circle at 18% 20%, rgba(255, 196, 92, 0.45), transparent 42%),
    radial-gradient(circle at 82% 10%, rgba(84, 148, 255, 0.35), transparent 40%),
    linear-gradient(145deg, #1d2a44 0%, #31486f 48%, #4d6d9a 100%);
  overflow: hidden;
}

.hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.18) 1.2px, transparent 1.2px);
  background-size: 18px 18px;
  opacity: 0.35;
  pointer-events: none;
  animation: drift 18s linear infinite;
}

.hero-copy {
  position: relative;
  z-index: 1;
  color: #fff8ef;
  max-width: 720px;
}

.brand {
  margin: 0 0 8px;
  font-family: 'ZCOOL KuaiLe', cursive;
  font-size: clamp(2.4rem, 6vw, 4rem);
  letter-spacing: 0.04em;
  line-height: 1;
  animation: riseIn 0.7s ease both;
}

.hero h1 {
  margin: 0;
  font-size: clamp(1.35rem, 2.6vw, 1.9rem);
  font-weight: 700;
  animation: riseIn 0.8s ease 0.08s both;
}

.subtitle {
  margin: 12px 0 0;
  font-size: 1rem;
  opacity: 0.88;
  animation: riseIn 0.8s ease 0.16s both;
}

.hero-nav {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 12px;
  align-self: flex-start;
}

.hero-nav a {
  color: #fff8ef;
  text-decoration: none;
  padding: 8px 14px;
  border: 1px solid rgba(255, 248, 239, 0.35);
  border-radius: 999px;
  font-size: 0.9rem;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.hero-nav a:hover {
  background: rgba(255, 248, 239, 0.16);
  border-color: rgba(255, 248, 239, 0.7);
}

.tools-main {
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 24px 20px 28px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 28px;
  overflow: auto;
}

.tool-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.group-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(49, 65, 95, 0.12);
}

.group-header h2 {
  margin: 0;
  font-size: clamp(1.2rem, 2.2vw, 1.45rem);
  color: #1d2a44;
}

.group-header p {
  margin: 6px 0 0;
  color: #5a6a84;
  font-size: 0.92rem;
  line-height: 1.5;
  max-width: 40rem;
}

.group-count {
  flex-shrink: 0;
  font-size: 0.82rem;
  color: #6a7a96;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(49, 65, 95, 0.06);
}

.tool-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.tool-card {
  width: 100%;
  text-align: left;
  text-decoration: none;
  border: 1px solid rgba(49, 65, 95, 0.12);
  border-radius: 18px;
  padding: 22px 22px 18px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  color: #1f2a3d;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 180px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  animation: riseIn 0.55s ease both;
  box-sizing: border-box;
}

.tool-card:hover:not(.disabled) {
  transform: translateY(-3px);
  border-color: rgba(49, 109, 186, 0.35);
  box-shadow: 0 14px 28px rgba(29, 42, 68, 0.12);
}

.tool-card.disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.tool-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.tool-head h3 {
  margin: 0;
  font-size: 1.2rem;
}

.badge {
  flex-shrink: 0;
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(46, 125, 90, 0.12);
  color: #1f6b4a;
}

.badge.muted {
  background: rgba(49, 65, 95, 0.1);
  color: #5a6a84;
}

.tool-card p {
  margin: 0;
  flex: 1;
  line-height: 1.6;
  color: #4a5a76;
  font-size: 0.95rem;
}

.tool-action {
  font-size: 0.9rem;
  font-weight: 600;
  color: #2f5f9f;
}

.tool-card.disabled .tool-action {
  color: #7a879c;
}

@keyframes riseIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes drift {
  from {
    background-position: 0 0;
  }
  to {
    background-position: 72px 36px;
  }
}

@media (max-width: 700px) {
  .tools-page {
    height: auto;
    min-height: 100vh;
    overflow: auto;
  }

  .hero {
    flex-direction: column;
    align-items: flex-start;
    padding-top: 36px;
  }

  .tools-main {
    overflow: visible;
  }

  .group-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
