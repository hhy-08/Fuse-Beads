<template>
  <div class="pdf-tool-page">
    <header class="hero">
      <div class="hero-copy">
        <p class="brand">{{ appBrand }}</p>
        <h1>{{ tool ? tool.name : '未知工具' }}</h1>
        <p class="subtitle">{{ tool ? tool.description : '' }}</p>
      </div>
      <nav class="hero-nav">
        <router-link to="/pdf-tools">PDF 工具站</router-link>
        <router-link to="/">工具列表</router-link>
      </nav>
    </header>

    <main v-if="tool && tool.available" class="workspace">
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
            :accept="tool.accept"
            :multiple="tool.multiple"
            hidden
            @change="HandleFileSelect"
          />
          <span class="upload-title">
            {{ fileList.length ? '继续添加文件' : '点击或拖拽文件到此处' }}
          </span>
          <span class="upload-tip">
            单文件 ≤ 50MB
            <template v-if="tool.minFiles > 1">；至少 {{ tool.minFiles }} 个文件</template>
          </span>
        </label>
      </section>

      <section v-if="fileList.length" class="options-card">
        <div class="list-head">
          <p class="list-title">已选 {{ fileList.length }} 个文件</p>
          <button type="button" class="ghost" :disabled="isBusy" @click="ClearFiles">
            清空
          </button>
        </div>
        <ul class="file-list">
          <li v-for="item in fileList" :key="item.uid">
            <span class="file-name">{{ item.file.name }}</span>
            <span class="file-size">{{ FormatSize(item.file.size) }}</span>
            <button
              type="button"
              class="remove-btn"
              :disabled="isBusy"
              @click="RemoveFile(item.uid)"
            >
              ×
            </button>
          </li>
        </ul>

        <div v-if="tool.fields?.includes('angle')" class="field-row">
          <label>
            旋转角度
            <select v-model.number="angle" :disabled="isBusy">
              <option :value="90">90°</option>
              <option :value="180">180°</option>
              <option :value="270">270°</option>
            </select>
          </label>
        </div>

        <div v-if="tool.fields?.includes('text')" class="field-row">
          <label>
            水印文字
            <input v-model.trim="watermarkText" type="text" :disabled="isBusy" placeholder="CONFIDENTIAL" />
          </label>
        </div>

        <div v-if="tool.fields?.includes('opacity')" class="field-row">
          <label>
            透明度 {{ opacity }}
            <input
              v-model.number="opacity"
              type="range"
              min="0.08"
              max="0.6"
              step="0.02"
              :disabled="isBusy"
            />
          </label>
        </div>

        <div v-if="tool.fields?.includes('password')" class="field-row">
          <label>
            打开密码
            <input
              v-model="password"
              type="password"
              :disabled="isBusy"
              placeholder="设置 PDF 密码"
              autocomplete="new-password"
            />
          </label>
        </div>

        <div class="actions">
          <button
            type="button"
            class="primary"
            :disabled="isBusy || fileList.length < tool.minFiles"
            @click="HandleRun"
          >
            {{ isBusy ? '处理中…' : '开始处理' }}
          </button>
          <button
            v-if="resultBlob"
            type="button"
            class="secondary"
            :disabled="isBusy"
            @click="HandleDownload"
          >
            下载结果
          </button>
        </div>

        <div v-if="isBusy || progress > 0" class="progress-wrap">
          <div class="progress-bar" :style="{ width: `${progress}%` }" />
        </div>
        <p v-if="statusText" class="status" :class="{ error: hasError }">{{ statusText }}</p>
      </section>

      <section v-if="showPreview" class="preview-card">
        <div class="preview-head">
          <p class="list-title">结果预览</p>
          <div class="preview-nav">
            <button
              type="button"
              class="secondary"
              :disabled="previewPage <= 1 || isPreviewLoading"
              @click="HandlePreviewPrev"
            >
              上一页
            </button>
            <span class="preview-page">{{ previewPage }} / {{ previewPageCount }}</span>
            <button
              type="button"
              class="secondary"
              :disabled="previewPage >= previewPageCount || isPreviewLoading"
              @click="HandlePreviewNext"
            >
              下一页
            </button>
          </div>
        </div>
        <p v-if="previewError" class="status error">{{ previewError }}</p>
        <p v-else-if="isPreviewLoading" class="status">正在渲染预览…</p>
        <div class="preview-frame">
          <canvas ref="previewCanvas" class="preview-canvas" />
        </div>
      </section>
    </main>

    <main v-else class="workspace">
      <p class="status error">工具不存在或尚未开放。</p>
      <router-link class="back-link" to="/pdf-tools">返回 PDF 工具站</router-link>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * PDF 单个工具工作区 —— 上传、参数、调用 API / 本地转换
 */
import { defineComponent } from 'vue'
import { GetAppTitle } from '@/utils/Env'
import { FindPdfToolById, type PdfToolItem } from '@/utils/pdfTools/PdfToolList'
import { CallPdfApi, DownloadBlob } from '@/utils/pdfTools/PdfApi'
import { ConvertPdfToJpgLocal } from '@/utils/pdfTools/LocalPdfToJpg'
import {
  IsPdfResult,
  OpenPdfPreview,
  type PdfPreviewDoc,
} from '@/utils/pdfTools/PdfPreview'

const APPBRAND = GetAppTitle()

type FileItem = {
  uid: string
  file: File
}

/**
 * 生成列表项唯一 ID
 * @returns uid
 */
function CreateUid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export default defineComponent({
  name: 'PdfToolPage',
  data() {
    return {
      appBrand: APPBRAND,
      tool: null as PdfToolItem | null,
      fileList: [] as FileItem[],
      isDragging: false,
      dragDepth: 0,
      isBusy: false,
      progress: 0,
      statusText: '',
      hasError: false,
      resultBlob: null as Blob | null,
      resultName: '',
      angle: 90,
      watermarkText: 'CONFIDENTIAL',
      opacity: 0.28,
      password: '',
      showPreview: false,
      previewDoc: null as PdfPreviewDoc | null,
      previewPage: 1,
      previewPageCount: 0,
      isPreviewLoading: false,
      previewError: '',
    }
  },
  computed: {
    /**
     * 当前结果是否可预览为 PDF
     * @returns boolean
     */
    canPreviewPdf(): boolean {
      return Boolean(
        this.resultBlob && this.resultName && IsPdfResult(this.resultBlob, this.resultName),
      )
    },
  },
  watch: {
    '$route.params.toolId': {
      immediate: true,
      /**
       * 路由切换时加载工具定义
       */
      handler(toolId: string | string[]) {
        const id = Array.isArray(toolId) ? toolId[0] : toolId
        this.tool = FindPdfToolById(id || '') || null
        this.ClearFiles()
        this.statusText = ''
        this.hasError = false
        this.resultBlob = null
        this.resultName = ''
        this.progress = 0
        this.ClearPreview()
      },
    },
  },
  beforeUnmount() {
    this.ClearPreview()
  },
  methods: {
    /**
     * 格式化文件大小
     * @param size 字节
     * @returns 文案
     */
    FormatSize(size: number): string {
      if (size < 1024) return `${size} B`
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
      return `${(size / (1024 * 1024)).toFixed(1)} MB`
    },
    /**
     * 清空已选文件
     */
    ClearFiles() {
      this.fileList = []
      const input = this.$refs.fileInput as HTMLInputElement | undefined
      if (input) input.value = ''
      this.ClearPreview()
      this.resultBlob = null
      this.resultName = ''
    },
    /**
     * 释放预览文档
     */
    async ClearPreview() {
      this.showPreview = false
      this.previewPage = 1
      this.previewPageCount = 0
      this.previewError = ''
      this.isPreviewLoading = false
      if (this.previewDoc) {
        try {
          await this.previewDoc.destroy()
        } catch {
          /* ignore */
        }
        this.previewDoc = null
      }
    },
    /**
     * 根据结果 Blob 打开 PDF 预览
     */
    async LoadPreviewFromResult() {
      await this.ClearPreview()
      if (!this.resultBlob || !this.canPreviewPdf) return

      this.showPreview = true
      this.isPreviewLoading = true
      this.previewError = ''
      try {
        this.previewDoc = await OpenPdfPreview(this.resultBlob)
        this.previewPageCount = this.previewDoc.pageCount
        this.previewPage = 1
        await this.$nextTick()
        await this.RenderPreviewPage()
      } catch (error) {
        console.error(error)
        this.previewError = error instanceof Error ? error.message : '预览失败'
      } finally {
        this.isPreviewLoading = false
      }
    },
    /**
     * 渲染当前预览页
     */
    async RenderPreviewPage() {
      if (!this.previewDoc) return
      const canvas = this.$refs.previewCanvas as HTMLCanvasElement | undefined
      if (!canvas) return
      this.isPreviewLoading = true
      this.previewError = ''
      try {
        await this.previewDoc.RenderPage(this.previewPage, canvas, 1.2)
      } catch (error) {
        console.error(error)
        this.previewError = error instanceof Error ? error.message : '渲染失败'
      } finally {
        this.isPreviewLoading = false
      }
    },
    /**
     * 预览上一页
     */
    async HandlePreviewPrev() {
      if (this.previewPage <= 1) return
      this.previewPage -= 1
      await this.RenderPreviewPage()
    },
    /**
     * 预览下一页
     */
    async HandlePreviewNext() {
      if (this.previewPage >= this.previewPageCount) return
      this.previewPage += 1
      await this.RenderPreviewPage()
    },
    /**
     * 移除单个文件
     * @param uid 标识
     */
    RemoveFile(uid: string) {
      this.fileList = this.fileList.filter((item) => item.uid !== uid)
    },
    /**
     * 追加文件（尊重 multiple）
     * @param files 文件列表
     */
    AppendFiles(files: FileList | File[]) {
      if (!this.tool) return
      const incoming = Array.from(files)
      if (!incoming.length) return
      if (!this.tool.multiple) {
        this.fileList = [{ uid: CreateUid(), file: incoming[0] }]
        return
      }
      const next = incoming.map((file) => ({ uid: CreateUid(), file }))
      this.fileList = [...this.fileList, ...next]
    },
    /**
     * input change
     * @param event 事件
     */
    HandleFileSelect(event: Event) {
      const input = event.target as HTMLInputElement
      if (input.files) this.AppendFiles(input.files)
    },
    HandleDragEnter() {
      this.dragDepth += 1
      this.isDragging = true
    },
    HandleDragOver() {
      this.isDragging = true
    },
    HandleDragLeave() {
      this.dragDepth = Math.max(0, this.dragDepth - 1)
      if (this.dragDepth === 0) this.isDragging = false
    },
    /**
     * 拖放文件
     * @param event 拖放事件
     */
    HandleDrop(event: DragEvent) {
      this.dragDepth = 0
      this.isDragging = false
      if (event.dataTransfer?.files) {
        this.AppendFiles(event.dataTransfer.files)
      }
    },
    /**
     * 执行转换
     */
    async HandleRun() {
      if (!this.tool || this.isBusy) return
      if (this.fileList.length < this.tool.minFiles) {
        this.hasError = true
        this.statusText = `请至少选择 ${this.tool.minFiles} 个文件`
        return
      }

      this.isBusy = true
      this.hasError = false
      this.progress = 8
      this.statusText = '处理中…'
      this.resultBlob = null
      this.resultName = ''
      await this.ClearPreview()

      try {
        const files = this.fileList.map((item) => item.file)

        if (this.tool.localMode === 'pdf-to-jpg') {
          const result = await ConvertPdfToJpgLocal(files[0], (percent) => {
            this.progress = percent
          })
          this.resultBlob = result.blob
          this.resultName = result.fileName
        } else if (this.tool.endpoint) {
          const fields: Record<string, string> = {}
          if (this.tool.fields?.includes('angle')) {
            fields.angle = String(this.angle)
          }
          if (this.tool.fields?.includes('text')) {
            fields.text = this.watermarkText
          }
          if (this.tool.fields?.includes('opacity')) {
            fields.opacity = String(this.opacity)
          }
          if (this.tool.fields?.includes('password')) {
            if (!this.password) {
              throw new Error('请输入密码')
            }
            fields.password = this.password
          }
          this.progress = 35
          const result = await CallPdfApi(this.tool.endpoint, files, fields)
          this.resultBlob = result.blob
          this.resultName = result.fileName
          this.progress = 100
        } else {
          throw new Error('该工具未配置处理方式')
        }

        this.statusText = '完成，可下载结果'
        this.progress = 100
        await this.LoadPreviewFromResult()
      } catch (error) {
        console.error(error)
        this.hasError = true
        this.statusText = error instanceof Error ? error.message : '处理失败'
        this.progress = 0
      } finally {
        this.isBusy = false
      }
    },
    /**
     * 下载结果
     */
    HandleDownload() {
      if (!this.resultBlob || !this.resultName) return
      DownloadBlob(this.resultBlob, this.resultName)
    },
  },
})
</script>

<style scoped>
.pdf-tool-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #f4f7fb 0%, #e8eef6 100%);
}

.hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 48px 6vw 36px;
  background:
    radial-gradient(circle at 18% 20%, rgba(255, 196, 92, 0.45), transparent 42%),
    radial-gradient(circle at 82% 10%, rgba(84, 148, 255, 0.35), transparent 40%),
    linear-gradient(145deg, #1d2a44 0%, #31486f 48%, #4d6d9a 100%);
}

.hero-copy {
  color: #fff8ef;
}

.brand {
  margin: 0 0 8px;
  font-family: 'ZCOOL KuaiLe', cursive;
  font-size: clamp(2rem, 4.5vw, 3rem);
  line-height: 1;
}

.hero h1 {
  margin: 0;
  font-size: clamp(1.3rem, 2.4vw, 1.8rem);
}

.subtitle {
  margin: 10px 0 0;
  opacity: 0.88;
  max-width: 40rem;
  line-height: 1.5;
}

.hero-nav {
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

.workspace {
  width: min(820px, 100%);
  margin: 0 auto;
  padding: 28px 6vw 48px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.upload-area {
  border: 1.5px dashed rgba(49, 65, 95, 0.28);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
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
  font-size: 0.88rem;
}

.options-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(49, 65, 95, 0.1);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.list-title {
  margin: 0;
  font-weight: 600;
  color: #1f2a3d;
}

.file-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-list li {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(49, 65, 95, 0.05);
}

.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1f2a3d;
}

.file-size {
  color: #6a7a94;
  font-size: 0.85rem;
}

.remove-btn,
.ghost {
  border: none;
  background: transparent;
  color: #6a7a94;
  cursor: pointer;
  font-size: 1.1rem;
}

.ghost {
  font-size: 0.9rem;
  padding: 4px 8px;
}

.field-row label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #31415f;
  font-size: 0.92rem;
}

.field-row input,
.field-row select {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(49, 65, 95, 0.2);
  font: inherit;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.primary,
.secondary {
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  cursor: pointer;
  font: inherit;
}

.primary {
  background: #31486f;
  color: #fff8ef;
}

.primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.secondary {
  background: rgba(49, 72, 111, 0.12);
  color: #31486f;
}

.progress-wrap {
  height: 6px;
  border-radius: 999px;
  background: rgba(49, 65, 95, 0.12);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3d6eb0, #5aa0ff);
  transition: width 0.2s ease;
}

.status {
  margin: 0;
  color: #31415f;
  font-size: 0.92rem;
}

.status.error {
  color: #b04040;
}

.preview-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(49, 65, 95, 0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.preview-nav {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preview-page {
  min-width: 4.5rem;
  text-align: center;
  color: #31415f;
  font-size: 0.9rem;
}

.preview-frame {
  overflow: auto;
  max-height: min(70vh, 720px);
  border-radius: 12px;
  background: #d8e0ec;
  padding: 16px;
  display: flex;
  justify-content: center;
}

.preview-canvas {
  max-width: 100%;
  height: auto;
  box-shadow: 0 8px 24px rgba(30, 45, 70, 0.18);
  background: #fff;
}

.back-link {
  color: #31486f;
}

@media (max-width: 640px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
