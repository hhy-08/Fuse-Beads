<template>
  <div class="about-page">
    <header class="about-hero">
      <p class="brand">{{ appBrand }}</p>
      <h1>关于 Fuse 工具箱</h1>
      <nav class="nav">
        <router-link to="/">工具列表</router-link>
        <router-link to="/generator">拼豆工具</router-link>
      </nav>
    </header>

    <section class="about-content">
      <p>
        Fuse 工具箱（Fuse Kit）是一套基于 Vue 3 + Vite 的本地实用小工具集合，
        可在浏览器内完成常见处理，无需上传服务器。
      </p>
      <p>工程结构参考 ilot-h5，接入 Vue Router 与 Vuex（含 session 持久化）。</p>
      <ul>
        <li>拼豆工具：文字/图片转拼豆图纸，MARD 色卡与 PNG 导出</li>
        <li>图片压缩：多图压缩、质量与尺寸调节、ZIP 打包</li>
        <li>图片水印：批量加水印，支持平铺、旋转与拖动</li>
        <li>图片格式转换：JPEG / PNG / WebP / GIF 互转</li>
        <li>文件转换：PDF→PNG/JPG/TXT，DOCX/XLSX/CSV/JSON 等纯前端处理</li>
        <li>单位转换：长度、重量、面积、体积、温度换算</li>
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
import { APPBRAND, APPNAME } from '@/utils/Brand'

export default defineComponent({
  name: 'AboutView',
  data() {
    return {
      appBrand: APPBRAND,
    }
  },
  /**
   * 挂载时同步页面标题到 store
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', `关于${APPNAME}`)
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

.nav {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
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
