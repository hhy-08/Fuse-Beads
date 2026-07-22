<template>
  <div class="about-page">
    <header class="about-hero">
      <p class="brand">Fuse Beads</p>
      <h1>关于本项目</h1>
      <nav class="nav">
        <router-link to="/">返回生成器</router-link>
      </nav>
    </header>

    <section class="about-content">
      <p>基于 Vue 3 + Vite 的拼豆豆图纸生成器。</p>
      <p>工程结构参考 ilot-h5 项目，接入 Vue Router 与 Vuex（含 session 持久化）。</p>
      <ul>
        <li>可切换中英文字体采样</li>
        <li>文字转拼豆 / 图片转拼豆双模式</li>
        <li>字间距（可负值叠连）、逐字颜色/字号/加粗倾斜下划线/垂直对齐</li>
        <li>方格像素图纸（非圆形珠）</li>
        <li>MARD 色卡选择珠子/描边颜色</li>
        <li>整块图案外轮廓描边豆（可拼）</li>
        <li>Canvas 预览与 PNG 导出</li>
      </ul>
    </section>
  </div>
</template>

<script lang="ts">
/**
 * 关于页
 * 使用 Options API 展示项目说明
 */
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'AboutView',
  /**
   * 挂载时同步页面标题到 store
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', '拼豆豆图纸生成器')
  },
})
</script>

<style scoped>
.about-page {
  min-height: 100vh;
}

.about-hero {
  padding: 48px 6vw 28px;
  background: linear-gradient(145deg, #1d2a44 0%, #31486f 48%, #4d6d9a 100%);
  color: #fff8ef;
}

.brand {
  margin: 0;
  font-family: 'ZCOOL KuaiLe', cursive;
  font-size: 2.4rem;
}

.about-hero h1 {
  margin: 8px 0 16px;
  font-size: 1.5rem;
}

.nav a {
  color: #fff8ef;
  text-decoration: none;
  border: 1px solid rgba(255, 248, 239, 0.4);
  border-radius: 999px;
  padding: 8px 14px;
}

.about-content {
  padding: 32px 6vw;
  max-width: 720px;
  color: #31415f;
  line-height: 1.7;
}

.about-content ul {
  padding-left: 1.2em;
}
</style>
