<template>
  <div class="pdf-home">
    <ToolPageHero title="PDF 工具站" subtitle="合并、拆分、旋转、水印与图片转 PDF 已上云；Word↔PDF / 加密需后续启用 Containers" />

    <main class="workspace">
      <p class="api-tip" :class="{ ok: apiOnline, warn: !apiOnline && hasApi }">
        <template v-if="!hasApi">
          未启用 API。生产环境请留空 VITE_API_BASE_URL（走同源 /api）；开发可指向本地 Worker。
        </template>
        <template v-else-if="apiOnline">
          后端已连接{{ apiRoot ? `：${apiRoot}` : '（同源 /api）' }}
        </template>
        <template v-else>
          {{
            apiRoot
              ? `已配置 ${apiRoot}，但健康检查未通过。`
              : '同源 /api 健康检查未通过（请确认 Pages 已绑定 PDF_API → fuse-pdf-api，并重新部署）。'
          }}
        </template>
      </p>

      <div class="filters">
        <button
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          class="filter"
          :class="{ active: activeCategory === cat.id }"
          @click="activeCategory = cat.id"
        >
          {{ cat.name }}
        </button>
      </div>

      <section class="tool-grid">
        <router-link
          v-for="tool in filteredTools"
          :key="tool.id"
          class="tool-card"
          :class="{ disabled: !tool.available }"
          :to="tool.available ? `/pdf-tools/${tool.id}` : ''"
          @click="HandleCardClick($event, tool)"
        >
          <span class="badge" :class="tool.available ? 'on' : 'off'">{{ tool.badge }}</span>
          <h2>{{ tool.name }}</h2>
          <p>{{ tool.description }}</p>
        </router-link>
      </section>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * PDF 工具站首页 —— 卡片网格入口
 */
import { defineComponent } from 'vue'
import {
  FilterPdfTools,
  GetPdfToolCategories,
  type PdfToolCategory,
  type PdfToolItem,
} from '@/utils/pdfTools/PdfToolList'
import ToolPageHero from '@/components/ToolPageHero.vue'
import {
  HasPdfApi,
  PingPdfApi,
  ResolvePdfApiRoot,
} from '@/utils/pdfTools/PdfApi'

export default defineComponent({
  name: 'PdfToolsHome',
  components: {
    ToolPageHero,
  },
  data() {
    return {
      categories: GetPdfToolCategories(),
      activeCategory: 'all' as PdfToolCategory | 'all',
      hasApi: HasPdfApi(),
      apiRoot: ResolvePdfApiRoot(),
      apiOnline: false,
    }
  },
  computed: {
    /**
     * 当前分类下的工具
     * @returns 工具列表
     */
    filteredTools(): PdfToolItem[] {
      return FilterPdfTools(this.activeCategory)
    },
  },
  async created() {
    if (this.hasApi) {
      this.apiOnline = await PingPdfApi()
    }
  },
  methods: {
    /**
     * 未上线工具阻止跳转
     * @param event 点击事件
     * @param tool 工具
     */
    HandleCardClick(event: Event, tool: PdfToolItem) {
      if (!tool.available) {
        event.preventDefault()
      }
    },
  },
})
</script>

<style scoped>
.pdf-home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(ellipse at 10% 0%, rgba(255, 186, 92, 0.18), transparent 42%),
    radial-gradient(ellipse at 90% 8%, rgba(72, 140, 255, 0.16), transparent 40%),
    linear-gradient(180deg, #f4f7fb 0%, #e8eef6 100%);
}

.workspace {
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 24px 6vw 56px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.api-tip {
  margin: 0;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(49, 65, 95, 0.12);
  color: #4a5a74;
  font-size: 0.9rem;
  line-height: 1.5;
}

.api-tip.ok {
  border-color: rgba(46, 140, 90, 0.35);
  color: #1f6b45;
}

.api-tip.warn {
  border-color: rgba(200, 140, 40, 0.4);
  color: #8a5a10;
}

.api-tip code {
  font-size: 0.85em;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter {
  border: 1px solid rgba(49, 65, 95, 0.16);
  background: rgba(255, 255, 255, 0.7);
  color: #31415f;
  border-radius: 999px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 0.9rem;
}

.filter.active {
  background: #31486f;
  border-color: #31486f;
  color: #fff8ef;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.tool-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px 16px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(49, 65, 95, 0.1);
  text-decoration: none;
  color: inherit;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  min-height: 132px;
}

.tool-card:hover:not(.disabled) {
  transform: translateY(-2px);
  border-color: rgba(61, 110, 176, 0.45);
  box-shadow: 0 10px 28px rgba(40, 60, 100, 0.1);
}

.tool-card.disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.tool-card h2 {
  margin: 0;
  font-size: 1.05rem;
  color: #1f2a3d;
}

.tool-card p {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.45;
  color: #6a7a94;
}

.badge {
  align-self: flex-start;
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 999px;
}

.badge.on {
  background: rgba(46, 140, 90, 0.14);
  color: #1f6b45;
}

.badge.off {
  background: rgba(106, 122, 148, 0.14);
  color: #6a7a94;
}

@media (max-width: 640px) {
  
}
</style>
