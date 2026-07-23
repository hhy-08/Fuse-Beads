<template>
  <div class="upload-container">
    <div
      class="upload-area"
      :class="{ dragging: isDragging, 'has-images': hasImages }"
      @drop.prevent="HandleDrop"
      @dragover.prevent="HandleDragOver"
      @dragleave.prevent="HandleDragLeave"
    >
      <input
        ref="fileInput"
        type="file"
        class="file-input"
        accept="image/*,.txt,.md,.csv,.json,.html,.htm,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/html,text/csv,application/json"
        multiple
        @change="HandleFileUpload"
      />
      <div class="upload-placeholder">
        <p class="upload-title">
          {{ hasImages ? '继续添加文件' : '点击或拖拽文件到此处' }}
        </p>
        <p class="upload-tip">
          图片：jpg / png / gif / webp；文本：txt / md / csv / json / html /
          docx（不支持旧版 .doc）
        </p>
        <p v-if="statusText" class="upload-status" :class="{ error: hasError }">
          {{ statusText }}
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
/**
 * 水印工具上传组件
 * 支持图片与文本文档（txt / docx 等）批量添加
 */
import { defineComponent, type PropType } from 'vue'
import type { WatermarkImageItem } from '../types'
import {
  IsLegacyDocFile,
  IsWatermarkDocumentFile,
  LoadDocumentAsWatermarkItems,
} from '@/utils/TextDocumentWatermark'

export default defineComponent({
  name: 'WatermarkImageUploader',
  props: {
    imageList: {
      type: Array as PropType<WatermarkImageItem[]>,
      required: true,
    },
  },
  emits: ['ImagesAdded'],
  data() {
    return {
      isDragging: false,
      statusText: '',
      hasError: false,
      isLoading: false,
    }
  },
  computed: {
    /**
     * 是否已有条目
     * @returns 布尔值
     */
    hasImages(): boolean {
      return this.imageList.length > 0
    },
  },
  methods: {
    /**
     * 处理文件选择
     * @param event 变更事件
     */
    HandleFileUpload(event: Event) {
      const target = event.target as HTMLInputElement
      const files = Array.from(target.files || [])
      this.AddFiles(files)
      target.value = ''
    },
    /**
     * 处理拖拽放下
     * @param event 拖拽事件
     */
    HandleDrop(event: DragEvent) {
      this.isDragging = false
      const files = Array.from(event.dataTransfer?.files || [])
      this.AddFiles(files)
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
     * 读取并添加图片 / 文本文档
     * @param files 文件列表
     */
    async AddFiles(files: File[]) {
      if (this.isLoading || !files.length) {
        return
      }

      this.isLoading = true
      this.hasError = false
      this.statusText = '正在读取文件…'

      const imageFiles = files.filter((file) => file.type.startsWith('image/'))
      const legacyDocs = files.filter((file) => IsLegacyDocFile(file))
      const docFiles = files.filter((file) => IsWatermarkDocumentFile(file))

      if (legacyDocs.length) {
        this.hasError = true
        this.statusText = `暂不支持旧版 .doc（${legacyDocs
          .map((f) => f.name)
          .join('、')}），请另存为 .docx`
      }

      const newItems: WatermarkImageItem[] = []

      try {
        if (imageFiles.length) {
          const images = await this.LoadImageItems(imageFiles)
          newItems.push(...images)
        }

        for (const file of docFiles) {
          const pages = await LoadDocumentAsWatermarkItems(file)
          newItems.push(...pages)
        }

        if (newItems.length) {
          this.$emit('ImagesAdded', newItems)
          if (!this.hasError) {
            this.statusText = `已添加 ${newItems.length} 项`
          }
        } else if (!legacyDocs.length) {
          this.hasError = true
          this.statusText = '未识别到可加水印的图片或文本文件'
        }
      } catch (error) {
        console.error(error)
        this.hasError = true
        this.statusText =
          error instanceof Error ? error.message : '文件读取失败'
      } finally {
        this.isLoading = false
      }
    },
    /**
     * 加载图片为列表项
     * @param imageFiles 图片文件
     * @returns 列表项
     */
    LoadImageItems(imageFiles: File[]): Promise<WatermarkImageItem[]> {
      return new Promise((resolve) => {
        const newImages: WatermarkImageItem[] = []
        let loadedCount = 0

        if (!imageFiles.length) {
          resolve([])
          return
        }

        imageFiles.forEach((file) => {
          const reader = new FileReader()
          reader.onload = () => {
            const url = String(reader.result || '')
            const image = new Image()
            image.onload = () => {
              newImages.push({
                file,
                displayName: file.name,
                kind: 'image',
                url,
                image,
                status: 'pending',
                processedData: '',
              })
              loadedCount += 1
              if (loadedCount === imageFiles.length) {
                resolve(newImages)
              }
            }
            image.onerror = () => {
              loadedCount += 1
              if (loadedCount === imageFiles.length) {
                resolve(newImages)
              }
            }
            image.src = url
          }
          reader.onerror = () => {
            loadedCount += 1
            if (loadedCount === imageFiles.length) {
              resolve(newImages)
            }
          }
          reader.readAsDataURL(file)
        })
      })
    },
  },
})
</script>

<style scoped>
.upload-container {
  width: 100%;
}

.upload-area {
  position: relative;
  border: 1.5px dashed rgba(49, 65, 95, 0.28);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
  min-height: 140px;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.upload-area.dragging,
.upload-area:hover {
  border-color: #3d6eb0;
  background: rgba(84, 148, 255, 0.12);
}

.upload-area.has-images {
  min-height: 110px;
}

.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: inherit;
  padding: 24px 16px;
  text-align: center;
  pointer-events: none;
}

.upload-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #1f2a3d;
}

.upload-tip {
  margin: 0;
  color: #6a7a94;
  font-size: 0.88rem;
  line-height: 1.5;
  max-width: 560px;
}

.upload-status {
  margin: 6px 0 0;
  font-size: 0.85rem;
  color: #1f6b45;
}

.upload-status.error {
  color: #b04040;
}
</style>
