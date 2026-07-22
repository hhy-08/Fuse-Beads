<template>
  <div class="compress-page">
    <header class="hero">
      <div class="hero-copy">
        <p class="brand">{{ appBrand }}</p>
        <h1>图片压缩工具</h1>
        <p class="subtitle">支持多图、质量/缩放/宽高限制，本地压缩后下载或打包</p>
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
            accept="image/*"
            multiple
            hidden
            @change="HandleInputChange"
          />
          <span class="upload-title">拖拽图片到此处，或点击选择</span>
          <span class="upload-tip">
            支持 JPG / PNG / WebP / GIF 等多张上传；GIF ≤ 20MB，其它 ≤ 50MB
          </span>
        </label>
      </section>

      <section v-if="fileList.length" class="options-card">
        <h2>压缩参数</h2>
        <div class="options-grid">
          <label class="field">
            <span>压缩质量 {{ options.quality }}%</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              :value="options.quality"
              @input="HandleQualityInput"
            />
          </label>

          <label class="field">
            <span>缩放比例 {{ options.scale }}%（100 为原始大小）</span>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              :value="options.scale"
              @input="HandleScaleInput"
            />
          </label>

          <label class="field">
            <span>最大宽度（0 表示不限制）</span>
            <input
              type="number"
              min="0"
              max="4096"
              step="100"
              :value="options.maxWidth"
              @input="HandleMaxWidthInput"
            />
          </label>

          <label class="field">
            <span>最大高度（0 表示不限制）</span>
            <input
              type="number"
              min="0"
              max="4096"
              step="100"
              :value="options.maxHeight"
              @input="HandleMaxHeightInput"
            />
          </label>
        </div>

        <div class="file-chips">
          <span v-for="file in fileList" :key="file.uid" class="chip">
            {{ file.name }}
            <button type="button" @click="HandleRemoveFile(file.uid)">×</button>
          </span>
        </div>

        <div class="actions">
          <button
            type="button"
            class="primary"
            :disabled="isCompressing"
            @click="HandleCompressAll"
          >
            {{ isCompressing ? '压缩中…' : `开始压缩（${fileList.length} 张）` }}
          </button>
          <button type="button" class="ghost" :disabled="isCompressing" @click="HandleClear">
            清空
          </button>
        </div>
        <p v-if="statusText" class="status">{{ statusText }}</p>
      </section>

      <section v-if="compressingFiles.length" class="progress-card">
        <h2>压缩进度</h2>
        <div
          v-for="item in compressingFiles"
          :key="item.uid"
          class="progress-row"
        >
          <div class="progress-meta">
            <span>{{ item.name }}</span>
            <span :class="['tag', item.status]">{{ ProgressLabel(item.status) }}</span>
          </div>
          <div class="progress-track">
            <div class="progress-bar" :style="{ width: `${item.progress}%` }" />
          </div>
        </div>
      </section>

      <section v-if="compressedResults.length" class="result-card">
        <div class="result-head">
          <h2>压缩结果</h2>
          <button
            v-if="compressedResults.length > 1"
            type="button"
            class="primary"
            @click="HandleDownloadAll"
          >
            打包下载全部
          </button>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>文件名</th>
                <th>原始大小</th>
                <th>压缩后大小</th>
                <th>压缩率</th>
                <th>压缩后尺寸</th>
                <th>缩放比例</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in compressedResults" :key="row.uid">
                <td>
                  {{ row.name }}
                  <span v-if="row.isGif" class="gif-tag">GIF</span>
                </td>
                <td>{{ row.originalSize }}</td>
                <td>{{ row.compressedSize }}</td>
                <td>{{ row.ratio }}%</td>
                <td>{{ row.compressedWidth }} × {{ row.compressedHeight }}</td>
                <td>{{ row.scaleRatio }}%</td>
                <td>
                  <button type="button" class="link-btn" @click="HandleDownloadOne(row)">
                    下载
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 图片压缩工具页
 * 参考 toolbox image-compressor：多图上传、参数调节、进度与打包下载
 */
import { defineComponent } from 'vue'
import JSZip from 'jszip'
import { APPBRAND } from '@/utils/Brand'
import {
  CompressImageFile,
  CreateUploadUid,
  FormatFileSize,
  IsGif,
  type CompressOptions,
} from '@/utils/ImageCompress'

/** 待压缩文件项 */
type UploadFileItem = {
  uid: string
  name: string
  size: number
  type: string
  raw: File
}

/** 压缩进度项 */
type CompressingItem = {
  uid: string
  name: string
  progress: number
  status: 'primary' | 'success' | 'exception'
}

/** 压缩结果项 */
type CompressedResult = {
  uid: string
  name: string
  originalSize: string
  compressedSize: string
  ratio: number
  compressedWidth: number
  compressedHeight: number
  scaleRatio: number
  blob: Blob
  isGif: boolean
}

const GIF_MAX_SIZE = 20 * 1024 * 1024
const OTHER_MAX_SIZE = 50 * 1024 * 1024

export default defineComponent({
  name: 'ImageCompressView',
  data() {
    return {
      appBrand: APPBRAND,
      isDragging: false,
      isCompressing: false,
      statusText: '',
      fileList: [] as UploadFileItem[],
      compressingFiles: [] as CompressingItem[],
      compressedResults: [] as CompressedResult[],
      options: {
        quality: 75,
        scale: 100,
        maxWidth: 0,
        maxHeight: 0,
      } as CompressOptions,
    }
  },
  /**
   * 挂载时同步页面标题
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', '图片压缩工具')
  },
  methods: {
    /**
     * 进度状态文案
     * @param status 状态
     * @returns 文案
     */
    ProgressLabel(status: CompressingItem['status']): string {
      if (status === 'success') {
        return '完成'
      }
      if (status === 'exception') {
        return '失败'
      }
      return '压缩中'
    },
    /**
     * 校验并过滤超限文件
     * @param files 原始文件列表
     * @returns 合法文件与被过滤文件名
     */
    FilterValidFiles(files: File[]): { valid: File[]; rejected: string[] } {
      const valid: File[] = []
      const rejected: string[] = []
      files.forEach((file) => {
        const maxSize = IsGif(file) ? GIF_MAX_SIZE : OTHER_MAX_SIZE
        if (file.size > maxSize) {
          rejected.push(file.name)
          return
        }
        valid.push(file)
      })
      return { valid, rejected }
    },
    /**
     * 将 File 转为上传项并合并到列表
     * @param files 文件列表
     */
    AppendFiles(files: File[]) {
      const { valid, rejected } = this.FilterValidFiles(files)
      if (rejected.length) {
        this.statusText = `以下文件超过大小限制，已过滤：${rejected.join('、')}`
      } else {
        this.statusText = ''
      }

      const next = valid.map((file) => ({
        uid: CreateUploadUid(),
        name: file.name,
        size: file.size,
        type: file.type,
        raw: file,
      }))
      this.fileList = [...this.fileList, ...next]
      this.compressedResults = []
    },
    /**
     * 处理 input 选文件
     * @param event 变更事件
     */
    HandleInputChange(event: Event) {
      const target = event.target as HTMLInputElement
      const files = Array.from(target.files || [])
      if (files.length) {
        this.AppendFiles(files)
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
      const files = Array.from(event.dataTransfer?.files || []).filter((file) =>
        file.type.startsWith('image/'),
      )
      if (files.length) {
        this.AppendFiles(files)
      }
    },
    /**
     * 移除单个待压缩文件
     * @param uid 文件 uid
     */
    HandleRemoveFile(uid: string) {
      this.fileList = this.fileList.filter((item) => item.uid !== uid)
    },
    /**
     * 清空列表与结果
     */
    HandleClear() {
      this.fileList = []
      this.compressingFiles = []
      this.compressedResults = []
      this.statusText = ''
    },
    /**
     * 质量滑杆
     * @param event 输入事件
     */
    HandleQualityInput(event: Event) {
      const target = event.target as HTMLInputElement
      this.options.quality = Number(target.value)
    },
    /**
     * 缩放比例滑杆
     * @param event 输入事件
     */
    HandleScaleInput(event: Event) {
      const target = event.target as HTMLInputElement
      this.options.scale = Number(target.value)
    },
    /**
     * 最大宽度输入
     * @param event 输入事件
     */
    HandleMaxWidthInput(event: Event) {
      const target = event.target as HTMLInputElement
      this.options.maxWidth = Math.max(0, Math.min(4096, Number(target.value) || 0))
    },
    /**
     * 最大高度输入
     * @param event 输入事件
     */
    HandleMaxHeightInput(event: Event) {
      const target = event.target as HTMLInputElement
      this.options.maxHeight = Math.max(0, Math.min(4096, Number(target.value) || 0))
    },
    /**
     * 更新某文件进度
     * @param uid 文件 uid
     * @param patch 进度补丁
     */
    PatchProgress(uid: string, patch: Partial<CompressingItem>) {
      this.compressingFiles = this.compressingFiles.map((item) =>
        item.uid === uid ? { ...item, ...patch } : item,
      )
    },
    /**
     * 压缩单个文件并写入结果
     * @param file 上传项
     */
    async CompressOne(file: UploadFileItem) {
      try {
        const result = await CompressImageFile(
          file.raw,
          { ...this.options },
          (progress) => {
            this.PatchProgress(file.uid, { progress })
          },
        )
        this.PatchProgress(file.uid, { progress: 100, status: 'success' })
        this.compressedResults.push({
          uid: file.uid,
          name: file.name,
          originalSize: FormatFileSize(file.raw.size),
          compressedSize: FormatFileSize(result.blob.size),
          ratio: Math.round((1 - result.blob.size / file.raw.size) * 100),
          compressedWidth: result.compressedWidth,
          compressedHeight: result.compressedHeight,
          scaleRatio: result.scaleRatio,
          blob: result.blob,
          isGif: result.isGif,
        })
      } catch (error) {
        console.error(error)
        this.PatchProgress(file.uid, { status: 'exception' })
        throw error
      }
    },
    /**
     * 开始批量压缩
     */
    async HandleCompressAll() {
      if (!this.fileList.length) {
        this.statusText = '请选择图片'
        return
      }

      this.isCompressing = true
      this.statusText = '正在压缩…'
      this.compressedResults = []
      this.compressingFiles = this.fileList.map((file) => ({
        uid: file.uid,
        name: file.name,
        progress: 0,
        status: 'primary' as const,
      }))

      try {
        await Promise.all(this.fileList.map((file) => this.CompressOne(file)))
        this.statusText = '所有图片压缩完成'
      } catch (error) {
        console.error(error)
        this.statusText = '部分图片压缩失败，请查看进度状态'
      } finally {
        this.isCompressing = false
      }
    },
    /**
     * 下载单张压缩图
     * @param result 结果项
     */
    HandleDownloadOne(result: CompressedResult) {
      const link = document.createElement('a')
      link.href = URL.createObjectURL(result.blob)
      link.download = `compressed_${result.name}`
      link.click()
      URL.revokeObjectURL(link.href)
    },
    /**
     * 打包下载全部结果
     */
    async HandleDownloadAll() {
      if (!this.compressedResults.length) {
        return
      }
      const zip = new JSZip()
      this.compressedResults.forEach((result) => {
        zip.file(`compressed_${result.name}`, result.blob)
      })
      const content = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(content)
      link.download = 'compressed_images.zip'
      link.click()
      URL.revokeObjectURL(link.href)
    },
  },
})
</script>

<style scoped>
.compress-page {
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

.options-card,
.progress-card,
.result-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(49, 65, 95, 0.1);
}

.options-card h2,
.progress-card h2,
.result-card h2 {
  margin: 0 0 16px;
  font-size: 1.1rem;
  color: #1f2a3d;
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #31415f;
  font-size: 0.92rem;
}

.field input[type='range'],
.field input[type='number'] {
  width: 100%;
}

.field input[type='number'] {
  border: 1px solid rgba(49, 65, 95, 0.2);
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
}

.file-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(49, 72, 111, 0.08);
  color: #31415f;
  font-size: 0.85rem;
}

.chip button {
  border: none;
  background: transparent;
  color: #6a7a94;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 18px;
  flex-wrap: wrap;
}

.primary,
.ghost,
.link-btn {
  border-radius: 10px;
  padding: 10px 14px;
  cursor: pointer;
  font: inherit;
}

.primary {
  border: none;
  background: #31486f;
  color: #fff8ef;
}

.primary:disabled,
.ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ghost {
  border: 1px solid rgba(49, 65, 95, 0.25);
  background: transparent;
  color: #31415f;
}

.status {
  margin: 12px 0 0;
  color: #4a5a76;
  font-size: 0.9rem;
}

.progress-row + .progress-row {
  margin-top: 14px;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
  color: #31415f;
  font-size: 0.9rem;
}

.tag {
  font-size: 0.78rem;
  padding: 2px 8px;
  border-radius: 999px;
}

.tag.primary {
  background: rgba(61, 110, 176, 0.12);
  color: #2f5f9f;
}

.tag.success {
  background: rgba(46, 125, 90, 0.12);
  color: #1f6b4a;
}

.tag.exception {
  background: rgba(176, 61, 61, 0.12);
  color: #9f2f2f;
}

.progress-track {
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

.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.result-head h2 {
  margin: 0;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th,
td {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(49, 65, 95, 0.1);
  color: #31415f;
  white-space: nowrap;
}

th {
  font-weight: 600;
  color: #1f2a3d;
  background: rgba(49, 72, 111, 0.04);
}

.gif-tag {
  margin-left: 6px;
  font-size: 0.72rem;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(46, 125, 90, 0.12);
  color: #1f6b4a;
}

.link-btn {
  border: none;
  background: transparent;
  color: #2f5f9f;
  padding: 0;
}

@media (max-width: 800px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .options-grid {
    grid-template-columns: 1fr;
  }

  .result-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
