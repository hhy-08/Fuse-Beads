<template>
  <div class="converter-page">
    <header class="hero">
      <div class="hero-copy">
        <p class="brand">Fuse Beads</p>
        <h1>图片格式转换</h1>
        <p class="subtitle">多图转 JPEG / PNG / WebP / GIF，单张直下，多张打包 ZIP</p>
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
            @change="HandleFileSelect"
          />
          <span class="upload-title">点击或拖拽图片到此处</span>
          <span class="upload-tip">支持多选，JPG、PNG、WebP、GIF 等常见格式</span>
        </label>
      </section>

      <section v-if="selectedFiles.length" class="options-card">
        <div class="format-row">
          <label class="field">
            <span>输出格式</span>
            <select :value="targetFormat" @change="HandleFormatChange">
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WEBP</option>
              <option value="gif">GIF</option>
            </select>
          </label>

          <label v-if="showQuality" class="field">
            <span>输出质量 {{ quality }}%</span>
            <input
              type="range"
              min="10"
              max="100"
              step="1"
              :value="quality"
              @input="HandleQualityInput"
            />
          </label>
        </div>

        <div class="file-list">
          <div
            v-for="(item, index) in selectedFiles"
            :key="item.uid"
            class="file-item"
          >
            <img :src="item.previewUrl" :alt="item.file.name" />
            <div class="file-info">
              <p class="file-name">{{ item.file.name }}</p>
              <p class="file-size">{{ FormatSize(item.file.size) }}</p>
            </div>
            <button
              type="button"
              class="remove-btn"
              :disabled="isConverting"
              @click="RemoveFile(index)"
            >
              ×
            </button>
          </div>
        </div>

        <div class="action-buttons">
          <button
            type="button"
            class="ghost"
            :disabled="isConverting"
            @click="ClearFiles"
          >
            清空列表
          </button>
          <button
            type="button"
            class="primary"
            :disabled="isConverting"
            @click="ConvertImages"
          >
            {{ convertButtonLabel }}
          </button>
        </div>

        <p v-if="statusText" class="status">{{ statusText }}</p>
      </section>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 图片格式转换工具页
 * 参考 toolbox image-converter：多图选格式转换，单下或 ZIP
 */
import { defineComponent } from 'vue'
import JSZip from 'jszip'
import { CreateUploadUid, FormatFileSize } from '@/utils/ImageCompress'
import {
  ConvertSingleImage,
  TriggerBlobDownload,
  type ImageOutputFormat,
} from '@/utils/ImageConverter'

/** 待转换文件项 */
type ConverterFileItem = {
  uid: string
  file: File
  previewUrl: string
}

export default defineComponent({
  name: 'ImageConverterView',
  data() {
    return {
      isDragging: false,
      isConverting: false,
      convertedCount: 0,
      statusText: '',
      targetFormat: 'jpeg' as ImageOutputFormat,
      quality: 92,
      selectedFiles: [] as ConverterFileItem[],
    }
  },
  computed: {
    /**
     * 是否显示质量滑杆
     * @returns 布尔值
     */
    showQuality(): boolean {
      return this.targetFormat === 'jpeg' || this.targetFormat === 'webp'
    },
    /**
     * 转换按钮文案
     * @returns 文案
     */
    convertButtonLabel(): string {
      if (!this.isConverting) {
        return this.selectedFiles.length > 1
          ? `开始转换（${this.selectedFiles.length} 张）`
          : '开始转换'
      }
      return `转换中（${this.convertedCount}/${this.selectedFiles.length}）`
    },
  },
  /**
   * 挂载时同步页面标题
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', '图片格式转换')
  },
  /**
   * 卸载时释放预览 URL
   */
  beforeUnmount() {
    this.ClearFiles()
  },
  methods: {
    /**
     * 格式化文件大小
     * @param bytes 字节数
     * @returns 可读字符串
     */
    FormatSize(bytes: number): string {
      return FormatFileSize(bytes)
    },
    /**
     * 追加图片文件
     * @param files 文件列表
     */
    AppendFiles(files: File[]) {
      const imageFiles = files.filter((file) => file.type.startsWith('image/'))
      if (!imageFiles.length) {
        return
      }

      const next = imageFiles.map((file) => ({
        uid: CreateUploadUid(),
        file,
        previewUrl: URL.createObjectURL(file),
      }))
      this.selectedFiles = [...this.selectedFiles, ...next]
      this.statusText = ''
    },
    /**
     * 处理文件选择
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
     * 切换输出格式
     * @param event 变更事件
     */
    HandleFormatChange(event: Event) {
      const target = event.target as HTMLSelectElement
      this.targetFormat = target.value as ImageOutputFormat
    },
    /**
     * 调整输出质量
     * @param event 输入事件
     */
    HandleQualityInput(event: Event) {
      const target = event.target as HTMLInputElement
      this.quality = Number(target.value)
    },
    /**
     * 移除单张
     * @param index 下标
     */
    RemoveFile(index: number) {
      const item = this.selectedFiles[index]
      if (item) {
        URL.revokeObjectURL(item.previewUrl)
      }
      this.selectedFiles.splice(index, 1)
    },
    /**
     * 清空列表
     */
    ClearFiles() {
      this.selectedFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl))
      this.selectedFiles = []
      this.statusText = ''
      this.convertedCount = 0
    },
    /**
     * 执行转换并下载
     */
    async ConvertImages() {
      if (!this.selectedFiles.length || this.isConverting) {
        return
      }

      this.isConverting = true
      this.convertedCount = 0
      this.statusText = '正在转换…'
      const quality = this.quality / 100

      try {
        if (this.selectedFiles.length === 1) {
          const result = await ConvertSingleImage(
            this.selectedFiles[0].file,
            this.targetFormat,
            quality,
          )
          this.convertedCount = 1
          TriggerBlobDownload(result.blob, result.fileName)
          this.statusText = `已下载 ${result.fileName}`
          return
        }

        const zip = new JSZip()
        for (let i = 0; i < this.selectedFiles.length; i += 1) {
          const result = await ConvertSingleImage(
            this.selectedFiles[i].file,
            this.targetFormat,
            quality,
          )
          zip.file(result.fileName, result.blob)
          this.convertedCount = i + 1
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' })
        TriggerBlobDownload(zipBlob, 'converted_images.zip')
        this.statusText = `已打包下载 ${this.selectedFiles.length} 张`
      } catch (error) {
        console.error(error)
        this.statusText = '转换失败，请重试'
      } finally {
        this.isConverting = false
      }
    },
  },
})
</script>

<style scoped>
.converter-page {
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
  width: min(860px, 100%);
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
  font-size: 0.9rem;
}

.options-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(49, 65, 95, 0.1);
}

.format-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #31415f;
  font-size: 0.92rem;
}

.field select,
.field input[type='range'] {
  width: 100%;
}

.field select {
  border: 1px solid rgba(49, 65, 95, 0.2);
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
  font: inherit;
}

.file-list {
  margin-top: 18px;
  max-height: 420px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(49, 65, 95, 0.1);
  border-radius: 12px;
  background: #fff;
}

.file-item img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 8px;
  background: #eef2f8;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name,
.file-size {
  margin: 0;
}

.file-name {
  font-size: 0.9rem;
  color: #1f2a3d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  margin-top: 4px;
  font-size: 0.8rem;
  color: #6a7a94;
}

.remove-btn {
  border: none;
  background: transparent;
  color: #9f2f2f;
  font-size: 1.3rem;
  cursor: pointer;
  line-height: 1;
  padding: 4px 8px;
}

.remove-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 18px;
  flex-wrap: wrap;
}

.primary,
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

.status {
  margin: 14px 0 0;
  text-align: center;
  color: #4a5a76;
  font-size: 0.9rem;
}

@media (max-width: 700px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .format-row {
    grid-template-columns: 1fr;
  }
}
</style>
