<template>
  <div class="scaler-page">
    <ToolPageHero
      title="像素图缩放"
      subtitle="最近邻插值无损放大像素图，避免普通放大模糊，适合拼豆素材预处理"
      :links="[{ to: '/', label: '工具列表' }, { to: '/pixel-editor', label: '像素画布' }, { to: '/generator', label: '拼豆工具' }]"
    />

    <main class="workspace">
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
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
            hidden
            @change="HandleFileSelect"
          />
          <span class="upload-title">点击或拖拽像素图到此处</span>
          <span class="upload-tip">建议使用 PNG；支持 JPG / WebP / GIF</span>
        </label>
      </section>

      <section v-if="sourceFile" class="panel options-panel">
        <div class="file-meta">
          <p class="file-name">{{ sourceFile.name }}</p>
          <p class="file-size">
            原图 {{ sourceWidth }} × {{ sourceHeight }} ·
            {{ FormatSize(sourceFile.size) }}
          </p>
          <button type="button" class="ghost-sm" @click="ClearSource">清除</button>
        </div>

        <div class="mode-tabs">
          <button
            type="button"
            class="mode-btn"
            :class="{ active: scaleMode === 'factor' }"
            @click="SetScaleMode('factor')"
          >
            整数倍放大
          </button>
          <button
            type="button"
            class="mode-btn"
            :class="{ active: scaleMode === 'size' }"
            @click="SetScaleMode('size')"
          >
            指定尺寸
          </button>
        </div>

        <template v-if="scaleMode === 'factor'">
          <div class="preset-row">
            <button
              v-for="item in factorPresets"
              :key="item"
              type="button"
              class="preset-btn"
              :class="{ active: factor === item }"
              @click="SetFactor(item)"
            >
              {{ item }}×
            </button>
          </div>
          <label class="field">
            <span>放大倍数 {{ factor }}×</span>
            <input
              v-model.number="factor"
              type="range"
              min="1"
              max="32"
              step="1"
              @input="SchedulePreview"
            />
          </label>
        </template>

        <template v-else>
          <div class="size-row">
            <label class="field">
              <span>目标宽度</span>
              <input
                v-model.number="targetWidth"
                type="number"
                min="1"
                max="4096"
                @input="SchedulePreview"
              />
            </label>
            <label class="field">
              <span>目标高度</span>
              <input
                v-model.number="targetHeight"
                type="number"
                min="1"
                max="4096"
                :disabled="keepAspect"
                @input="SchedulePreview"
              />
            </label>
          </div>
          <label class="check">
            <input v-model="keepAspect" type="checkbox" @change="HandleKeepAspect" />
            锁定宽高比
          </label>
        </template>

        <p class="result-size">
          输出尺寸：{{ outputWidth }} × {{ outputHeight }}
          <template v-if="scaleMode === 'factor'">（{{ factor }}× 最近邻）</template>
        </p>

        <div class="actions">
          <button type="button" class="ghost" :disabled="isBusy" @click="ClearSource">
            重置
          </button>
          <button
            type="button"
            class="ghost"
            :disabled="isBusy || !resultUrl"
            @click="SendToGenerator"
          >
            送到拼豆工具
          </button>
          <button
            type="button"
            class="primary"
            :disabled="isBusy || !resultUrl"
            @click="DownloadPng"
          >
            {{ isBusy ? '处理中…' : '导出 PNG' }}
          </button>
        </div>

        <p v-if="statusText" class="status" :class="{ error: hasError }">
          {{ statusText }}
        </p>
      </section>

      <section v-if="sourceUrl" class="panel preview-panel">
        <div class="preview-grid">
          <div class="preview-block">
            <h2>原图</h2>
            <div class="preview-stage">
              <img :src="sourceUrl" alt="原图" class="preview-image" />
            </div>
          </div>
          <div class="preview-block">
            <h2>最近邻结果</h2>
            <div class="preview-stage">
              <img
                v-if="resultUrl"
                :src="resultUrl"
                alt="缩放结果"
                class="preview-image pixelated"
              />
              <p v-else class="preview-empty">调整参数后自动预览</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 像素图缩放工具页
 * 最近邻插值放大，可导出 PNG 或送入拼豆生成器
 */
import { defineComponent } from 'vue'

import { FormatFileSize } from '@/utils/ImageCompress'
import router from '@/router'
import ToolPageHero from '@/components/ToolPageHero.vue'
import {
  CanvasToPngBlob,
  ClampScaleFactor,
  ClampTargetSize,
  GetScaleFactorPresets,
  ResolveScaledFilename,
  ResolveScaledSize,
  ScaleImageFileNearest,
  TriggerPixelScaleDownload,
  type PixelScaleMode,
} from '@/utils/PixelScaler'

export default defineComponent({
  name: 'PixelScalerView',
  components: {
    ToolPageHero,
  },
  data() {
    return {
      isDragging: false,
      isBusy: false,
      sourceFile: null as File | null,
      sourceUrl: '',
      sourceWidth: 0,
      sourceHeight: 0,
      resultUrl: '',
      resultCanvas: null as HTMLCanvasElement | null,
      scaleMode: 'factor' as PixelScaleMode,
      factor: 4,
      factorPresets: GetScaleFactorPresets(),
      targetWidth: 128,
      targetHeight: 128,
      keepAspect: true,
      outputWidth: 0,
      outputHeight: 0,
      statusText: '',
      hasError: false,
      previewTimer: null as ReturnType<typeof setTimeout> | null,
      dragDepth: 0,
    }
  },
  /**
   * 挂载时设置标题
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', '像素图缩放')
  },
  /**
   * 卸载时清理
   */
  beforeUnmount() {
    if (this.previewTimer) {
      clearTimeout(this.previewTimer)
    }
    this.RevokeUrls()
  },
  methods: {
    /**
     * 格式化文件大小
     * @param bytes 字节
     * @returns 文案
     */
    FormatSize(bytes: number): string {
      return FormatFileSize(bytes)
    },
    /**
     * 释放 Object URL
     */
    RevokeUrls() {
      if (this.sourceUrl) {
        URL.revokeObjectURL(this.sourceUrl)
        this.sourceUrl = ''
      }
      if (this.resultUrl) {
        URL.revokeObjectURL(this.resultUrl)
        this.resultUrl = ''
      }
    },
    /**
     * 拖拽进入
     */
    HandleDragEnter() {
      this.dragDepth += 1
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
     */
    HandleDragLeave() {
      this.dragDepth = Math.max(0, this.dragDepth - 1)
      if (this.dragDepth === 0) {
        this.isDragging = false
      }
    },
    /**
     * 拖拽放下
     * @param event 拖拽事件
     */
    HandleDrop(event: DragEvent) {
      this.dragDepth = 0
      this.isDragging = false
      const file = event.dataTransfer?.files?.[0]
      if (file) {
        void this.LoadSourceFile(file)
      }
    },
    /**
     * 文件选择
     * @param event 选择事件
     */
    HandleFileSelect(event: Event) {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0] || null
      input.value = ''
      if (file) {
        void this.LoadSourceFile(file)
      }
    },
    /**
     * 加载源图片并初始化尺寸
     * @param file 文件
     */
    async LoadSourceFile(file: File) {
      if (!file.type.startsWith('image/')) {
        this.SetStatus('请选择图片文件', true)
        return
      }
      this.RevokeUrls()
      this.sourceFile = file
      this.sourceUrl = URL.createObjectURL(file)
      this.resultCanvas = null
      this.hasError = false
      this.statusText = ''

      try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve(img)
          img.onerror = () => reject(new Error('图片加载失败'))
          img.src = this.sourceUrl
        })
        this.sourceWidth = image.naturalWidth || image.width
        this.sourceHeight = image.naturalHeight || image.height
        this.targetWidth = Math.min(4096, this.sourceWidth * 4)
        this.targetHeight = Math.min(4096, this.sourceHeight * 4)
        this.SchedulePreview()
      } catch (error) {
        this.ClearSource()
        this.SetStatus(
          error instanceof Error ? error.message : '加载失败',
          true,
        )
      }
    },
    /**
     * 清除源图
     */
    ClearSource() {
      if (this.previewTimer) {
        clearTimeout(this.previewTimer)
        this.previewTimer = null
      }
      this.RevokeUrls()
      this.sourceFile = null
      this.sourceWidth = 0
      this.sourceHeight = 0
      this.resultCanvas = null
      this.outputWidth = 0
      this.outputHeight = 0
      this.statusText = ''
      this.hasError = false
    },
    /**
     * 切换缩放模式
     * @param mode 模式
     */
    SetScaleMode(mode: PixelScaleMode) {
      this.scaleMode = mode
      this.SchedulePreview()
    },
    /**
     * 设置整数倍
     * @param value 倍数
     */
    SetFactor(value: number) {
      this.factor = ClampScaleFactor(value)
      this.SchedulePreview()
    },
    /**
     * 锁定比例时同步高度
     */
    HandleKeepAspect() {
      if (this.keepAspect && this.sourceWidth && this.sourceHeight) {
        const ratio = this.sourceHeight / this.sourceWidth
        this.targetHeight = ClampTargetSize(this.targetWidth * ratio)
      }
      this.SchedulePreview()
    },
    /**
     * 防抖刷新预览
     */
    SchedulePreview() {
      if (this.previewTimer) {
        clearTimeout(this.previewTimer)
      }
      this.previewTimer = setTimeout(() => {
        void this.RefreshPreview()
      }, 180)
    },
    /**
     * 执行最近邻缩放预览
     */
    async RefreshPreview() {
      if (!this.sourceFile || !this.sourceWidth || !this.sourceHeight) {
        return
      }

      this.factor = ClampScaleFactor(this.factor)
      this.targetWidth = ClampTargetSize(this.targetWidth)
      this.targetHeight = ClampTargetSize(this.targetHeight)

      if (this.keepAspect && this.scaleMode === 'size') {
        const ratio = this.sourceHeight / this.sourceWidth
        this.targetHeight = ClampTargetSize(this.targetWidth * ratio)
      }

      const size = ResolveScaledSize(this.sourceWidth, this.sourceHeight, {
        mode: this.scaleMode,
        factor: this.factor,
        targetWidth: this.targetWidth,
        targetHeight: this.targetHeight,
        keepAspect: this.keepAspect,
      })
      this.outputWidth = size.width
      this.outputHeight = size.height

      this.isBusy = true
      this.hasError = false
      try {
        const result = await ScaleImageFileNearest(this.sourceFile, {
          mode: this.scaleMode,
          factor: this.factor,
          targetWidth: this.targetWidth,
          targetHeight: this.targetHeight,
          keepAspect: this.keepAspect,
        })
        this.resultCanvas = result.canvas
        if (this.resultUrl) {
          URL.revokeObjectURL(this.resultUrl)
          this.resultUrl = ''
        }
        const blob = await CanvasToPngBlob(result.canvas)
        this.resultUrl = URL.createObjectURL(blob)
        this.statusText = ''
      } catch (error) {
        this.resultCanvas = null
        if (this.resultUrl) {
          URL.revokeObjectURL(this.resultUrl)
          this.resultUrl = ''
        }
        this.SetStatus(
          error instanceof Error ? error.message : '缩放失败',
          true,
        )
      } finally {
        this.isBusy = false
      }
    },
    /**
     * 导出 PNG
     */
    async DownloadPng() {
      if (!this.resultCanvas || !this.sourceFile) {
        this.SetStatus('请先生成预览', true)
        return
      }
      this.isBusy = true
      try {
        const blob = await CanvasToPngBlob(this.resultCanvas)
        TriggerPixelScaleDownload(
          blob,
          ResolveScaledFilename(
            this.sourceFile.name,
            this.outputWidth,
            this.outputHeight,
          ),
        )
        this.SetStatus('已开始下载 PNG')
      } catch (error) {
        this.SetStatus(
          error instanceof Error ? error.message : '导出失败',
          true,
        )
      } finally {
        this.isBusy = false
      }
    },
    /**
     * 将结果送入拼豆生成器（图片模式）
     */
    async SendToGenerator() {
      if (!this.resultCanvas) {
        this.SetStatus('请先生成预览', true)
        return
      }
      try {
        const dataUrl = this.resultCanvas.toDataURL('image/png')
        this.$store.commit('SETSOURCEMODE', 'image')
        this.$store.commit('SETIMAGEDATAURL', dataUrl)
        this.$store.commit(
          'SETIMAGEMAXWIDTH',
          Math.min(128, Math.max(8, this.sourceWidth)),
        )
        this.$store.commit(
          'SETIMAGEMAXHEIGHT',
          Math.min(128, Math.max(8, this.sourceHeight)),
        )
        this.$store.commit('SETIMAGECLARITY', 10)
        this.$store.commit('SETIMAGEALPHATHRESHOLD', 1)
        void router.push('/generator')
      } catch (error) {
        this.SetStatus(
          error instanceof Error ? error.message : '发送失败',
          true,
        )
      }
    },
    /**
     * 设置状态
     * @param text 文案
     * @param isError 是否错误
     */
    SetStatus(text: string, isError = false) {
      this.statusText = text
      this.hasError = isError
    },
  },
})
</script>

<style scoped>
.scaler-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.workspace {
  flex: 1;
  width: min(980px, 100%);
  margin: 0 auto;
  padding: 28px 6vw 48px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.upload-area {
  border-radius: 16px;
  border: 1px dashed rgba(49, 65, 95, 0.28);
  background: rgba(255, 255, 255, 0.7);
  transition: border-color 0.2s, background 0.2s;
}

.upload-area.dragging {
  border-color: #31486f;
  background: rgba(49, 72, 111, 0.08);
}

.upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 140px;
  padding: 24px;
  cursor: pointer;
  text-align: center;
}

.upload-title {
  color: #1d2a44;
  font-size: 1.05rem;
}

.upload-tip {
  color: #6a7a96;
  font-size: 0.88rem;
}

.panel {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(49, 65, 95, 0.1);
}

.file-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px 16px;
  margin-bottom: 14px;
}

.file-name {
  margin: 0;
  color: #1d2a44;
  font-weight: 600;
}

.file-size {
  margin: 0;
  color: #6a7a96;
  font-size: 0.88rem;
}

.ghost-sm {
  border: none;
  background: transparent;
  color: #4d6d9a;
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
  padding: 0;
}

.mode-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 14px;
}

.mode-btn,
.preset-btn,
.ghost,
.primary {
  font: inherit;
  cursor: pointer;
}

.mode-btn {
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(49, 65, 95, 0.2);
  background: #fff;
  color: #31415f;
}

.mode-btn.active {
  background: #31486f;
  border-color: #31486f;
  color: #fff8ef;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.preset-btn {
  min-width: 48px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(49, 65, 95, 0.2);
  background: #fff;
  color: #31415f;
  padding: 0 12px;
}

.preset-btn.active {
  background: rgba(49, 72, 111, 0.12);
  border-color: #31486f;
  color: #1d2a44;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #31415f;
  font-size: 0.9rem;
  margin-bottom: 12px;
}

.field input[type='number'] {
  border: 1px solid rgba(49, 65, 95, 0.2);
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
}

.field input[type='range'] {
  width: 100%;
}

.size-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  color: #31415f;
  font-size: 0.9rem;
}

.result-size {
  margin: 0 0 14px;
  color: #4d5f7d;
  font-size: 0.92rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.ghost,
.primary {
  border-radius: 999px;
  padding: 10px 16px;
}

.ghost {
  border: 1px solid rgba(49, 65, 95, 0.22);
  background: #fff;
  color: #31415f;
}

.primary {
  border: 1px solid #31486f;
  background: #31486f;
  color: #fff8ef;
}

.actions button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.status {
  margin: 12px 0 0;
  font-size: 0.9rem;
  color: #3f6b4a;
}

.status.error {
  color: #a33b3b;
}

.preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.preview-block h2 {
  margin: 0 0 10px;
  font-size: 1rem;
  color: #1d2a44;
}

.preview-stage {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(49, 65, 95, 0.12);
  background:
    linear-gradient(45deg, #e8ecf3 25%, transparent 25%) 0 0 / 16px 16px,
    linear-gradient(-45deg, #e8ecf3 25%, transparent 25%) 0 8px / 16px 16px,
    linear-gradient(45deg, transparent 75%, #e8ecf3 75%) 8px -8px / 16px 16px,
    linear-gradient(-45deg, transparent 75%, #e8ecf3 75%) -8px 0 / 16px 16px,
    #f7f8fb;
  overflow: auto;
}

.preview-image {
  max-width: 100%;
  height: auto;
  image-rendering: auto;
}

.preview-image.pixelated {
  image-rendering: pixelated;
}

.preview-empty {
  margin: 0;
  color: #6a7a96;
}

@media (max-width: 820px) {
  

  .preview-grid,
  .size-row {
    grid-template-columns: 1fr;
  }
}
</style>
