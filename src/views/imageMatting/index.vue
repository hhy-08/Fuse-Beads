<template>
  <div class="matting-page">
    <ToolPageHero title="AI 智能抠图" subtitle="浏览器本地去背景；默认轻量模型，其它档位选中后自动下载" />

    <main class="workspace">
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        hidden
        @change="HandleInputChange"
      />

      <section
        v-if="!sourceUrl"
        class="upload-area"
        :class="{ dragging: isDragging }"
        @dragenter.prevent="HandleDragEnter"
        @dragover.prevent="HandleDragOver"
        @dragleave.prevent="HandleDragLeave"
        @drop.prevent="HandleDrop"
        @click="HandlePickFile"
      >
        <div class="upload-label">
          <span class="upload-title">拖拽图片到此处，或点击选择</span>
          <span class="upload-tip">
            支持 JPG / PNG / WebP，单张 ≤ 20MB；长边超过 2048 会自动缩小再抠图
          </span>
          <span class="upload-tip warn">
            默认轻量约 5MB；海报/高清等大模型仅在你选中后下载并缓存
          </span>
        </div>
      </section>

      <template v-else>
        <section class="options-card">
          <h2>模型档位</h2>
          <div class="chip-group">
            <button
              v-for="item in modelOptions"
              :key="item.id"
              type="button"
              class="mode-chip"
              :class="{ active: modelId === item.id }"
              :disabled="isBusy"
              @click="HandleModelChange(item.id)"
            >
              <span class="chip-main">
                <span class="chip-label">{{ item.label }}</span>
                <span v-if="item.tag" class="chip-tag">{{ item.tag }}</span>
              </span>
              <span class="chip-size">{{ item.sizeHint }}</span>
            </button>
          </div>
          <p class="model-desc">{{ currentModelDesc }}</p>
          <p class="model-tip">
            默认「轻量」；切换其它档位会经同源代理/镜像下载。通用高清约 174MB，失败时可执行
            <code>npm run sync-matting</code>
            预置到本地。
          </p>

          <div class="actions">
            <button
              type="button"
              class="primary"
              :disabled="isBusy"
              @click="HandleMatting"
            >
              {{ isBusy ? '处理中…' : '开始抠图' }}
            </button>
            <button
              type="button"
              class="ghost"
              :disabled="isBusy || !resultUrl"
              @click="HandleDownload"
            >
              下载 PNG
            </button>
            <button
              type="button"
              class="ghost"
              :disabled="isBusy"
              @click="HandleReplaceImage"
            >
              更换图片
            </button>
          </div>

          <div v-if="isBusy || progress > 0" class="progress-block">
            <div class="progress-meta">
              <span>{{ progressText }}</span>
              <span>{{ progress }}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar" :style="{ width: `${progress}%` }" />
            </div>
          </div>

          <p v-if="statusText" class="status" :class="{ error: hasError }">
            {{ statusText }}
          </p>
        </section>

        <section class="preview-card">
          <div class="preview-toolbar">
            <div class="file-meta">
              <span class="file-name">{{ fileName }}</span>
              <span class="file-size">
                {{ imageWidth }} × {{ imageHeight }} ·
                {{ FormatMattingFileSize(fileSize) }}
              </span>
            </div>
          </div>

          <div class="preview-grid">
            <div class="preview-pane">
              <h3>原图</h3>
              <div class="preview-frame">
                <img :src="sourceUrl" alt="原图预览" />
              </div>
            </div>
            <div class="preview-pane">
              <h3>抠图结果</h3>
              <div class="preview-frame checker">
                <img
                  v-if="resultUrl"
                  :src="resultUrl"
                  alt="抠图结果"
                />
                <span v-else class="placeholder">点击「开始抠图」生成透明背景</span>
              </div>
            </div>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * AI 智能抠图工具页
 * 默认轻量 u2netp；其它模型选中后再按需下载
 */
import { defineComponent } from 'vue'

import {
  BuildMattingFileName,
  DownloadMattingBlob,
  EnsureMattingModelReady,
  FormatMattingError,
  FormatMattingFileSize,
  GetMattingModelOptions,
  LoadMattingSource,
  RedownloadMattingModel,
  RemoveImageBackground,
  RevokeMattingUrl,
} from '@/utils/ImageMatting'
import type { MattingModelId } from './types'
import ToolPageHero from '@/components/ToolPageHero.vue'

const MAXFILESIZE = 20 * 1024 * 1024

export default defineComponent({
  name: 'ImageMattingView',
  components: {
    ToolPageHero,
  },
  data() {
    return {
      isDragging: false,
      isBusy: false,
      statusText: '',
      hasError: false,
      progress: 0,
      progressText: '',
      fileName: '',
      fileSize: 0,
      sourceFile: null as File | null,
      sourceUrl: '',
      resultUrl: '',
      resultBlob: null as Blob | null,
      imageWidth: 0,
      imageHeight: 0,
      modelId: 'u2netp' as MattingModelId,
      modelOptions: GetMattingModelOptions(),
    }
  },
  computed: {
    /**
     * 当前模型说明文案
     */
    currentModelDesc(): string {
      const found = this.modelOptions.find((item) => item.id === this.modelId)
      return found?.description || ''
    },
  },
  /**
   * 挂载时同步页面标题
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', 'AI 智能抠图')
  },
  /**
   * 卸载时释放 blob URL
   */
  beforeUnmount() {
    this.RevokeAllUrls()
  },
  methods: {
    FormatMattingFileSize,
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
     * 释放预览 URL
     */
    RevokeAllUrls() {
      RevokeMattingUrl(this.sourceUrl)
      RevokeMattingUrl(this.resultUrl)
      this.sourceUrl = ''
      this.resultUrl = ''
    },
    /**
     * 打开文件选择
     */
    HandlePickFile() {
      const input = this.$refs.fileInput as HTMLInputElement | undefined
      input?.click()
    },
    /**
     * 处理 input 选文件
     * @param event 变更事件
     */
    async HandleInputChange(event: Event) {
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]
      target.value = ''
      if (file) {
        await this.LoadFile(file)
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
      const file = event.dataTransfer?.files?.[0]
      if (file) {
        await this.LoadFile(file)
      }
    },
    /**
     * 加载原图
     * @param file 图片文件
     */
    async LoadFile(file: File) {
      if (!file.type.startsWith('image/')) {
        this.SetStatus('请选择图片文件', true)
        return
      }
      if (file.size > MAXFILESIZE) {
        this.SetStatus('文件超过 20MB 限制', true)
        return
      }
      try {
        this.RevokeAllUrls()
        this.resultBlob = null
        this.progress = 0
        this.progressText = ''
        const loaded = await LoadMattingSource(file)
        this.sourceFile = file
        this.sourceUrl = loaded.url
        this.fileName = file.name
        this.fileSize = file.size
        this.imageWidth = loaded.width
        this.imageHeight = loaded.height
        this.SetStatus('图片已加载，可直接用默认轻量模型抠图')
      } catch (error) {
        this.SetStatus(
          error instanceof Error ? error.message : '加载失败',
          true,
        )
      }
    },
    /**
     * 切换模型档位；非轻量档选中后立即按需下载
     * @param modelId 模型 id
     */
    async HandleModelChange(modelId: MattingModelId) {
      if (this.isBusy) {
        return
      }
      const shouldForceRedownload =
        this.modelId === modelId && this.hasError && modelId !== 'u2netp'
      if (this.modelId === modelId && !shouldForceRedownload) {
        return
      }
      this.modelId = modelId
      if (this.resultUrl) {
        RevokeMattingUrl(this.resultUrl)
        this.resultUrl = ''
        this.resultBlob = null
      }
      if (modelId === 'u2netp') {
        this.SetStatus('已切换为轻量模型，可直接抠图')
        return
      }
      try {
        this.isBusy = true
        this.hasError = false
        this.progress = 0
        this.progressText = shouldForceRedownload
          ? '准备重新下载模型…'
          : '准备下载模型…'
        this.SetStatus(
          shouldForceRedownload
            ? '检测到上次模型异常，正在重新下载…'
            : '正在下载所选模型，完成后即可抠图…',
        )
        const PrepareModel = shouldForceRedownload
          ? RedownloadMattingModel
          : EnsureMattingModelReady
        await PrepareModel(modelId, (info) => {
          this.progress = Math.max(0, Math.min(100, Math.round(info.progress)))
          this.progressText = info.message || info.step
        })
        this.progress = 100
        this.progressText = '模型已就绪'
        this.SetStatus('模型已下载并缓存，可开始抠图')
      } catch (error) {
        this.progress = 0
        this.progressText = ''
        this.SetStatus(FormatMattingError(error, modelId), true)
        this.modelId = 'u2netp'
      } finally {
        this.isBusy = false
      }
    },
    /**
     * 执行抠图
     */
    async HandleMatting() {
      if (!this.sourceFile) {
        this.SetStatus('请先上传图片', true)
        return
      }
      try {
        this.isBusy = true
        this.hasError = false
        this.progress = 0
        this.progressText = '准备中…'
        this.SetStatus('正在加载模型并抠图，请稍候…')

        const blob = await RemoveImageBackground(
          this.sourceFile,
          this.modelId,
          (info) => {
            this.progress = Math.max(0, Math.min(100, Math.round(info.progress)))
            this.progressText = info.message || info.step
          },
        )

        if (this.resultUrl) {
          RevokeMattingUrl(this.resultUrl)
        }
        this.resultBlob = blob
        this.resultUrl = URL.createObjectURL(blob)
        this.progress = 100
        this.progressText = '完成'
        this.SetStatus('抠图完成，可下载透明 PNG')
      } catch (error) {
        this.progress = 0
        this.progressText = ''
        this.SetStatus(FormatMattingError(error, this.modelId), true)
      } finally {
        this.isBusy = false
      }
    },
    /**
     * 下载结果
     */
    HandleDownload() {
      if (!this.resultBlob) {
        this.SetStatus('请先完成抠图', true)
        return
      }
      DownloadMattingBlob(
        this.resultBlob,
        BuildMattingFileName(this.fileName),
      )
      this.SetStatus('已开始下载 PNG')
    },
    /**
     * 更换图片
     */
    HandleReplaceImage() {
      this.RevokeAllUrls()
      this.sourceFile = null
      this.resultBlob = null
      this.fileName = ''
      this.fileSize = 0
      this.imageWidth = 0
      this.imageHeight = 0
      this.progress = 0
      this.progressText = ''
      this.SetStatus('')
      this.HandlePickFile()
    },
  },
})
</script>

<style scoped>
.matting-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
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

.upload-area {
  border: 1.5px dashed rgba(49, 65, 95, 0.28);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
  transition: border-color 0.2s ease, background 0.2s ease;
  cursor: pointer;
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
  min-height: 220px;
  padding: 28px 20px;
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
  max-width: 28rem;
}

.upload-tip.warn {
  color: #9a6b2f;
  margin-top: 4px;
}

.model-tip {
  margin: 8px 0 0;
  color: #6a7a94;
  font-size: 0.82rem;
  line-height: 1.45;
}

.options-card,
.preview-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(49, 65, 95, 0.1);
}

.options-card h2,
.preview-pane h3 {
  margin: 0 0 12px;
  font-size: 1rem;
  color: #1f2a3d;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.mode-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(49, 65, 95, 0.18);
  background: #fff;
  color: #31415f;
  cursor: pointer;
  font-size: 0.92rem;
  min-width: 132px;
}

.chip-main {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.chip-tag {
  font-size: 0.7rem;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(61, 110, 176, 0.14);
  color: #1d4f8c;
}

.mode-chip .chip-size {
  font-size: 0.78rem;
  color: #6a7a94;
}

.mode-chip.active {
  border-color: #3d6eb0;
  background: rgba(84, 148, 255, 0.14);
  color: #1d4f8c;
}

.mode-chip:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.model-tip code {
  font-size: 0.8rem;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(49, 65, 95, 0.08);
}

.model-desc {
  margin: 12px 0 0;
  color: #6a7a94;
  font-size: 0.9rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.primary,
.ghost {
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 0.95rem;
  cursor: pointer;
}

.primary {
  border: none;
  background: #3d6eb0;
  color: #fff;
}

.primary:disabled,
.ghost:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ghost {
  border: 1px solid rgba(49, 65, 95, 0.2);
  background: #fff;
  color: #31415f;
}

.progress-block {
  margin-top: 16px;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
  font-size: 0.86rem;
  color: #54627a;
}

.progress-track {
  height: 8px;
  border-radius: 999px;
  background: rgba(49, 65, 95, 0.12);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #3d6eb0, #54a0ff);
  transition: width 0.2s ease;
}

.status {
  margin: 14px 0 0;
  color: #31415f;
  font-size: 0.9rem;
}

.status.error {
  color: #b42318;
}

.preview-toolbar {
  margin-bottom: 14px;
}

.file-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.file-name {
  font-weight: 600;
  color: #1f2a3d;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  color: #6a7a94;
  font-size: 0.86rem;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.preview-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  border-radius: 12px;
  border: 1px solid rgba(49, 65, 95, 0.12);
  background: #f4f7fb;
  overflow: hidden;
  padding: 12px;
}

.preview-frame.checker {
  background-color: #e8edf5;
  background-image:
    linear-gradient(45deg, #d5dde9 25%, transparent 25%),
    linear-gradient(-45deg, #d5dde9 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #d5dde9 75%),
    linear-gradient(-45deg, transparent 75%, #d5dde9 75%);
  background-size: 18px 18px;
  background-position: 0 0, 0 9px, 9px -9px, -9px 0;
}

.preview-frame img {
  max-width: 100%;
  max-height: 360px;
  object-fit: contain;
}

.placeholder {
  color: #6a7a94;
  font-size: 0.9rem;
  text-align: center;
  padding: 12px;
}

@media (max-width: 800px) {
  

  .preview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
