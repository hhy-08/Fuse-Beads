<template>
  <div class="crop-page">
    <ToolPageHero title="图片裁剪" subtitle="固定比例、圆形与圆角裁切，适合头像与素材预处理，全部本地完成" />

    <main class="workspace">
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        hidden
        @change="HandleInputChange"
      />

      <section
        v-if="!imageSrc"
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
          <span class="upload-tip">支持 JPG / PNG / WebP / GIF，单张本地裁切</span>
        </div>
      </section>

      <template v-else>
        <section class="editor-card">
          <div class="editor-toolbar">
            <div class="file-meta">
              <span class="file-name">{{ fileName }}</span>
              <span class="file-size">
                {{ imageWidth }} × {{ imageHeight }}
              </span>
            </div>
            <button type="button" class="ghost" @click="HandleReplaceImage">
              更换图片
            </button>
          </div>

          <CropCanvas
            :image-src="imageSrc"
            :image-width="imageWidth"
            :image-height="imageHeight"
            :crop="crop"
            :shape="exportShape"
            :radius-percent="radiusPercent"
            :aspect="lockedAspect"
            @update:crop="HandleCropUpdate"
            @reset="HandleResetCrop"
          />
        </section>

        <section class="options-card">
          <h2>裁切参数</h2>

          <div class="mode-row">
            <span class="label">形态</span>
            <div class="chip-group">
              <button
                v-for="item in modeOptions"
                :key="item.id"
                type="button"
                class="mode-chip"
                :class="{ active: cropMode === item.id }"
                @click="HandleModeChange(item.id)"
              >
                {{ item.label }}
              </button>
            </div>
          </div>

          <div v-if="cropMode === 'ratio'" class="mode-row">
            <span class="label">比例</span>
            <div class="chip-group">
              <button
                v-for="item in ratioPresets"
                :key="item.id"
                type="button"
                class="mode-chip"
                :class="{ active: ratioPreset === item.id }"
                @click="HandleRatioPreset(item.id)"
              >
                {{ item.label }}
              </button>
            </div>
          </div>

          <div v-if="cropMode === 'ratio' && ratioPreset === 'custom'" class="custom-ratio">
            <label class="field inline">
              <span>宽</span>
              <input
                type="number"
                min="1"
                max="99"
                step="1"
                :value="customRatioW"
                @input="HandleCustomRatioW"
              />
            </label>
            <span class="ratio-sep">:</span>
            <label class="field inline">
              <span>高</span>
              <input
                type="number"
                min="1"
                max="99"
                step="1"
                :value="customRatioH"
                @input="HandleCustomRatioH"
              />
            </label>
          </div>

          <div v-if="cropMode === 'rounded'" class="mode-row column">
            <label class="field">
              <span>圆角 {{ radiusPercent }}%（相对裁切框短边）</span>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                :value="radiusPercent"
                @input="HandleRadiusInput"
              />
            </label>
          </div>

          <p class="crop-info">
            选区 {{ Math.round(crop.width) }} × {{ Math.round(crop.height) }}
            px · 位置 ({{ Math.round(crop.x) }}, {{ Math.round(crop.y) }})
          </p>

          <div class="actions">
            <button type="button" class="ghost" @click="HandleResetCrop">
              重置裁切框
            </button>
            <button
              type="button"
              class="primary"
              :disabled="isBusy"
              @click="HandleDownload"
            >
              {{ isBusy ? '处理中…' : '下载 PNG' }}
            </button>
            <button
              type="button"
              class="primary soft"
              :disabled="isBusy"
              @click="SendToGenerator"
            >
              送入拼豆生成器
            </button>
            <button type="button" class="ghost" @click="HandleClear">
              清空
            </button>
          </div>
          <p v-if="statusText" class="status" :class="{ error: hasError }">
            {{ statusText }}
          </p>
        </section>
      </template>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 图片裁剪工具页
 * 自由矩形 / 固定比例 / 圆形 / 圆角裁切，导出 PNG 或送入拼豆生成器
 */
import { defineComponent } from 'vue'
import router from '@/router'

import {
  CreateDefaultCropRect,
  DownloadDataUrl,
  ExportCroppedImage,
  GetRoundedRadius,
  LoadImageFromFile,
  NormalizeCropRect,
  ParseAspectRatio,
  type CropRect,
  type CropShape,
} from '@/utils/ImageCrop'
import CropCanvas from './components/CropCanvas.vue'
import ToolPageHero from '@/components/ToolPageHero.vue'

/** 页面形态模式 */
type CropMode = 'free' | 'ratio' | 'circle' | 'rounded'

/** 比例预设 id */
type RatioPresetId =
  | '1:1'
  | '4:3'
  | '3:4'
  | '16:9'
  | '9:16'
  | 'custom'

const MAX_FILE_SIZE = 50 * 1024 * 1024

export default defineComponent({
  name: 'ImageCropView',
  components: {
    ToolPageHero,
    CropCanvas,
  },
  data() {
    return {
      isDragging: false,
      isBusy: false,
      statusText: '',
      hasError: false,
      fileName: '',
      imageSrc: '',
      imageEl: null as HTMLImageElement | null,
      imageWidth: 0,
      imageHeight: 0,
      crop: { x: 0, y: 0, width: 0, height: 0 } as CropRect,
      cropMode: 'free' as CropMode,
      ratioPreset: '1:1' as RatioPresetId,
      customRatioW: 1,
      customRatioH: 1,
      radiusPercent: 12,
      modeOptions: [
        { id: 'free' as CropMode, label: '自由矩形' },
        { id: 'ratio' as CropMode, label: '固定比例' },
        { id: 'circle' as CropMode, label: '圆形' },
        { id: 'rounded' as CropMode, label: '圆角' },
      ],
      ratioPresets: [
        { id: '1:1' as RatioPresetId, label: '1:1' },
        { id: '4:3' as RatioPresetId, label: '4:3' },
        { id: '3:4' as RatioPresetId, label: '3:4' },
        { id: '16:9' as RatioPresetId, label: '16:9' },
        { id: '9:16' as RatioPresetId, label: '9:16' },
        { id: 'custom' as RatioPresetId, label: '自定义' },
      ],
    }
  },
  computed: {
    /**
     * 导出用形态
     */
    exportShape(): CropShape {
      if (this.cropMode === 'circle') {
        return 'circle'
      }
      if (this.cropMode === 'rounded') {
        return 'rounded'
      }
      return 'rect'
    },
    /**
     * 当前锁定宽高比
     */
    lockedAspect(): number | undefined {
      if (this.cropMode === 'circle') {
        return 1
      }
      if (this.cropMode !== 'ratio') {
        return undefined
      }
      if (this.ratioPreset === 'custom') {
        return ParseAspectRatio(`${this.customRatioW}:${this.customRatioH}`)
      }
      return ParseAspectRatio(this.ratioPreset)
    },
  },
  /**
   * 挂载时同步页面标题
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', '图片裁剪')
  },
  /**
   * 卸载时释放 blob URL
   */
  beforeUnmount() {
    if (this.imageSrc.startsWith('blob:')) {
      URL.revokeObjectURL(this.imageSrc)
    }
  },
  methods: {
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
     * 加载并初始化裁切
     * @param file 图片文件
     */
    async LoadFile(file: File) {
      if (!file.type.startsWith('image/')) {
        this.SetStatus('请选择图片文件', true)
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        this.SetStatus('文件超过 50MB 限制', true)
        return
      }
      try {
        this.isBusy = true
        if (this.imageSrc.startsWith('blob:')) {
          URL.revokeObjectURL(this.imageSrc)
        }
        const image = await LoadImageFromFile(file)
        this.imageEl = image
        this.imageSrc = image.src
        this.fileName = file.name
        this.imageWidth = image.naturalWidth || image.width
        this.imageHeight = image.naturalHeight || image.height
        this.HandleResetCrop()
        this.SetStatus('图片已加载，拖动选区进行裁切')
      } catch (error) {
        this.SetStatus(
          error instanceof Error ? error.message : '加载失败',
          true,
        )
      } finally {
        this.isBusy = false
      }
    },
    /**
     * 更新裁切框
     * @param crop 新选区
     */
    HandleCropUpdate(crop: CropRect) {
      this.crop = crop
    },
    /**
     * 重置为居中默认选区
     */
    HandleResetCrop() {
      if (!this.imageWidth || !this.imageHeight) {
        return
      }
      this.crop = CreateDefaultCropRect(
        { width: this.imageWidth, height: this.imageHeight },
        this.lockedAspect,
      )
      this.SetStatus('已重置裁切框')
    },
    /**
     * 切换形态
     * @param mode 形态
     */
    HandleModeChange(mode: CropMode) {
      this.cropMode = mode
      if (!this.imageWidth) {
        return
      }
      this.crop = CreateDefaultCropRect(
        { width: this.imageWidth, height: this.imageHeight },
        this.lockedAspect,
      )
    },
    /**
     * 切换比例预设
     * @param preset 预设 id
     */
    HandleRatioPreset(preset: RatioPresetId) {
      this.ratioPreset = preset
      if (!this.imageWidth) {
        return
      }
      const aspect =
        preset === 'custom'
          ? ParseAspectRatio(`${this.customRatioW}:${this.customRatioH}`)
          : ParseAspectRatio(preset)
      this.crop = CreateDefaultCropRect(
        { width: this.imageWidth, height: this.imageHeight },
        aspect,
      )
    },
    /**
     * 自定义比例宽
     * @param event 输入事件
     */
    HandleCustomRatioW(event: Event) {
      const value = Number((event.target as HTMLInputElement).value)
      this.customRatioW = Math.max(1, Math.min(99, value || 1))
      this.ApplyCustomRatio()
    },
    /**
     * 自定义比例高
     * @param event 输入事件
     */
    HandleCustomRatioH(event: Event) {
      const value = Number((event.target as HTMLInputElement).value)
      this.customRatioH = Math.max(1, Math.min(99, value || 1))
      this.ApplyCustomRatio()
    },
    /**
     * 应用自定义比例到当前选区
     */
    ApplyCustomRatio() {
      if (this.cropMode !== 'ratio' || this.ratioPreset !== 'custom') {
        return
      }
      const aspect = ParseAspectRatio(
        `${this.customRatioW}:${this.customRatioH}`,
      )
      this.crop = NormalizeCropRect(
        this.crop,
        { width: this.imageWidth, height: this.imageHeight },
        aspect,
      )
    },
    /**
     * 圆角滑块
     * @param event 输入事件
     */
    HandleRadiusInput(event: Event) {
      this.radiusPercent = Number((event.target as HTMLInputElement).value)
    },
    /**
     * 触发更换图片
     */
    HandleReplaceImage() {
      this.HandlePickFile()
    },
    /**
     * 清空当前图片
     */
    HandleClear() {
      if (this.imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(this.imageSrc)
      }
      this.imageSrc = ''
      this.imageEl = null
      this.fileName = ''
      this.imageWidth = 0
      this.imageHeight = 0
      this.crop = { x: 0, y: 0, width: 0, height: 0 }
      this.SetStatus('')
    },
    /**
     * 确保有可用的 HTMLImageElement
     * @returns 图片元素
     */
    async EnsureImageElement(): Promise<HTMLImageElement> {
      if (this.imageEl && this.imageEl.complete) {
        return this.imageEl
      }
      return new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => {
          this.imageEl = image
          resolve(image)
        }
        image.onerror = () => reject(new Error('图片加载失败'))
        image.src = this.imageSrc
      })
    },
    /**
     * 导出当前选区为 PNG dataURL
     * @returns dataURL
     */
    async BuildExportDataUrl(): Promise<string> {
      const image = await this.EnsureImageElement()
      const radius = GetRoundedRadius(this.crop, this.radiusPercent)
      return ExportCroppedImage({
        image,
        crop: this.crop,
        shape: this.exportShape,
        radius,
      })
    },
    /**
     * 下载裁切结果
     */
    async HandleDownload() {
      if (!this.imageSrc) {
        return
      }
      try {
        this.isBusy = true
        const dataUrl = await this.BuildExportDataUrl()
        const base = this.fileName.replace(/\.[^.]+$/, '') || 'cropped'
        DownloadDataUrl(dataUrl, `${base}_crop.png`)
        this.SetStatus('已开始下载 PNG')
      } catch (error) {
        this.SetStatus(
          error instanceof Error ? error.message : '导出失败',
          true,
        )
      } finally {
        this.isBusy = false
      }
    },
    /**
     * 将结果送入拼豆生成器（图片模式）
     */
    async SendToGenerator() {
      if (!this.imageSrc) {
        this.SetStatus('请先上传图片', true)
        return
      }
      try {
        this.isBusy = true
        const dataUrl = await this.BuildExportDataUrl()
        this.$store.commit('SETSOURCEMODE', 'image')
        this.$store.commit('SETIMAGEDATAURL', dataUrl)
        this.$store.commit(
          'SETIMAGEMAXWIDTH',
          Math.min(128, Math.max(8, Math.round(this.crop.width))),
        )
        this.$store.commit(
          'SETIMAGEMAXHEIGHT',
          Math.min(128, Math.max(8, Math.round(this.crop.height))),
        )
        this.$store.commit('SETIMAGECLARITY', 10)
        this.$store.commit('SETIMAGEALPHATHRESHOLD', 1)
        this.SetStatus('已送入拼豆生成器')
        void router.push('/generator')
      } catch (error) {
        this.SetStatus(
          error instanceof Error ? error.message : '发送失败',
          true,
        )
      } finally {
        this.isBusy = false
      }
    },
  },
})
</script>

<style scoped>
.crop-page {
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
  min-height: 200px;
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

.editor-card,
.options-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(49, 65, 95, 0.1);
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
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
  font-size: 0.85rem;
  color: #6a7a94;
}

.options-card h2 {
  margin: 0 0 16px;
  font-size: 1.1rem;
  color: #1f2a3d;
}

.mode-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.mode-row.column {
  flex-direction: column;
}

.label {
  flex-shrink: 0;
  width: 48px;
  padding-top: 8px;
  color: #31415f;
  font-size: 0.92rem;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mode-chip {
  border: 1px solid rgba(49, 65, 95, 0.22);
  background: #fff;
  color: #31415f;
  border-radius: 999px;
  padding: 7px 12px;
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
}

.mode-chip.active {
  background: #31486f;
  border-color: #31486f;
  color: #fff8ef;
}

.custom-ratio {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 14px 60px;
  flex-wrap: wrap;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #31415f;
  font-size: 0.92rem;
  width: 100%;
}

.field.inline {
  flex-direction: row;
  align-items: center;
  width: auto;
  gap: 6px;
}

.field input[type='range'] {
  width: 100%;
  max-width: 360px;
}

.field input[type='number'] {
  width: 64px;
  border: 1px solid rgba(49, 65, 95, 0.2);
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
}

.ratio-sep {
  color: #6a7a94;
  font-weight: 600;
}

.crop-info {
  margin: 4px 0 0;
  color: #6a7a94;
  font-size: 0.88rem;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 18px;
  flex-wrap: wrap;
}

.primary,
.ghost {
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

.primary.soft {
  background: #3d6eb0;
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

.status.error {
  color: #9f2f2f;
}

@media (max-width: 800px) {
  

  .custom-ratio {
    margin-left: 0;
  }

  .label {
    width: auto;
    padding-top: 0;
  }
}
</style>
