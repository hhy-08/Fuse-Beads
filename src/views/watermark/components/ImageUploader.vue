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
        accept="image/*"
        multiple
        @change="HandleImageUpload"
      />
      <div class="upload-placeholder">
        <p class="upload-title">
          {{ hasImages ? '继续添加图片' : '点击或拖拽图片到此处' }}
        </p>
        <p class="upload-tip">支持批量上传 jpg、png、gif、webp 等格式</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
/**
 * 水印工具图片上传组件
 * 支持点击与拖拽批量添加图片
 */
import { defineComponent, type PropType } from 'vue'
import type { WatermarkImageItem } from '../types'

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
    }
  },
  computed: {
    /**
     * 是否已有图片
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
    HandleImageUpload(event: Event) {
      const target = event.target as HTMLInputElement
      const files = Array.from(target.files || [])
      this.AddImages(files)
      target.value = ''
    },
    /**
     * 处理拖拽放下
     * @param event 拖拽事件
     */
    HandleDrop(event: DragEvent) {
      this.isDragging = false
      const files = Array.from(event.dataTransfer?.files || [])
      this.AddImages(files)
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
     * 读取并添加图片文件
     * @param files 文件列表
     */
    AddImages(files: File[]) {
      const imageFiles = files.filter((file) => file.type.startsWith('image/'))
      if (!imageFiles.length) {
        return
      }

      const newImages: WatermarkImageItem[] = []
      let loadedCount = 0

      imageFiles.forEach((file) => {
        const reader = new FileReader()
        reader.onload = () => {
          const url = String(reader.result || '')
          const image = new Image()
          image.onload = () => {
            newImages.push({
              file,
              url,
              image,
              status: 'pending',
              processedData: '',
            })
            loadedCount += 1
            if (loadedCount === imageFiles.length) {
              this.$emit('ImagesAdded', newImages)
            }
          }
          image.onerror = () => {
            loadedCount += 1
            if (loadedCount === imageFiles.length && newImages.length) {
              this.$emit('ImagesAdded', newImages)
            }
          }
          image.src = url
        }
        reader.readAsDataURL(file)
      })
    },
  },
})
</script>

<style scoped>
.upload-container {
  margin-top: 4px;
}

.upload-area {
  position: relative;
  border: 1.5px dashed rgba(49, 65, 95, 0.28);
  border-radius: 16px;
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.7);
  transition: border-color 0.2s ease, background 0.2s ease;
}

.upload-area.dragging,
.upload-area:hover {
  border-color: #3d6eb0;
  background: rgba(84, 148, 255, 0.1);
}

.upload-area.has-images {
  min-height: 110px;
}

.upload-placeholder {
  text-align: center;
  color: #4a5a76;
  pointer-events: none;
}

.upload-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #1f2a3d;
}

.upload-tip {
  margin: 8px 0 0;
  font-size: 0.9rem;
  color: #6a7a94;
}

.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
</style>
