<template>
  <div class="ico-page">
    <header class="hero">
      <div class="hero-copy">
        <p class="brand">{{ appBrand }}</p>
        <h1>图片转 ICO</h1>
        <p class="subtitle">
          将 JPG / PNG / WebP 等转为多尺寸 ICO 图标，本地完成，单张直下、多张打包 ZIP
        </p>
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
          <span class="upload-tip">支持多选；建议使用正方形或透明底 PNG</span>
        </label>
      </section>

      <section v-if="selectedFiles.length" class="options-card">
        <div class="field">
          <span>图标尺寸（可多选）</span>
          <div class="size-grid">
            <button
              v-for="size in sizeOptions"
              :key="size"
              type="button"
              class="size-chip"
              :class="{ active: selectedSizes.includes(size) }"
              @click="HandleToggleSize(size)"
            >
              {{ size }}×{{ size }}
            </button>
          </div>
        </div>

        <div class="field fit-field">
          <span>缩放方式</span>
          <div class="fit-row">
            <button
              v-for="opt in fitOptions"
              :key="opt.id"
              type="button"
              class="size-chip"
              :class="{ active: fitMode === opt.id }"
              @click="HandleFitChange(opt.id)"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="hint">{{ fitHint }}</p>
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
            :disabled="isConverting || !selectedSizes.length"
            @click="ConvertToIco"
          >
            {{ convertButtonLabel }}
          </button>
        </div>

        <p v-if="statusText" class="status" :class="{ error: hasError }">
          {{ statusText }}
        </p>
      </section>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 图片转 ICO 工具页
 * 多尺寸 PNG 嵌入式 ICO，单下或 ZIP 打包
 */
import { defineComponent } from 'vue'
import JSZip from 'jszip'
import { APPBRAND } from '@/utils/Brand'
import { CreateUploadUid, FormatFileSize } from '@/utils/ImageCompress'
import {
  ConvertImageToIco,
  DownloadIcoBlob,
  ICO_SIZE_OPTIONS,
  type IcoFitMode,
  type IcoSize,
} from '@/utils/ImageToIco'

/** 待转换文件项 */
type IcoFileItem = {
  uid: string
  file: File
  previewUrl: string
}

export default defineComponent({
  name: 'ImageToIcoView',
  data() {
    return {
      appBrand: APPBRAND,
      isDragging: false,
      isConverting: false,
      convertedCount: 0,
      statusText: '',
      hasError: false,
      fitMode: 'contain' as IcoFitMode,
      sizeOptions: [...ICO_SIZE_OPTIONS] as IcoSize[],
      selectedSizes: [16, 32, 48, 256] as number[],
      selectedFiles: [] as IcoFileItem[],
      fitOptions: [
        { id: 'contain' as IcoFitMode, label: '完整放入' },
        { id: 'cover' as IcoFitMode, label: '铺满裁切' },
        { id: 'stretch' as IcoFitMode, label: '拉伸填满' },
      ],
    }
  },
  computed: {
    /**
     * 缩放方式说明
     * @returns 文案
     */
    fitHint(): string {
      if (this.fitMode === 'cover') {
        return '等比放大铺满画布，多余边缘裁掉'
      }
      if (this.fitMode === 'stretch') {
        return '忽略比例直接拉伸到正方形'
      }
      return '等比缩小完整放入，透明底留白'
    },
    /**
     * 转换按钮文案
     * @returns 文案
     */
    convertButtonLabel(): string {
      if (!this.isConverting) {
        return this.selectedFiles.length > 1
          ? `转为 ICO（${this.selectedFiles.length} 张）`
          : '转为 ICO 并下载'
      }
      return `转换中（${this.convertedCount}/${this.selectedFiles.length}）`
    },
  },
  /**
   * 挂载时同步页面标题
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', '图片转 ICO')
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
     * 设置状态文案
     * @param text 文案
     * @param isError 是否错误
     */
    SetStatus(text: string, isError = false) {
      this.statusText = text
      this.hasError = isError
    },
    /**
     * 追加图片文件
     * @param files 文件列表
     */
    AppendFiles(files: File[]) {
      const imageFiles = files.filter((file) => file.type.startsWith('image/'))
      if (!imageFiles.length) {
        this.SetStatus('请选择图片文件', true)
        return
      }
      const next = imageFiles.map((file) => ({
        uid: CreateUploadUid(),
        file,
        previewUrl: URL.createObjectURL(file),
      }))
      this.selectedFiles = [...this.selectedFiles, ...next]
      this.SetStatus('')
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
     * 切换尺寸选中
     * @param size 尺寸
     */
    HandleToggleSize(size: number) {
      if (this.selectedSizes.includes(size)) {
        if (this.selectedSizes.length === 1) {
          return
        }
        this.selectedSizes = this.selectedSizes.filter((item) => item !== size)
        return
      }
      this.selectedSizes = [...this.selectedSizes, size].sort((a, b) => a - b)
    },
    /**
     * 切换缩放方式
     * @param fit 适配模式
     */
    HandleFitChange(fit: IcoFitMode) {
      this.fitMode = fit
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
      this.SetStatus('')
      this.convertedCount = 0
    },
    /**
     * 执行转换并下载
     */
    async ConvertToIco() {
      if (
        !this.selectedFiles.length ||
        this.isConverting ||
        !this.selectedSizes.length
      ) {
        return
      }

      this.isConverting = true
      this.convertedCount = 0
      this.SetStatus('正在生成 ICO…')

      try {
        if (this.selectedFiles.length === 1) {
          const result = await ConvertImageToIco(
            this.selectedFiles[0].file,
            this.selectedSizes,
            this.fitMode,
          )
          this.convertedCount = 1
          DownloadIcoBlob(result.blob, result.fileName)
          this.SetStatus(
            `已下载 ${result.fileName}（含 ${result.sizes.join('/')} px）`,
          )
          return
        }

        const zip = new JSZip()
        for (let i = 0; i < this.selectedFiles.length; i += 1) {
          const result = await ConvertImageToIco(
            this.selectedFiles[i].file,
            this.selectedSizes,
            this.fitMode,
          )
          zip.file(result.fileName, result.blob)
          this.convertedCount = i + 1
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        DownloadIcoBlob(zipBlob, 'icons.zip')
        this.SetStatus(`已打包下载 ${this.selectedFiles.length} 个 ICO`)
      } catch (error) {
        this.SetStatus(
          error instanceof Error ? error.message : '转换失败，请重试',
          true,
        )
      } finally {
        this.isConverting = false
      }
    },
  },
})
</script>

<style scoped>
.ico-page {
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
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
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

.field {
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: #31415f;
  font-size: 0.92rem;
  margin-bottom: 16px;
}

.fit-field {
  margin-bottom: 8px;
}

.size-grid,
.fit-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.size-chip {
  border: 1px solid rgba(49, 65, 95, 0.22);
  background: #fff;
  color: #31415f;
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  font: inherit;
  font-size: 0.84rem;
}

.size-chip.active {
  background: #31486f;
  border-color: #31486f;
  color: #fff8ef;
}

.hint {
  margin: 0;
  color: #6a7a94;
  font-size: 0.84rem;
}

.file-list {
  margin-top: 10px;
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

.status.error {
  color: #9f2f2f;
}

@media (max-width: 640px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
