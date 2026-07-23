<template>
  <div class="join-page">
    <header class="hero">
      <div class="hero-copy">
        <p class="brand">{{ appBrand }}</p>
        <h1>长图拼接 / 图片分割</h1>
        <p class="subtitle">
          多张图拼接成长图，或均等 / 自由分割大图，全部本地完成
        </p>
      </div>
      <nav class="hero-nav">
        <router-link to="/">工具列表</router-link>
        <router-link to="/about">关于</router-link>
      </nav>
    </header>

    <main class="workspace">
      <section class="mode-tabs">
        <button
          type="button"
          class="tab"
          :class="{ active: mode === 'stitch' }"
          @click="HandleModeChange('stitch')"
        >
          图片拼接
        </button>
        <button
          type="button"
          class="tab"
          :class="{ active: mode === 'split' }"
          @click="HandleModeChange('split')"
        >
          均等分割
        </button>
        <button
          type="button"
          class="tab"
          :class="{ active: mode === 'freeSplit' }"
          @click="HandleModeChange('freeSplit')"
        >
          自由分割
        </button>
      </section>

      <section
        class="upload-area"
        :class="{ dragging: isDragging }"
        @dragenter.prevent="HandleDragEnter"
        @dragover.prevent="HandleDragOver"
        @dragleave.prevent="HandleDragLeave"
        @drop.prevent="HandleDrop"
      >
        <label class="upload-label">
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            :multiple="mode === 'stitch'"
            hidden
            @change="HandleInputChange"
          />
          <span class="upload-title">
            {{
              mode === 'stitch'
                ? '拖拽多张图片到此处，或点击选择'
                : '拖拽一张大图到此处，或点击选择'
            }}
          </span>
          <span class="upload-tip">
            支持 JPG / PNG / WebP / GIF；单文件 ≤ 50MB
            {{ mode === 'stitch' ? '；可多选，支持自动网格或自由拖放摆放' : '' }}
          </span>
        </label>
      </section>

      <StitchPanel
        v-if="mode === 'stitch'"
        ref="stitchPanelRef"
        @status="HandleChildStatus"
        @busy="HandleChildBusy"
      />

      <template v-if="isSplitView && splitItem">
        <SplitOptionsPanel
          :mode="mode === 'freeSplit' ? 'freeSplit' : 'split'"
          :split-item="splitItem"
          v-model:split-rows="splitRows"
          v-model:split-cols="splitCols"
          v-model:free-cut-tool="freeCutTool"
          v-model:free-cuts="freeCuts"
          v-model:cut-line-color="cutLineColor"
          :is-busy="isBusy"
          @clear="HandleClear"
          @status="HandleChildStatus"
          @busy="HandleChildBusy"
        />
        <SplitPreviewPanel
          :mode="mode === 'freeSplit' ? 'freeSplit' : 'split'"
          :split-item="splitItem"
          :split-rows="splitRows"
          :split-cols="splitCols"
          v-model:free-cuts="freeCuts"
          :free-cut-tool="freeCutTool"
          :cut-line-color="cutLineColor"
        />
      </template>

      <p v-if="statusText" class="status" :class="{ error: hasError }">
        {{ statusText }}
      </p>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 长图拼接 / 图片分割工具页
 * 负责模式切换、上传与状态；拼接 / 分割 UI 拆至子组件
 */
import { defineComponent } from 'vue'
import { APPBRAND } from '@/utils/Brand'
import {
  LoadImageItemFromFile,
  RevokeImageItem,
  type FreeCutSegment,
  type LoadedImageItem,
  type StitchAlign,
} from '@/utils/ImageJoin'
import StitchPanel, { type StitchItem } from './components/StitchPanel.vue'
import SplitOptionsPanel from './components/SplitOptionsPanel.vue'
import SplitPreviewPanel from './components/SplitPreviewPanel.vue'

const MAX_FILE_SIZE = 50 * 1024 * 1024

type ToolMode = 'stitch' | 'split' | 'freeSplit'
type FreeCutTool = 'vertical' | 'horizontal'

export default defineComponent({
  name: 'ImageJoinView',
  components: {
    StitchPanel,
    SplitOptionsPanel,
    SplitPreviewPanel,
  },
  data() {
    return {
      appBrand: APPBRAND,
      mode: 'stitch' as ToolMode,
      isDragging: false,
      isBusy: false,
      statusText: '',
      hasError: false,
      splitItem: null as LoadedImageItem | null,
      splitRows: 2,
      splitCols: 2,
      freeCutTool: 'vertical' as FreeCutTool,
      freeCuts: [] as FreeCutSegment[],
      cutLineColor: '#00e5ff',
    }
  },
  computed: {
    /**
     * 是否处于分割相关视图
     * @returns 分割模式为 true
     */
    isSplitView(): boolean {
      return this.mode === 'split' || this.mode === 'freeSplit'
    },
  },
  /**
   * 挂载时同步标题
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', '长图拼接 / 图片分割')
  },
  /**
   * 卸载释放资源
   */
  beforeUnmount() {
    this.HandleClear()
  },
  methods: {
    /**
     * 设置状态文案
     * @param text 文案
     * @param isError 是否错误
     */
    SetStatus(text: string, isError = false) {
      this.statusText = text
      this.hasError = isError
    },
    /**
     * 子组件状态回调
     * @param text 文案
     * @param isError 是否错误
     */
    HandleChildStatus(text: string, isError = false) {
      this.SetStatus(text, isError)
    },
    /**
     * 子组件忙碌回调
     * @param value 是否忙碌
     */
    HandleChildBusy(value: boolean) {
      this.isBusy = value
    },
    /**
     * 获取拼接面板实例
     * @returns 面板实例或 null
     */
    GetStitchPanel():
      | {
          AppendItems: (items: StitchItem[]) => Promise<void> | void
          Clear: () => void
          HasItems: () => boolean
        }
      | null {
      return (this.$refs.stitchPanelRef as any) || null
    },
    /**
     * 切换拼接/分割
     * @param mode 模式
     */
    HandleModeChange(mode: ToolMode) {
      if (this.mode === mode) {
        return
      }
      this.mode = mode
      this.HandleClear()
      if (mode === 'stitch') {
        this.SetStatus('已切换到图片拼接（自动网格或自由拖放）')
      } else if (mode === 'freeSplit') {
        this.SetStatus('已切换到自由分割（点击添加，拖端点可只切上半部分）')
      } else {
        this.SetStatus('已切换到均等分割（请上传单张大图）')
      }
    },
    /**
     * 拖拽进入
     */
    HandleDragEnter() {
      this.isDragging = true
    },
    /**
     * 拖拽悬停
     */
    HandleDragOver() {
      this.isDragging = true
    },
    /**
     * 拖拽离开
     * @param event 拖拽事件
     */
    HandleDragLeave(event: DragEvent) {
      const current = event.currentTarget as HTMLElement
      const related = event.relatedTarget as Node | null
      if (related && current.contains(related)) {
        return
      }
      this.isDragging = false
    },
    /**
     * 放下文件
     * @param event 拖拽事件
     */
    async HandleDrop(event: DragEvent) {
      this.isDragging = false
      const files = Array.from(event.dataTransfer?.files || [])
      await this.AppendFiles(files)
    },
    /**
     * input 选文件
     * @param event 变更事件
     */
    async HandleInputChange(event: Event) {
      const target = event.target as HTMLInputElement
      const files = Array.from(target.files || [])
      target.value = ''
      await this.AppendFiles(files)
    },
    /**
     * 过滤并加载文件
     * @param files 原始文件
     */
    async AppendFiles(files: File[]) {
      const images = files.filter((file) => file.type.startsWith('image/'))
      if (!images.length) {
        this.SetStatus('请选择图片文件', true)
        return
      }

      const rejected: string[] = []
      const valid = images.filter((file) => {
        if (file.size > MAX_FILE_SIZE) {
          rejected.push(file.name)
          return false
        }
        return true
      })

      if (!valid.length) {
        this.SetStatus(`文件超过 50MB：${rejected.join('、')}`, true)
        return
      }

      try {
        this.isBusy = true
        if (this.mode === 'stitch') {
          const loaded: StitchItem[] = await Promise.all(
            valid.map(async (file) => {
              const item = await LoadImageItemFromFile(file)
              return {
                ...item,
                scale: 100,
                align: 'center' as StitchAlign,
                x: 0,
                y: 0,
              }
            }),
          )
          await this.$nextTick()
          const panel = this.GetStitchPanel()
          if (panel) {
            await panel.AppendItems(loaded)
          }
          const tip = rejected.length
            ? `已添加 ${loaded.length} 张；超限已过滤：${rejected.join('、')}`
            : `已添加 ${loaded.length} 张`
          this.SetStatus(tip, rejected.length > 0)
        } else {
          const file = valid[0]
          if (this.splitItem) {
            RevokeImageItem(this.splitItem)
          }
          this.splitItem = await LoadImageItemFromFile(file)
          this.freeCuts = []
          this.SetStatus(
            rejected.length
              ? `已加载；其余超限已忽略：${rejected.join('、')}`
              : this.mode === 'freeSplit'
                ? '图片已加载，点击预览添加切线'
                : '图片已加载，设置行列后分割',
            rejected.length > 0,
          )
        }
      } catch (error) {
        this.SetStatus(
          error instanceof Error ? error.message : '加载失败',
          true,
        )
      } finally {
        this.isBusy = false
      }
    },
    /**
     * 清空当前模式数据
     */
    HandleClear() {
      const panel = this.GetStitchPanel()
      if (panel) {
        panel.Clear()
      }
      if (this.splitItem) {
        RevokeImageItem(this.splitItem)
        this.splitItem = null
      }
      this.freeCuts = []
      this.SetStatus('')
    },
  },
})
</script>

<style scoped>
.join-page {
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
}

.hero-nav a:hover,
.hero-nav a.router-link-active {
  background: rgba(255, 248, 239, 0.16);
  border-color: rgba(255, 248, 239, 0.7);
}

.workspace {
  flex: 1;
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: 28px 6vw 48px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.mode-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tab {
  border: 1px solid rgba(49, 65, 95, 0.22);
  background: #fff;
  color: #31415f;
  border-radius: 999px;
  padding: 8px 16px;
  cursor: pointer;
  font: inherit;
  font-size: 0.92rem;
}

.tab.active {
  background: #31486f;
  border-color: #31486f;
  color: #fff8ef;
}

.upload-area {
  border: 1.5px dashed rgba(49, 65, 95, 0.28);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
  transition: border-color 0.2s ease, background 0.2s ease;
}

.upload-area.dragging {
  border-color: #3d6eb0;
  background: rgba(84, 148, 255, 0.12);
}

.upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 160px;
  padding: 28px 20px;
  cursor: pointer;
  text-align: center;
}

.upload-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: #1f2a3d;
}

.upload-tip {
  color: #6a7a94;
  font-size: 0.9rem;
  line-height: 1.5;
}

.status {
  margin: 0;
  color: #4a5a76;
  font-size: 0.9rem;
}

.status.error {
  color: #9f2f2f;
}

@media (max-width: 800px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
