<template>
  <div class="file-page">
    <header class="hero">
      <div class="hero-copy">
        <p class="brand">{{ appBrand }}</p>
        <h1>文件转换</h1>
        <p class="subtitle">纯前端本地转换，含 PDF 转 PNG/JPG，不上传服务器</p>
      </div>
      <nav class="hero-nav">
        <router-link to="/">工具列表</router-link>
        <router-link to="/about">关于</router-link>
      </nav>
    </header>

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
            ref="fileInput"
            type="file"
            accept=".pdf,.txt,.docx,.xlsx,.csv,.json,.html,.htm"
            hidden
            @change="HandleFileSelect"
          />
          <span class="upload-title">点击或拖拽文件到此处</span>
          <span class="upload-tip">{{ supportedHint }}</span>
        </label>
      </section>

      <section v-if="selectedFile" class="options-card">
        <div class="file-meta">
          <p class="file-name">{{ selectedFile.name }}</p>
          <p class="file-size">{{ FormatSize(selectedFile.size) }}</p>
          <button type="button" class="ghost" :disabled="isConverting" @click="ClearFile">
            移除文件
          </button>
        </div>

        <div class="convert-row">
          <label class="field">
            <span>目标格式</span>
            <select
              :value="targetFormat"
              :disabled="isConverting || !availableTargets.length"
              @change="HandleTargetChange"
            >
              <option value="" disabled>请选择</option>
              <option
                v-for="item in availableTargets"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </option>
            </select>
          </label>

          <button
            type="button"
            class="primary"
            :disabled="isConverting || !targetFormat"
            @click="HandleConvert"
          >
            {{ isConverting ? `转换中 ${progress}%` : '开始转换' }}
          </button>
        </div>

        <div v-if="isConverting || progress > 0" class="progress-track">
          <div class="progress-bar" :style="{ width: `${progress}%` }" />
        </div>

        <p v-if="statusText" class="status">{{ statusText }}</p>

        <div v-if="resultBlob" class="result-box">
          <p class="result-title">转换完成</p>
          <p class="result-name">{{ resultName }}</p>
          <p v-if="resultTip" class="result-tip">{{ resultTip }}</p>
          <button type="button" class="success" @click="HandleDownload">
            下载文件
          </button>
        </div>
      </section>

      <section class="tips-card">
        <h2>支持的转换</h2>
        <ul>
          <li>PDF → PNG / JPG（多页自动打包 ZIP）/ TXT</li>
          <li>TXT → PDF</li>
          <li>DOCX → TXT / HTML</li>
          <li>XLSX → CSV / JSON</li>
          <li>CSV ↔ JSON，JSON → TXT，HTML → TXT</li>
        </ul>
        <p class="warn">
          不支持 Word/Excel ↔ PDF 等需后端处理的类型，避免假转换。
        </p>
      </section>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 文件转换工具页
 * 纯前端转换：PDF 渲染、文档/表格解析，无后端依赖
 */
import { defineComponent } from 'vue'
import { APPBRAND } from '@/utils/Brand'
import { FormatFileSize } from '@/utils/ImageCompress'
import {
  ConvertFile,
  ResolveAvailableTargets,
  ResolveFileExtension,
  ResolveSourceFormat,
  ResolveSupportedHint,
  TriggerFileDownload,
  ValidateConvertFile,
  type FileFormatOption,
  type FileTargetFormat,
} from '@/utils/FileConverter'

export default defineComponent({
  name: 'FileConverterView',
  data() {
    return {
      appBrand: APPBRAND,
      supportedHint: ResolveSupportedHint(),
      isDragging: false,
      isConverting: false,
      progress: 0,
      statusText: '',
      selectedFile: null as File | null,
      targetFormat: '' as FileTargetFormat | '',
      availableTargets: [] as FileFormatOption[],
      resultBlob: null as Blob | null,
      resultName: '',
      resultTip: '',
    }
  },
  /**
   * 挂载时同步页面标题
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', '文件转换')
  },
  methods: {
    /**
     * 格式化大小
     * @param bytes 字节
     * @returns 文案
     */
    FormatSize(bytes: number): string {
      return FormatFileSize(bytes)
    },
    /**
     * 设置选中文件并刷新可选目标
     * @param file 文件
     */
    SetSelectedFile(file: File) {
      const error = ValidateConvertFile(file)
      if (error) {
        this.statusText = error
        return
      }

      const extension = ResolveFileExtension(file.name)
      const source = ResolveSourceFormat(extension)
      if (!source) {
        this.statusText = '不支持的源格式'
        return
      }

      this.selectedFile = file
      this.availableTargets = ResolveAvailableTargets(source)
      this.targetFormat = this.availableTargets[0]?.value || ''
      this.resultBlob = null
      this.resultName = ''
      this.resultTip = ''
      this.progress = 0
      this.statusText = ''
    },
    /**
     * 选择文件
     * @param event 变更事件
     */
    HandleFileSelect(event: Event) {
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]
      if (file) {
        this.SetSelectedFile(file)
      }
      target.value = ''
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
     * 拖拽放下
     * @param event 拖拽事件
     */
    HandleDrop(event: DragEvent) {
      this.isDragging = false
      const file = event.dataTransfer?.files?.[0]
      if (file) {
        this.SetSelectedFile(file)
      }
    },
    /**
     * 切换目标格式
     * @param event 变更事件
     */
    HandleTargetChange(event: Event) {
      const target = event.target as HTMLSelectElement
      this.targetFormat = target.value as FileTargetFormat
      this.resultBlob = null
      this.resultName = ''
      this.resultTip = ''
    },
    /**
     * 清空当前文件
     */
    ClearFile() {
      this.selectedFile = null
      this.targetFormat = ''
      this.availableTargets = []
      this.resultBlob = null
      this.resultName = ''
      this.resultTip = ''
      this.progress = 0
      this.statusText = ''
    },
    /**
     * 执行转换
     */
    async HandleConvert() {
      if (!this.selectedFile || !this.targetFormat || this.isConverting) {
        return
      }

      this.isConverting = true
      this.progress = 0
      this.statusText = '正在转换…'
      this.resultBlob = null

      try {
        const result = await ConvertFile(
          this.selectedFile,
          this.targetFormat,
          (value) => {
            this.progress = value
          },
        )
        this.resultBlob = result.blob
        this.resultName = result.fileName
        this.resultTip = result.tip || ''
        this.progress = 100
        this.statusText = '转换成功，可下载'
      } catch (error) {
        console.error(error)
        this.statusText =
          error instanceof Error ? error.message : '转换失败，请重试'
        this.progress = 0
      } finally {
        this.isConverting = false
      }
    },
    /**
     * 下载结果
     */
    HandleDownload() {
      if (!this.resultBlob || !this.resultName) {
        return
      }
      TriggerFileDownload(this.resultBlob, this.resultName)
    },
  },
})
</script>

<style scoped>
.file-page {
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
  font-size: 0.88rem;
  line-height: 1.5;
  max-width: 560px;
}

.options-card,
.tips-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(49, 65, 95, 0.1);
}

.file-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  margin-bottom: 16px;
}

.file-name {
  margin: 0;
  font-weight: 600;
  color: #1f2a3d;
}

.file-size {
  margin: 0;
  color: #6a7a94;
  font-size: 0.9rem;
}

.convert-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: end;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #31415f;
  font-size: 0.92rem;
}

.field select {
  border: 1px solid rgba(49, 65, 95, 0.2);
  border-radius: 8px;
  padding: 10px 12px;
  background: #fff;
  font: inherit;
}

.primary,
.success,
.ghost {
  border-radius: 10px;
  padding: 10px 16px;
  cursor: pointer;
  font: inherit;
}

.primary {
  border: none;
  background: #31486f;
  color: #fff8ef;
  white-space: nowrap;
}

.success {
  border: none;
  background: #2e7d5a;
  color: #fff;
}

.ghost {
  border: 1px solid rgba(49, 65, 95, 0.25);
  background: transparent;
  color: #31415f;
}

.primary:disabled,
.ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.progress-track {
  margin-top: 14px;
  height: 8px;
  border-radius: 999px;
  background: rgba(49, 65, 95, 0.1);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3d6eb0, #5a92d6);
  transition: width 0.2s ease;
}

.status {
  margin: 12px 0 0;
  color: #4a5a76;
  font-size: 0.9rem;
}

.result-box {
  margin-top: 16px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(46, 125, 90, 0.08);
  border: 1px solid rgba(46, 125, 90, 0.2);
}

.result-title {
  margin: 0 0 6px;
  font-weight: 600;
  color: #1f6b4a;
}

.result-name,
.result-tip {
  margin: 0 0 8px;
  color: #31415f;
  font-size: 0.9rem;
}

.tips-card h2 {
  margin: 0 0 10px;
  font-size: 1.05rem;
  color: #1f2a3d;
}

.tips-card ul {
  margin: 0;
  padding-left: 1.2em;
  color: #31415f;
  line-height: 1.7;
}

.warn {
  margin: 12px 0 0;
  color: #8a6418;
  font-size: 0.88rem;
}

@media (max-width: 700px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .convert-row {
    grid-template-columns: 1fr;
  }
}
</style>
