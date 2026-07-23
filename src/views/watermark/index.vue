<template>
  <div class="watermark-page">
    <header class="hero">
      <div class="hero-copy">
        <p class="brand">{{ appBrand }}</p>
        <h1>图片 / 文本水印</h1>
        <p class="subtitle">
          图片与 txt / docx 等文本加水印，支持位置、平铺、旋转与自由拖动
        </p>
      </div>
      <nav class="hero-nav">
        <router-link to="/">工具列表</router-link>
        <router-link to="/about">关于</router-link>
      </nav>
    </header>

    <main class="workspace">
      <ImageUploader :imageList="imageList" @ImagesAdded="HandleImagesAdded" />

      <ImageList
        :imageList="imageList"
        :currentIndex="currentImageIndex"
        @Select="HandleImageSelect"
        @Remove="HandleImageRemove"
      />

      <div v-if="imageList.length" class="batch-actions">
        <button type="button" class="action-btn ghost" @click="HandleReset">
          重新上传
        </button>
        <button
          type="button"
          class="action-btn success"
          :disabled="!currentImage"
          @click="HandleDownloadCurrent"
        >
          下载当前
        </button>
        <button
          type="button"
          class="action-btn primary"
          :disabled="isProcessing"
          @click="HandleProcessAll"
        >
          {{ isProcessing ? '处理中…' : processButtonLabel }}
        </button>
        <button
          v-if="imageList.length > 1"
          type="button"
          class="action-btn success"
          :disabled="!hasProcessedImages"
          @click="HandleDownloadAll"
        >
          打包下载全部
        </button>
      </div>

      <div v-if="currentImage" class="workspace-container">
        <PreviewCanvas
          ref="previewCanvas"
          :image="currentImage"
          :settings="watermarkSettings"
          @UpdatePosition="HandleUpdateWatermarkPos"
          @DownloadCurrent="HandleDownloadCurrent"
        />

        <WatermarkSettings
          :text="watermarkText"
          :color="textColor"
          :fontSize="fontSize"
          :opacity="opacity"
          :position="currentPosition"
          :rotation="rotation"
          :isTiled="isTiled"
          :tileSpacingX="tileSpacingX"
          :tileSpacingY="tileSpacingY"
          :isDraggable="isDraggable"
          @UpdateText="watermarkText = $event"
          @UpdateColor="textColor = $event"
          @UpdateFontSize="fontSize = $event"
          @UpdateOpacity="opacity = $event"
          @UpdatePosition="HandleUpdatePosition"
          @UpdateRotation="rotation = $event"
          @UpdateIsTiled="isTiled = $event"
          @UpdateTileSpacingX="tileSpacingX = $event"
          @UpdateTileSpacingY="tileSpacingY = $event"
          @UpdateIsDraggable="HandleUpdateIsDraggable"
        />
      </div>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 图片 / 文本水印工具页
 * 图片直接加水印；txt / docx 等先排版成预览页再复用同一套水印
 */
import { defineComponent, nextTick } from 'vue'
import JSZip from 'jszip'
import { APPBRAND } from '@/utils/Brand'
import ImageUploader from './components/ImageUploader.vue'
import ImageList from './components/ImageList.vue'
import PreviewCanvas from './components/PreviewCanvas.vue'
import WatermarkSettings from './components/WatermarkSettings.vue'
import type {
  WatermarkImageItem,
  WatermarkPoint,
  WatermarkPositionId,
  WatermarkSettings as WatermarkSettingsType,
} from './types'

type PreviewCanvasExpose = {
  UpdateWatermark: () => void
  ExportDataUrl: () => string
  ProcessImage: (img: WatermarkImageItem) => Promise<void>
}

export default defineComponent({
  name: 'WatermarkView',
  components: {
    ImageUploader,
    ImageList,
    PreviewCanvas,
    WatermarkSettings,
  },
  data() {
    return {
      appBrand: APPBRAND,
      imageList: [] as WatermarkImageItem[],
      currentImageIndex: -1,
      isProcessing: false,
      watermarkText: '图片水印',
      textColor: '#000000',
      fontSize: 24,
      opacity: 50,
      currentPosition: 'bottomRight' as WatermarkPositionId,
      rotation: 0,
      isTiled: false,
      tileSpacingX: 100,
      tileSpacingY: 100,
      isDraggable: false,
      watermarkPos: { x: 0, y: 0 } as WatermarkPoint,
    }
  },
  computed: {
    /**
     * 当前选中图片
     * @returns 图片项或 null
     */
    currentImage(): WatermarkImageItem | null {
      if (this.currentImageIndex < 0) {
        return null
      }
      return this.imageList[this.currentImageIndex] || null
    },
    /**
     * 是否存在已处理图片
     * @returns 布尔值
     */
    hasProcessedImages(): boolean {
      return this.imageList.some((img) => img.status === 'completed')
    },
    /**
     * 批量处理按钮文案
     * @returns 文案
     */
    processButtonLabel(): string {
      return this.imageList.length > 1 ? '批量添加水印' : '应用水印'
    },
    /**
     * 汇总水印设置
     * @returns 设置对象
     */
    watermarkSettings(): WatermarkSettingsType {
      return {
        text: this.watermarkText,
        color: this.textColor,
        fontSize: this.fontSize,
        opacity: this.opacity,
        position: this.currentPosition,
        rotation: this.rotation,
        isTiled: this.isTiled,
        tileSpacingX: this.tileSpacingX,
        tileSpacingY: this.tileSpacingY,
        isDraggable: this.isDraggable,
        watermarkPos: this.watermarkPos,
      }
    },
  },
  /**
   * 挂载时同步页面标题
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', '图片水印工具')
  },
  methods: {
    /**
     * 获取预览画布组件实例
     * @returns 画布暴露方法
     */
    GetPreviewCanvas(): PreviewCanvasExpose | null {
      return (this.$refs.previewCanvas as PreviewCanvasExpose) || null
    },
    /**
     * 刷新预览
     */
    RefreshPreview() {
      nextTick(() => {
        const canvas = this.GetPreviewCanvas()
        canvas?.UpdateWatermark()
      })
    },
    /**
     * 追加上传图片
     * @param newImages 新图片列表
     */
    HandleImagesAdded(newImages: WatermarkImageItem[]) {
      this.imageList = [...this.imageList, ...newImages]
      if (this.currentImageIndex === -1 && this.imageList.length) {
        this.currentImageIndex = 0
      }
      this.RefreshPreview()
    },
    /**
     * 选择图片
     * @param index 下标
     */
    HandleImageSelect(index: number) {
      this.currentImageIndex = index
      this.RefreshPreview()
    },
    /**
     * 删除图片
     * @param index 下标
     */
    HandleImageRemove(index: number) {
      this.imageList.splice(index, 1)
      if (!this.imageList.length) {
        this.currentImageIndex = -1
        return
      }
      if (this.currentImageIndex === index) {
        this.currentImageIndex = Math.min(index, this.imageList.length - 1)
      } else if (this.currentImageIndex > index) {
        this.currentImageIndex -= 1
      }
      this.RefreshPreview()
    },
    /**
     * 清空列表重新上传
     */
    HandleReset() {
      this.imageList = []
      this.currentImageIndex = -1
    },
    /**
     * 更新九宫格位置
     * @param value 位置 ID
     */
    HandleUpdatePosition(value: WatermarkPositionId) {
      this.currentPosition = value
      // 单点水印切预设时退出拖动；平铺时保留拖动，用预设作为网格起点
      if (!this.isTiled) {
        this.isDraggable = false
      }
    },
    /**
     * 开启/关闭自由拖动
     * @param value 是否可拖动
     */
    HandleUpdateIsDraggable(value: boolean) {
      this.isDraggable = value
      if (!value || !this.currentImage) {
        return
      }
      // 刚开启拖动时，用当前预设位置初始化偏移，避免从 (0,0) 跳变
      if (this.watermarkPos.x === 0 && this.watermarkPos.y === 0) {
        const image = this.currentImage.image
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          return
        }
        ctx.font = `${this.fontSize}px Arial, "Noto Sans SC", sans-serif`
        const textWidth = ctx.measureText(this.watermarkText || '').width
        const padding = 20
        const baselineOffset = this.fontSize * 0.8
        const width = image.width
        const height = image.height
        const map: Record<WatermarkPositionId, WatermarkPoint> = {
          topLeft: { x: padding, y: padding + baselineOffset },
          topCenter: {
            x: (width - textWidth) / 2,
            y: padding + baselineOffset,
          },
          topRight: {
            x: width - textWidth - padding,
            y: padding + baselineOffset,
          },
          middleLeft: {
            x: padding,
            y: height / 2 + baselineOffset / 2,
          },
          center: {
            x: (width - textWidth) / 2,
            y: height / 2 + baselineOffset / 2,
          },
          middleRight: {
            x: width - textWidth - padding,
            y: height / 2 + baselineOffset / 2,
          },
          bottomLeft: { x: padding, y: height - padding },
          bottomCenter: {
            x: (width - textWidth) / 2,
            y: height - padding,
          },
          bottomRight: {
            x: width - textWidth - padding,
            y: height - padding,
          },
        }
        this.watermarkPos = map[this.currentPosition]
      }
    },
    /**
     * 更新拖动坐标
     * @param pos 坐标
     */
    HandleUpdateWatermarkPos(pos: WatermarkPoint) {
      this.watermarkPos = pos
    },
    /**
     * 构建下载文件名
     * @param fileName 原始文件名
     * @returns 水印后文件名
     */
    BuildDownloadName(fileName: string): string {
      const base = fileName.replace(/\.[^.]+$/, '') || 'file'
      return `watermarked_${base}.png`
    },
    /**
     * 触发浏览器下载
     * @param dataUrl PNG dataURL
     * @param fileName 下载文件名
     */
    TriggerDownload(dataUrl: string, fileName: string) {
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = fileName
      link.click()
    },
    /**
     * 下载当前预览图（带水印）
     */
    HandleDownloadCurrent() {
      if (!this.currentImage) {
        return
      }
      const canvas = this.GetPreviewCanvas()
      if (!canvas) {
        return
      }

      const dataUrl = canvas.ExportDataUrl()
      if (!dataUrl) {
        return
      }

      this.currentImage.processedData = dataUrl
      this.currentImage.status = 'completed'
      this.TriggerDownload(
        dataUrl,
        this.BuildDownloadName(this.currentImage.file.name),
      )
    },
    /**
     * 批量处理全部图片
     */
    async HandleProcessAll() {
      const canvas = this.GetPreviewCanvas()
      if (!canvas || !this.imageList.length) {
        return
      }

      this.isProcessing = true
      const currentIdx = this.currentImageIndex

      try {
        for (let i = 0; i < this.imageList.length; i += 1) {
          const img = this.imageList[i]
          if (img.status === 'completed') {
            continue
          }

          img.status = 'processing'
          this.currentImageIndex = i
          await nextTick()
          await new Promise((resolve) => setTimeout(resolve, 80))

          try {
            const preview = this.GetPreviewCanvas()
            if (!preview) {
              throw new Error('预览画布不可用')
            }
            await preview.ProcessImage(img)
            img.status = 'completed'
          } catch (error) {
            console.error(error)
            img.status = 'error'
          }
        }
      } finally {
        this.isProcessing = false
        this.currentImageIndex = currentIdx
        this.RefreshPreview()
      }
    },
    /**
     * 打包下载已处理图片
     */
    async HandleDownloadAll() {
      const processedImages = this.imageList.filter(
        (img) => img.status === 'completed' && img.processedData,
      )
      if (!processedImages.length) {
        return
      }

      const zip = new JSZip()
      processedImages.forEach((img, index) => {
        const baseName = img.file.name.replace(/\.[^.]+$/, '') || `image_${index + 1}`
        const data = img.processedData.split(',')[1] || ''
        zip.file(`watermarked_${baseName}.png`, data, { base64: true })
      })

      const content = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(content)
      link.download = 'watermarked_images.zip'
      link.click()
      URL.revokeObjectURL(link.href)
    },
  },
})
</script>

<style scoped>
.watermark-page {
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
  width: min(1200px, 100%);
  margin: 0 auto;
  padding: 28px 6vw 48px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.batch-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 10px 14px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font: inherit;
  font-weight: 500;
}

.action-btn.ghost {
  border: 1px solid rgba(49, 65, 95, 0.25);
  background: transparent;
  color: #31415f;
}

.action-btn.primary {
  background: #31486f;
  color: #fff8ef;
}

.action-btn.success {
  background: #2e7d5a;
  color: #fff;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.workspace-container {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(260px, 1fr);
  gap: 18px;
  align-items: start;
}

@media (max-width: 900px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .workspace-container {
    grid-template-columns: 1fr;
  }
}
</style>
