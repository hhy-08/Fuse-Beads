<template>
  <div class="file-page">
    <ToolPageHero title="文件转换" subtitle="纯前端本地转换，支持同格式多文件批量处理" />

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
            multiple
            hidden
            @change="HandleFileSelect"
          />
          <span class="upload-title">
            {{ fileList.length ? '继续添加同格式文件' : '点击或拖拽文件到此处' }}
          </span>
          <span class="upload-tip">{{ supportedHint }}</span>
        </label>
      </section>

      <section v-if="fileList.length" class="options-card">
        <div class="list-head">
          <p class="list-title">
            已选 {{ fileList.length }} 个
            <span v-if="sourceFormatLabel">（{{ sourceFormatLabel }}）</span>
          </p>
          <button type="button" class="ghost" :disabled="isConverting" @click="ClearFiles">
            清空列表
          </button>
        </div>

        <ul class="file-list">
          <li v-for="item in fileList" :key="item.uid">
            <div class="file-info">
              <p class="file-name">{{ item.file.name }}</p>
              <p class="file-size">
                {{ FormatSize(item.file.size) }}
                <span class="status-tag" :class="item.status">
                  {{ ResolveItemStatus(item.status) }}
                </span>
              </p>
              <p v-if="item.error" class="item-error">{{ item.error }}</p>
            </div>
            <button
              type="button"
              class="remove-btn"
              :disabled="isConverting"
              @click="RemoveFile(item.uid)"
            >
              ×
            </button>
          </li>
        </ul>

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
            {{ convertButtonLabel }}
          </button>
        </div>

        <div v-if="isConverting || progress > 0" class="progress-track">
          <div class="progress-bar" :style="{ width: `${progress}%` }" />
        </div>
        <p v-if="currentFileName && isConverting" class="current-file">
          正在处理：{{ currentFileName }}
        </p>

        <p v-if="statusText" class="status">{{ statusText }}</p>

        <div v-if="resultBlob" class="result-box">
          <p class="result-title">转换完成</p>
          <p class="result-name">{{ resultName }}</p>
          <p v-if="resultTip" class="result-tip">{{ resultTip }}</p>
          <button type="button" class="success" @click="HandleDownload">
            {{ fileList.length > 1 ? '下载 ZIP 包' : '下载文件' }}
          </button>
        </div>
      </section>

      <section class="tips-card">
        <h2>支持的转换</h2>
        <ul>
          <li>同格式多文件批量转换，结果自动打包 ZIP</li>
          <li>PDF → PNG / JPG（多页自动 ZIP）/ TXT</li>
          <li>TXT → PDF</li>
          <li>DOCX → TXT / HTML</li>
          <li>XLSX → CSV / JSON</li>
          <li>CSV ↔ JSON，JSON → TXT，HTML → TXT</li>
        </ul>
        <p class="warn">
          一次只能处理同一源格式；不支持 Word/Excel ↔ PDF 等需后端类型。
        </p>
      </section>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 文件转换工具页
 * 纯前端转换，支持同格式多文件批量处理
 */
import { defineComponent } from 'vue'

import { FormatFileSize } from '@/utils/ImageCompress'
import ToolPageHero from '@/components/ToolPageHero.vue'
import {
  ConvertFilesBatch,
  CreateFileUid,
  ResolveAvailableTargets,
  ResolveFileExtension,
  ResolveSourceFormat,
  ResolveSupportedHint,
  TriggerFileDownload,
  ValidateConvertFile,
  type FileFormatOption,
  type FileSourceFormat,
  type FileTargetFormat,
} from '@/utils/FileConverter'

/** 列表文件状态 */
type BatchItemStatus = 'pending' | 'processing' | 'done' | 'error'

/** 批量文件项 */
type BatchFileItem = {
  uid: string
  file: File
  status: BatchItemStatus
  error: string
}

export default defineComponent({
  name: 'FileConverterView',
  components: {
    ToolPageHero,
  },
  data() {
    return {
      supportedHint: ResolveSupportedHint(),
      isDragging: false,
      isConverting: false,
      progress: 0,
      currentFileName: '',
      statusText: '',
      fileList: [] as BatchFileItem[],
      sourceFormat: null as FileSourceFormat | null,
      targetFormat: '' as FileTargetFormat | '',
      availableTargets: [] as FileFormatOption[],
      resultBlob: null as Blob | null,
      resultName: '',
      resultTip: '',
    }
  },
  computed: {
    /**
     * 源格式展示名
     * @returns 文案
     */
    sourceFormatLabel(): string {
      if (!this.sourceFormat) {
        return ''
      }
      return this.sourceFormat.toUpperCase()
    },
    /**
     * 转换按钮文案
     * @returns 文案
     */
    convertButtonLabel(): string {
      if (this.isConverting) {
        return `转换中 ${this.progress}%`
      }
      if (this.fileList.length > 1) {
        return `批量转换（${this.fileList.length}）`
      }
      return '开始转换'
    },
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
     * 状态文案
     * @param status 状态
     * @returns 文案
     */
    ResolveItemStatus(status: BatchItemStatus): string {
      const map: Record<BatchItemStatus, string> = {
        pending: '待转换',
        processing: '转换中',
        done: '完成',
        error: '失败',
      }
      return map[status]
    },
    /**
     * 追加文件（强制同格式）
     * @param files 文件列表
     */
    AppendFiles(files: File[]) {
      if (!files.length) {
        return
      }

      const accepted: File[] = []
      const rejected: string[] = []

      files.forEach((file) => {
        const error = ValidateConvertFile(file)
        if (error) {
          rejected.push(`${file.name}（${error}）`)
          return
        }

        const source = ResolveSourceFormat(ResolveFileExtension(file.name))
        if (!source) {
          rejected.push(`${file.name}（不支持的格式）`)
          return
        }

        if (this.sourceFormat && source !== this.sourceFormat) {
          rejected.push(
            `${file.name}（需与已选格式 ${this.sourceFormat.toUpperCase()} 一致）`,
          )
          return
        }

        const duplicated = this.fileList.some(
          (item) =>
            item.file.name === file.name && item.file.size === file.size,
        )
        if (duplicated) {
          rejected.push(`${file.name}（已在列表中）`)
          return
        }

        if (!this.sourceFormat) {
          this.sourceFormat = source
          this.availableTargets = ResolveAvailableTargets(source)
          this.targetFormat = this.availableTargets[0]?.value || ''
        }

        accepted.push(file)
      })

      if (accepted.length) {
        const next = accepted.map((file) => ({
          uid: CreateFileUid(),
          file,
          status: 'pending' as const,
          error: '',
        }))
        this.fileList = [...this.fileList, ...next]
        this.resultBlob = null
        this.resultName = ''
        this.resultTip = ''
        this.progress = 0
      }

      if (rejected.length) {
        this.statusText = `部分文件未加入：${rejected.join('；')}`
      } else if (accepted.length) {
        this.statusText = ''
      }
    },
    /**
     * 选择文件
     * @param event 变更事件
     */
    HandleFileSelect(event: Event) {
      const target = event.target as HTMLInputElement
      this.AppendFiles(Array.from(target.files || []))
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
      this.AppendFiles(Array.from(event.dataTransfer?.files || []))
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
      this.fileList = this.fileList.map((item) => ({
        ...item,
        status: 'pending',
        error: '',
      }))
    },
    /**
     * 移除单个文件
     * @param uid 文件 uid
     */
    RemoveFile(uid: string) {
      this.fileList = this.fileList.filter((item) => item.uid !== uid)
      if (!this.fileList.length) {
        this.ClearFiles()
      }
    },
    /**
     * 清空列表
     */
    ClearFiles() {
      this.fileList = []
      this.sourceFormat = null
      this.targetFormat = ''
      this.availableTargets = []
      this.resultBlob = null
      this.resultName = ''
      this.resultTip = ''
      this.progress = 0
      this.currentFileName = ''
      this.statusText = ''
    },
    /**
     * 执行批量转换
     */
    async HandleConvert() {
      if (!this.fileList.length || !this.targetFormat || this.isConverting) {
        return
      }

      this.isConverting = true
      this.progress = 0
      this.currentFileName = ''
      this.statusText = '正在转换…'
      this.resultBlob = null
      this.fileList = this.fileList.map((item) => ({
        ...item,
        status: 'pending',
        error: '',
      }))

      try {
        const files = this.fileList.map((item) => item.file)
        const result = await ConvertFilesBatch(
          files,
          this.targetFormat,
          (progress, currentName) => {
            this.progress = progress
            this.currentFileName = currentName
            if (currentName) {
              this.fileList = this.fileList.map((item) => {
                if (item.file.name === currentName) {
                  return { ...item, status: 'processing', error: '' }
                }
                if (item.status === 'processing') {
                  return { ...item, status: 'done' }
                }
                return item
              })
            }
          },
        )

        this.fileList = this.fileList.map((item) => ({
          ...item,
          status: item.status === 'error' ? 'error' : 'done',
        }))
        this.resultBlob = result.blob
        this.resultName = result.fileName
        this.resultTip = result.tip || ''
        this.progress = 100
        this.currentFileName = ''
        this.statusText = '转换成功，可下载'
      } catch (error) {
        console.error(error)
        this.statusText =
          error instanceof Error ? error.message : '转换失败，请重试'
        this.progress = 0
        this.currentFileName = ''
        this.fileList = this.fileList.map((item) =>
          item.status === 'processing'
            ? { ...item, status: 'error', error: this.statusText }
            : item,
        )
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

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.list-title {
  margin: 0;
  font-weight: 600;
  color: #1f2a3d;
}

.file-list {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}

.file-list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(49, 65, 95, 0.1);
  background: #fff;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  margin: 0;
  font-weight: 600;
  color: #1f2a3d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  margin: 4px 0 0;
  color: #6a7a94;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.status-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 0.72rem;
}

.status-tag.pending {
  background: rgba(49, 65, 95, 0.08);
  color: #5a6a84;
}

.status-tag.processing {
  background: rgba(176, 132, 46, 0.14);
  color: #8a6418;
}

.status-tag.done {
  background: rgba(46, 125, 90, 0.12);
  color: #1f6b4a;
}

.status-tag.error {
  background: rgba(176, 61, 61, 0.12);
  color: #9f2f2f;
}

.item-error {
  margin: 4px 0 0;
  color: #9f2f2f;
  font-size: 0.8rem;
}

.remove-btn {
  border: none;
  background: transparent;
  color: #9f2f2f;
  font-size: 1.2rem;
  cursor: pointer;
  line-height: 1;
  padding: 2px 6px;
}

.remove-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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

.current-file,
.status {
  margin: 10px 0 0;
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
  

  .convert-row {
    grid-template-columns: 1fr;
  }
}
</style>
