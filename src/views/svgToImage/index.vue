<template>
  <div class="svg-page">
    <ToolPageHero
      title="SVG / 图片互转"
      subtitle="SVG 转 PNG / JPG / WEBP，或将 PNG 等图片转为 SVG（Potrace / ImageTracer / 嵌入）"
    />

    <main class="workspace" :class="{ 'is-to-svg': activeMode === 'to-svg' }">
      <div class="mode-tabs">
        <button
          type="button"
          class="mode-tab"
          :class="{ active: activeMode === 'to-image' }"
          @click="SwitchMode('to-image')"
        >
          SVG → 图片
        </button>
        <button
          type="button"
          class="mode-tab"
          :class="{ active: activeMode === 'to-svg' }"
          @click="SwitchMode('to-svg')"
        >
          图片 → SVG
        </button>
      </div>

      <div class="workspace-body">
        <!-- SVG → 图片 -->
        <template v-if="activeMode === 'to-image'">
          <section class="panel left-panel">
            <div
              class="drop-zone"
              :class="{ 'is-dragover': isDragOver }"
              @dragenter.prevent="HandleDragEnter"
              @dragover.prevent="HandleDragOver"
              @dragleave.prevent="HandleDragLeave"
              @drop.prevent="HandleDrop"
            >
              <label class="drop-label">
                <input
                  type="file"
                  :accept="fileAccept"
                  hidden
                  @change="HandleFileSelect"
                />
                <span class="drop-title">点击或拖拽 SVG 到此处</span>
                <span class="drop-tip">仅支持 .svg 文件</span>
              </label>
            </div>

            <div class="url-row">
              <label class="field grow">
                <span>从 URL 导入</span>
                <input
                  v-model="urlInput"
                  type="url"
                  placeholder="https://example.com/icon.svg"
                  @keydown.enter.prevent="HandleFetchUrl"
                />
              </label>
              <button
                type="button"
                class="ghost url-btn"
                :disabled="isBusy || !urlInput.trim()"
                @click="HandleFetchUrl"
              >
                {{ isBusy ? '加载中…' : '导入' }}
              </button>
            </div>

            <p v-if="sourceName" class="source-meta">
              当前：{{ sourceName }}
              <template v-if="intrinsicWidth && intrinsicHeight">
                · 原始约 {{ intrinsicWidth }} × {{ intrinsicHeight }}
              </template>
            </p>

            <div class="field-row">
              <label class="field">
                <span>输出格式</span>
                <select v-model="outputFormat" @change="ScheduleConvert">
                  <option
                    v-for="item in formats"
                    :key="item.value"
                    :value="item.value"
                  >
                    {{ item.label }}
                  </option>
                </select>
              </label>
              <label v-if="showQuality" class="field">
                <span>质量 {{ quality }}%</span>
                <input
                  v-model.number="quality"
                  type="range"
                  min="40"
                  max="100"
                  step="1"
                  @input="ScheduleConvert"
                />
              </label>
            </div>

            <label class="check">
              <input
                v-model="lockAspect"
                type="checkbox"
                @change="HandleLockAspect"
              />
              <span>锁定宽高比</span>
            </label>

            <div class="field-row">
              <label class="field">
                <span>宽度 (px)</span>
                <input
                  v-model.number="outputWidth"
                  type="number"
                  min="1"
                  :max="maxSide"
                  @input="HandleWidthInput"
                />
              </label>
              <label class="field">
                <span>高度 (px)</span>
                <input
                  v-model.number="outputHeight"
                  type="number"
                  min="1"
                  :max="maxSide"
                  @input="HandleHeightInput"
                />
              </label>
            </div>

            <div class="preset-row">
              <button
                v-for="preset in sizePresets"
                :key="preset.label"
                type="button"
                class="chip"
                @click="ApplyPreset(preset.scale)"
              >
                {{ preset.label }}
              </button>
              <button type="button" class="chip" @click="ResetToIntrinsic">
                原始尺寸
              </button>
            </div>

            <div class="actions">
              <button
                type="button"
                class="ghost"
                :disabled="isBusy || !svgText"
                @click="ClearAll"
              >
                清空
              </button>
              <button
                type="button"
                class="primary"
                :disabled="isBusy || !resultBlob"
                @click="HandleDownload"
              >
                {{ downloadLabel }}
              </button>
            </div>

            <p
              v-if="statusText"
              class="status"
              :class="{ error: hasError, ok: !hasError }"
            >
              {{ statusText }}
            </p>
          </section>

          <section class="panel preview-panel">
            <div class="preview-header">
              <h2>预览</h2>
              <div class="zoom-controls" v-if="previewUrl">
                <button
                  type="button"
                  class="zoom-btn"
                  :disabled="previewZoom <= previewZoomMin"
                  @click="ZoomPreview(-25)"
                >
                  −
                </button>
                <span class="zoom-label">{{ previewZoom }}%</span>
                <button
                  type="button"
                  class="zoom-btn"
                  :disabled="previewZoom >= previewZoomMax"
                  @click="ZoomPreview(25)"
                >
                  +
                </button>
                <button
                  type="button"
                  class="zoom-btn reset"
                  @click="ResetPreviewZoom"
                >
                  重置
                </button>
              </div>
            </div>
            <div
              class="preview-stage"
              :class="{ jpeg: outputFormat === 'jpeg', zoomed: previewZoom !== 100 }"
              @wheel.prevent="HandlePreviewWheel"
            >
              <div class="preview-zoom-inner" :style="previewZoomStyle">
                <img
                  v-if="previewUrl"
                  :src="previewUrl"
                  alt="转换预览"
                  class="preview-image"
                />
                <p v-else class="preview-empty">上传或导入 SVG 后显示预览</p>
              </div>
            </div>
            <p v-if="resultBlob" class="preview-meta">
              {{ outputWidth }} × {{ outputHeight }} ·
              {{ FormatSize(resultBlob.size) }} · {{ formatLabel }}
            </p>
          </section>
        </template>

        <!-- 图片 → SVG -->
        <template v-else>
          <section class="panel left-panel">
            <div
              class="drop-zone"
              :class="{ 'is-dragover': isDragOver }"
              @dragenter.prevent="HandleDragEnter"
              @dragover.prevent="HandleDragOver"
              @dragleave.prevent="HandleDragLeave"
              @drop.prevent="HandleDrop"
            >
              <label class="drop-label">
                <input
                  type="file"
                  :accept="rasterAccept"
                  hidden
                  @change="HandleRasterFileSelect"
                />
                <span class="drop-title">点击或拖拽图片到此处</span>
                <span class="drop-tip">支持 PNG / JPG / WebP / GIF</span>
              </label>
            </div>

            <p v-if="rasterFileName" class="source-meta">
              当前：{{ rasterFileName }}
              <template v-if="rasterWidth && rasterHeight">
                · {{ rasterWidth }} × {{ rasterHeight }}
              </template>
            </p>

            <label class="field">
              <span>转换方式</span>
              <select v-model="toSvgMethod" @change="ScheduleRasterConvert">
                <option
                  v-for="item in methodOptions"
                  :key="item.id"
                  :value="item.id"
                >
                  {{ item.label }}
                </option>
              </select>
            </label>

            <template v-if="toSvgMethod === 'potrace'">
              <label class="check">
                <input
                  v-model="extractColors"
                  type="checkbox"
                  @change="ScheduleRasterConvert"
                />
                <span>提取多色（适合彩色 Logo）</span>
              </label>
              <label v-if="extractColors" class="field">
                <span>分层数 {{ posterizeLevel }}</span>
                <input
                  v-model.number="posterizeLevel"
                  type="range"
                  min="1"
                  max="12"
                  step="1"
                  @input="ScheduleRasterConvert"
                />
              </label>
              <label v-else class="field">
                <span>填充色</span>
                <input
                  v-model="potraceFillColor"
                  type="color"
                  @change="ScheduleRasterConvert"
                />
              </label>
              <label class="field">
                <span>噪点过滤 {{ turdSize }}</span>
                <input
                  v-model.number="turdSize"
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  @input="ScheduleRasterConvert"
                />
              </label>
              <p class="hint">
                Potrace 曲线通常更圆滑；小图会放大到约 {{ traceMinSide }}px
                再描摹
              </p>
            </template>

            <template v-else-if="toSvgMethod === 'imagetracer'">
              <label class="field">
                <span>描摹预设</span>
                <select v-model="tracePreset" @change="ScheduleRasterConvert">
                  <option
                    v-for="item in tracePresets"
                    :key="item.id"
                    :value="item.id"
                  >
                    {{ item.label }}
                  </option>
                </select>
              </label>
              <label class="field">
                <span>颜色数 {{ numberOfColors }}</span>
                <input
                  v-model.number="numberOfColors"
                  type="range"
                  min="2"
                  max="32"
                  step="1"
                  @input="ScheduleRasterConvert"
                />
              </label>
              <p class="hint">
                ImageTracer 适合多色色块图；复杂照片效果仍有限
              </p>
            </template>
            <p v-else class="hint">
              嵌入模式将原图以 Base64 放入 SVG，视觉一致，但不是路径矢量
            </p>

            <div class="actions">
              <button
                type="button"
                class="ghost"
                :disabled="isBusy || !rasterFile"
                @click="ClearRaster"
              >
                清空
              </button>
              <button
                type="button"
                class="ghost"
                :disabled="!toSvgText"
                @click="CopySvgText"
              >
                复制 SVG
              </button>
              <button
                type="button"
                class="primary"
                :disabled="isBusy || !toSvgText"
                @click="HandleDownloadSvg"
              >
                {{ isBusy ? '转换中…' : '下载 SVG' }}
              </button>
            </div>

            <p
              v-if="statusText"
              class="status"
              :class="{ error: hasError, ok: !hasError }"
            >
              {{ statusText }}
            </p>
          </section>

          <section class="panel preview-panel">
            <div class="preview-header">
              <h2>SVG 预览</h2>
              <div class="zoom-controls" v-if="toSvgPreviewUrl">
                <button
                  type="button"
                  class="zoom-btn"
                  :disabled="previewZoom <= previewZoomMin"
                  @click="ZoomPreview(-25)"
                >
                  −
                </button>
                <span class="zoom-label">{{ previewZoom }}%</span>
                <button
                  type="button"
                  class="zoom-btn"
                  :disabled="previewZoom >= previewZoomMax"
                  @click="ZoomPreview(25)"
                >
                  +
                </button>
                <button
                  type="button"
                  class="zoom-btn reset"
                  @click="ResetPreviewZoom"
                >
                  重置
                </button>
              </div>
            </div>
            <div
              class="preview-stage"
              :class="{ zoomed: previewZoom !== 100 }"
              @wheel.prevent="HandlePreviewWheel"
            >
              <div class="preview-zoom-inner" :style="previewZoomStyle">
                <img
                  v-if="toSvgPreviewUrl"
                  :src="toSvgPreviewUrl"
                  alt="SVG 预览"
                  class="preview-image"
                />
                <p v-else class="preview-empty">上传图片后显示 SVG 预览</p>
              </div>
            </div>
            <p v-if="toSvgBlob" class="preview-meta">
              {{ toSvgWidth }} × {{ toSvgHeight }} ·
              {{ FormatSize(toSvgBlob.size) }} · SVG ·
              {{ methodLabel }}
            </p>
          </section>
        </template>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * SVG / 图片互转工具页
 * SVG→图片：拖放 / URL，自定义尺寸导出
 * 图片→SVG：嵌入保真或矢量描摹
 */
import { defineComponent } from 'vue'

import ToolPageHero from '@/components/ToolPageHero.vue'
import {
  ConvertImageToSvg,
  GetImageToSvgMethods,
  GetMethodLabel,
  GetTracePresets,
  IMAGETOSVGACCEPT,
  IMAGETOTRACEMAXSIDE,
  IMAGETOTRACEMINSIDE,
  IsRasterImageFile,
  TriggerSvgTextDownload,
  type ImageToSvgMethod,
  type TracePresetId,
} from '@/utils/ImageToSvg'
import {
  ClampSvgOutputSide,
  ConvertSvgToImage,
  FetchSvgTextFromUrl,
  GetSvgOutputFormats,
  IsSvgFile,
  ParseSvgIntrinsicSize,
  ReadSvgFileText,
  ResolveSvgFormatOption,
  SVGTOIMAGEACCEPT,
  SVGTOIMAGEMAXSIDE,
  TriggerSvgDownload,
  type SvgOutputFormat,
} from '@/utils/SvgToImage'

/** 页面模式 */
type PageMode = 'to-image' | 'to-svg'

export default defineComponent({
  name: 'SvgToImageView',
  components: {
    ToolPageHero,
  },
  data() {
    return {
      activeMode: 'to-image' as PageMode,
      formats: GetSvgOutputFormats(),
      fileAccept: SVGTOIMAGEACCEPT,
      rasterAccept: IMAGETOSVGACCEPT,
      maxSide: SVGTOIMAGEMAXSIDE,
      traceMaxSide: IMAGETOTRACEMAXSIDE,
      traceMinSide: IMAGETOTRACEMINSIDE,
      tracePresets: GetTracePresets(),
      methodOptions: GetImageToSvgMethods(),
      previewZoom: 100,
      previewZoomMin: 50,
      previewZoomMax: 400,
      svgText: '',
      sourceName: '',
      urlInput: '',
      outputFormat: 'png' as SvgOutputFormat,
      quality: 92,
      outputWidth: 512,
      outputHeight: 512,
      intrinsicWidth: 0,
      intrinsicHeight: 0,
      lockAspect: true,
      aspectRatio: 1,
      isDragOver: false,
      dragDepth: 0,
      isBusy: false,
      statusText: '',
      hasError: false,
      previewUrl: '',
      resultBlob: null as Blob | null,
      convertTimer: null as ReturnType<typeof setTimeout> | null,
      sizePresets: [
        { label: '0.5x', scale: 0.5 },
        { label: '1x', scale: 1 },
        { label: '2x', scale: 2 },
        { label: '3x', scale: 3 },
      ],
      rasterFile: null as File | null,
      rasterFileName: '',
      rasterWidth: 0,
      rasterHeight: 0,
      toSvgMethod: 'potrace' as ImageToSvgMethod,
      tracePreset: 'smooth' as TracePresetId,
      numberOfColors: 16,
      extractColors: true,
      posterizeLevel: 4,
      turdSize: 2,
      potraceFillColor: '#000000',
      toSvgText: '',
      toSvgPreviewUrl: '',
      toSvgBlob: null as Blob | null,
      toSvgWidth: 0,
      toSvgHeight: 0,
      toSvgFileName: '',
      rasterTimer: null as ReturnType<typeof setTimeout> | null,
    }
  },
  computed: {
    /**
     * 是否显示质量滑杆
     * @returns 布尔值
     */
    showQuality(): boolean {
      return ResolveSvgFormatOption(this.outputFormat).supportsQuality
    },
    /**
     * 格式展示名
     * @returns 文案
     */
    formatLabel(): string {
      return ResolveSvgFormatOption(this.outputFormat).label
    },
    /**
     * 下载按钮文案
     * @returns 文案
     */
    downloadLabel(): string {
      if (this.isBusy) {
        return '转换中…'
      }
      return `下载 ${this.formatLabel}`
    },
    /**
     * 当前图片→SVG 方式文案
     * @returns 文案
     */
    methodLabel(): string {
      return GetMethodLabel(this.toSvgMethod)
    },
    /**
     * 预览缩放样式
     * @returns style
     */
    previewZoomStyle(): Record<string, string> {
      const scale = this.previewZoom / 100
      return {
        transform: `scale(${scale})`,
      }
    },
  },
  /**
   * 挂载时设置标题
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', 'SVG / 图片互转')
  },
  /**
   * 卸载清理
   */
  beforeUnmount() {
    if (this.convertTimer) {
      clearTimeout(this.convertTimer)
    }
    if (this.rasterTimer) {
      clearTimeout(this.rasterTimer)
    }
    this.RevokeToSvgPreview()
  },
  methods: {
    /**
     * 切换模式
     * @param mode 模式
     */
    SwitchMode(mode: PageMode) {
      this.activeMode = mode
      this.isDragOver = false
      this.dragDepth = 0
      this.ResetPreviewZoom()
      this.$store.commit(
        'SETAPPTITLE',
        mode === 'to-image' ? 'SVG 转图片' : '图片转 SVG',
      )
    },
    /**
     * 调整预览缩放
     * @param delta 增减百分比
     */
    ZoomPreview(delta: number) {
      const next = this.previewZoom + delta
      this.previewZoom = Math.min(
        this.previewZoomMax,
        Math.max(this.previewZoomMin, next),
      )
    },
    /**
     * 重置预览缩放
     */
    ResetPreviewZoom() {
      this.previewZoom = 100
    },
    /**
     * 滚轮缩放预览
     * @param event 滚轮事件
     */
    HandlePreviewWheel(event: WheelEvent) {
      const hasPreview =
        this.activeMode === 'to-image' ? !!this.previewUrl : !!this.toSvgPreviewUrl
      if (!hasPreview) {
        return
      }
      this.ZoomPreview(event.deltaY < 0 ? 25 : -25)
    },
    /**
     * 格式化字节大小
     * @param bytes 字节
     * @returns 文案
     */
    FormatSize(bytes: number): string {
      if (bytes < 1024) {
        return `${bytes} B`
      }
      if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`
      }
      return `${(bytes / 1024 / 1024).toFixed(2)} MB`
    },
    /**
     * 释放图片→SVG 预览 URL
     */
    RevokeToSvgPreview() {
      if (this.toSvgPreviewUrl) {
        URL.revokeObjectURL(this.toSvgPreviewUrl)
        this.toSvgPreviewUrl = ''
      }
    },
    /**
     * 应用 SVG 文本并解析尺寸
     * @param text SVG
     * @param name 来源名
     */
    ApplySvgText(text: string, name: string) {
      const size = ParseSvgIntrinsicSize(text)
      this.svgText = text
      this.sourceName = name
      this.intrinsicWidth = size.width
      this.intrinsicHeight = size.height
      this.outputWidth = ClampSvgOutputSide(size.width)
      this.outputHeight = ClampSvgOutputSide(size.height)
      this.aspectRatio =
        this.outputHeight > 0 ? this.outputWidth / this.outputHeight : 1
      this.hasError = false
      this.statusText = `已载入 ${name}`
      this.ScheduleConvert()
    },
    /**
     * 选择本地 SVG
     * @param event 文件事件
     */
    async HandleFileSelect(event: Event) {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0]
      input.value = ''
      if (!file) {
        return
      }
      await this.LoadSvgFile(file)
    },
    /**
     * 加载 SVG 文件
     * @param file 文件
     */
    async LoadSvgFile(file: File) {
      this.isBusy = true
      this.hasError = false
      this.statusText = '正在读取文件…'
      try {
        if (!IsSvgFile(file)) {
          throw new Error('请上传 .svg 文件')
        }
        const text = await ReadSvgFileText(file)
        this.ApplySvgText(text, file.name)
      } catch (error) {
        this.hasError = true
        this.statusText =
          error instanceof Error ? error.message : '读取失败'
      } finally {
        this.isBusy = false
      }
    },
    /**
     * 选择位图文件
     * @param event 文件事件
     */
    async HandleRasterFileSelect(event: Event) {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0]
      input.value = ''
      if (!file) {
        return
      }
      await this.LoadRasterFile(file)
    },
    /**
     * 加载位图并转换
     * @param file 文件
     */
    async LoadRasterFile(file: File) {
      if (!IsRasterImageFile(file)) {
        this.hasError = true
        this.statusText = '请上传 PNG / JPG / WebP / GIF'
        return
      }
      this.rasterFile = file
      this.rasterFileName = file.name
      this.hasError = false
      this.statusText = `已载入 ${file.name}`
      try {
        const url = URL.createObjectURL(file)
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image()
          el.onload = () => resolve(el)
          el.onerror = () => reject(new Error('图片加载失败'))
          el.src = url
        })
        URL.revokeObjectURL(url)
        this.rasterWidth = image.naturalWidth || image.width
        this.rasterHeight = image.naturalHeight || image.height
      } catch {
        this.rasterWidth = 0
        this.rasterHeight = 0
      }
      this.ScheduleRasterConvert()
    },
    /**
     * 从 URL 导入 SVG
     */
    async HandleFetchUrl() {
      if (!this.urlInput.trim() || this.isBusy) {
        return
      }
      this.isBusy = true
      this.hasError = false
      this.statusText = '正在下载 SVG…'
      try {
        const text = await FetchSvgTextFromUrl(this.urlInput)
        let name = 'remote.svg'
        try {
          const path = new URL(this.urlInput.trim()).pathname
          const base = path.split('/').pop()
          if (base) {
            name = decodeURIComponent(base)
          }
        } catch {
          // 保留默认名
        }
        if (!/\.svg$/i.test(name)) {
          name = `${name || 'remote'}.svg`
        }
        this.ApplySvgText(text, name)
      } catch (error) {
        this.hasError = true
        this.statusText =
          error instanceof Error
            ? error.message
            : 'URL 导入失败（需目标允许 CORS）'
      } finally {
        this.isBusy = false
      }
    },
    /**
     * 是否含文件拖拽
     * @param event 拖拽事件
     * @returns 布尔
     */
    HasDragFiles(event: DragEvent): boolean {
      return Boolean(event.dataTransfer?.types?.includes('Files'))
    },
    /**
     * 拖拽进入
     * @param event 事件
     */
    HandleDragEnter(event: DragEvent) {
      if (!this.HasDragFiles(event)) {
        return
      }
      this.dragDepth += 1
      this.isDragOver = true
    },
    /**
     * 拖拽悬停
     * @param event 事件
     */
    HandleDragOver(event: DragEvent) {
      if (!this.HasDragFiles(event)) {
        return
      }
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy'
      }
      this.isDragOver = true
    },
    /**
     * 拖拽离开
     */
    HandleDragLeave() {
      this.dragDepth = Math.max(0, this.dragDepth - 1)
      if (this.dragDepth === 0) {
        this.isDragOver = false
      }
    },
    /**
     * 拖放文件
     * @param event 事件
     */
    async HandleDrop(event: DragEvent) {
      this.dragDepth = 0
      this.isDragOver = false
      const file = event.dataTransfer?.files?.[0]
      if (!file) {
        return
      }
      if (this.activeMode === 'to-svg') {
        await this.LoadRasterFile(file)
        return
      }
      await this.LoadSvgFile(file)
    },
    /**
     * 锁定比例开关
     */
    HandleLockAspect() {
      if (this.lockAspect && this.outputHeight > 0) {
        this.aspectRatio = this.outputWidth / this.outputHeight
      }
    },
    /**
     * 宽度变更
     */
    HandleWidthInput() {
      this.outputWidth = ClampSvgOutputSide(Number(this.outputWidth) || 1)
      if (this.lockAspect && this.aspectRatio > 0) {
        this.outputHeight = ClampSvgOutputSide(
          this.outputWidth / this.aspectRatio,
        )
      }
      this.ScheduleConvert()
    },
    /**
     * 高度变更
     */
    HandleHeightInput() {
      this.outputHeight = ClampSvgOutputSide(Number(this.outputHeight) || 1)
      if (this.lockAspect && this.aspectRatio > 0) {
        this.outputWidth = ClampSvgOutputSide(
          this.outputHeight * this.aspectRatio,
        )
      }
      this.ScheduleConvert()
    },
    /**
     * 按倍率应用尺寸
     * @param scale 倍率
     */
    ApplyPreset(scale: number) {
      const baseW = this.intrinsicWidth || this.outputWidth || 512
      const baseH = this.intrinsicHeight || this.outputHeight || 512
      this.outputWidth = ClampSvgOutputSide(baseW * scale)
      this.outputHeight = ClampSvgOutputSide(baseH * scale)
      this.aspectRatio =
        this.outputHeight > 0 ? this.outputWidth / this.outputHeight : 1
      this.ScheduleConvert()
    },
    /**
     * 重置为原始尺寸
     */
    ResetToIntrinsic() {
      if (!this.intrinsicWidth || !this.intrinsicHeight) {
        return
      }
      this.outputWidth = ClampSvgOutputSide(this.intrinsicWidth)
      this.outputHeight = ClampSvgOutputSide(this.intrinsicHeight)
      this.aspectRatio =
        this.outputHeight > 0 ? this.outputWidth / this.outputHeight : 1
      this.ScheduleConvert()
    },
    /**
     * 防抖调度 SVG→图片
     */
    ScheduleConvert() {
      if (this.convertTimer) {
        clearTimeout(this.convertTimer)
      }
      this.convertTimer = setTimeout(() => {
        void this.RunConvert()
      }, 200)
    },
    /**
     * 执行 SVG→图片
     */
    async RunConvert() {
      if (!this.svgText) {
        this.previewUrl = ''
        this.resultBlob = null
        return
      }
      this.isBusy = true
      this.hasError = false
      try {
        const result = await ConvertSvgToImage({
          svgText: this.svgText,
          width: this.outputWidth,
          height: this.outputHeight,
          format: this.outputFormat,
          quality: this.quality / 100,
          fileName: this.sourceName || 'svg-export.svg',
        })
        this.previewUrl = result.dataUrl
        this.resultBlob = result.blob
        this.statusText = `已转换 ${result.width}×${result.height}`
      } catch (error) {
        this.previewUrl = ''
        this.resultBlob = null
        this.hasError = true
        this.statusText =
          error instanceof Error ? error.message : '转换失败'
      } finally {
        this.isBusy = false
      }
    },
    /**
     * 防抖调度图片→SVG
     */
    ScheduleRasterConvert() {
      if (this.rasterTimer) {
        clearTimeout(this.rasterTimer)
      }
      this.rasterTimer = setTimeout(() => {
        void this.RunRasterConvert()
      }, 220)
    },
    /**
     * 执行图片→SVG
     */
    async RunRasterConvert() {
      if (!this.rasterFile) {
        this.RevokeToSvgPreview()
        this.toSvgText = ''
        this.toSvgBlob = null
        return
      }
      this.isBusy = true
      this.hasError = false
      this.statusText =
        this.toSvgMethod === 'embed'
          ? '正在生成 SVG…'
          : this.toSvgMethod === 'potrace'
            ? '正在 Potrace 描摹…'
            : '正在 ImageTracer 描摹…'
      try {
        const result = await ConvertImageToSvg({
          file: this.rasterFile,
          method: this.toSvgMethod,
          maxSide: this.traceMaxSide,
          minSide: this.traceMinSide,
          numberOfColors: this.numberOfColors,
          tracePreset: this.tracePreset,
          extractColors: this.extractColors,
          posterizeLevel: this.posterizeLevel,
          turdSize: this.turdSize,
          fillColor: this.potraceFillColor,
        })
        this.RevokeToSvgPreview()
        this.toSvgText = result.svgText
        this.toSvgPreviewUrl = result.previewUrl
        this.toSvgBlob = result.blob
        this.toSvgWidth = result.width
        this.toSvgHeight = result.height
        this.toSvgFileName = result.fileName
        this.statusText = `已生成 SVG（${this.methodLabel}）`
      } catch (error) {
        this.RevokeToSvgPreview()
        this.toSvgText = ''
        this.toSvgBlob = null
        this.hasError = true
        this.statusText =
          error instanceof Error ? error.message : '转换失败'
      } finally {
        this.isBusy = false
      }
    },
    /**
     * 下载位图结果
     */
    HandleDownload() {
      if (!this.resultBlob) {
        return
      }
      const meta = ResolveSvgFormatOption(this.outputFormat)
      const base =
        (this.sourceName || 'svg-export').replace(/\.[^.]+$/, '') || 'svg-export'
      TriggerSvgDownload(this.resultBlob, `${base}.${meta.extension}`)
      this.statusText = `已开始下载 ${meta.label}`
      this.hasError = false
    },
    /**
     * 下载 SVG
     */
    HandleDownloadSvg() {
      if (!this.toSvgText) {
        return
      }
      TriggerSvgTextDownload(
        this.toSvgText,
        this.toSvgFileName || 'image-export.svg',
      )
      this.statusText = '已开始下载 SVG'
      this.hasError = false
    },
    /**
     * 复制 SVG 文本
     */
    async CopySvgText() {
      if (!this.toSvgText) {
        return
      }
      try {
        await navigator.clipboard.writeText(this.toSvgText)
        this.hasError = false
        this.statusText = '已复制 SVG 代码'
      } catch {
        this.hasError = true
        this.statusText = '复制失败，请手动下载文件'
      }
    },
    /**
     * 清空 SVG→图片
     */
    ClearAll() {
      this.svgText = ''
      this.sourceName = ''
      this.urlInput = ''
      this.previewUrl = ''
      this.resultBlob = null
      this.intrinsicWidth = 0
      this.intrinsicHeight = 0
      this.outputWidth = 512
      this.outputHeight = 512
      this.aspectRatio = 1
      this.statusText = ''
      this.hasError = false
      this.isDragOver = false
      this.dragDepth = 0
    },
    /**
     * 清空图片→SVG
     */
    ClearRaster() {
      this.rasterFile = null
      this.rasterFileName = ''
      this.rasterWidth = 0
      this.rasterHeight = 0
      this.RevokeToSvgPreview()
      this.toSvgText = ''
      this.toSvgBlob = null
      this.toSvgWidth = 0
      this.toSvgHeight = 0
      this.toSvgFileName = ''
      this.statusText = ''
      this.hasError = false
      this.isDragOver = false
      this.dragDepth = 0
    },
  },
})
</script>

<style scoped>
.svg-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at 14% 0%, rgba(84, 148, 255, 0.08), transparent 36%),
    linear-gradient(180deg, #f3f6fb 0%, #e8edf5 100%);
}

.workspace {
  flex: 1;
  width: min(980px, 100%);
  margin: 0 auto;
  padding: 24px 6vw 48px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mode-tabs {
  display: inline-flex;
  gap: 8px;
  padding: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(49, 65, 95, 0.12);
  width: fit-content;
  flex-shrink: 0;
}

.mode-tab {
  border: none;
  border-radius: 999px;
  padding: 8px 16px;
  background: transparent;
  color: #31415f;
  font: inherit;
  cursor: pointer;
}

.mode-tab.active {
  background: #31486f;
  color: #fff8ef;
}

.workspace-body {
  display: grid;
  grid-template-columns: minmax(280px, 420px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.panel {
  padding: 18px;
  border-radius: 16px;
  background: rgba(255, 252, 247, 0.92);
  border: 1px solid rgba(29, 42, 68, 0.08);
  box-shadow: 0 10px 28px rgba(29, 42, 68, 0.06);
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.drop-zone {
  border-radius: 14px;
  border: 1.5px dashed rgba(49, 65, 95, 0.28);
  background: rgba(255, 255, 255, 0.72);
  transition: border-color 0.15s ease, background 0.15s ease;
}

.drop-zone.is-dragover {
  border-color: #3d6bb3;
  background: rgba(61, 107, 179, 0.08);
}

.drop-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 110px;
  padding: 16px;
  cursor: pointer;
  text-align: center;
}

.drop-title {
  font-weight: 600;
  color: #1d2a44;
}

.drop-tip,
.hint {
  font-size: 0.84rem;
  color: #6a7a96;
  margin: 0;
  line-height: 1.45;
}

.url-row {
  display: flex;
  gap: 10px;
  align-items: end;
}

.grow {
  flex: 1;
  min-width: 0;
}

.url-btn {
  flex-shrink: 0;
  height: 40px;
}

.source-meta {
  margin: 0;
  font-size: 0.82rem;
  color: #5a6a84;
  word-break: break-all;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.88rem;
  color: #31415f;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.field input,
.field select {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(49, 65, 95, 0.2);
  border-radius: 10px;
  padding: 9px 11px;
  font: inherit;
  color: #1d2a44;
  background: #fff;
}

.field input[type='range'] {
  padding: 0;
  border: none;
  background: transparent;
}

.check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  color: #31415f;
  cursor: pointer;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  border: 1px solid rgba(49, 65, 95, 0.18);
  background: #fff;
  color: #31415f;
  border-radius: 999px;
  padding: 6px 12px;
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;
}

.chip:hover {
  background: rgba(29, 42, 68, 0.06);
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.ghost,
.primary {
  border-radius: 999px;
  padding: 10px 16px;
  font: inherit;
  cursor: pointer;
}

.ghost {
  border: 1px solid rgba(49, 65, 95, 0.22);
  background: #fff;
  color: #31415f;
}

.primary {
  border: 1px solid #31486f;
  background: #31486f;
  color: #fff8ef;
}

.ghost:disabled,
.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status {
  margin: 0;
  font-size: 0.88rem;
}

.status.ok {
  color: #2d7a5f;
}

.status.error {
  color: #b33a3a;
}

.preview-panel h2 {
  margin: 0;
  font-size: 1.05rem;
  color: #1d2a44;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.zoom-controls {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.zoom-btn {
  min-width: 32px;
  height: 30px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid rgba(49, 65, 95, 0.18);
  background: #fff;
  color: #31415f;
  font-size: 0.92rem;
  cursor: pointer;
}

.zoom-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.zoom-btn.reset {
  font-size: 0.78rem;
}

.zoom-label {
  min-width: 52px;
  text-align: center;
  font-size: 0.82rem;
  color: #5a6a84;
  font-variant-numeric: tabular-nums;
}

.preview-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  max-height: 520px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(49, 65, 95, 0.12);
  background:
    linear-gradient(45deg, #dce3ee 25%, transparent 25%) 0 0 / 16px 16px,
    linear-gradient(-45deg, #dce3ee 25%, transparent 25%) 0 0 / 16px 16px,
    #f4f7fb;
  overflow: auto;
}

.preview-stage.zoomed {
  align-items: flex-start;
  justify-content: flex-start;
}

.preview-zoom-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: center center;
  transition: transform 0.12s ease;
}

.preview-stage.jpeg {
  background: #fff;
}

.preview-image {
  max-width: min(100%, 560px);
  max-height: 420px;
  height: auto;
  object-fit: contain;
}

.preview-empty {
  margin: 0;
  color: #6a7a96;
}

.preview-meta {
  margin: 10px 0 0;
  font-size: 0.82rem;
  color: #5a6a84;
}

@media (max-width: 860px) {
  .workspace-body {
    grid-template-columns: 1fr;
  }

  .field-row {
    grid-template-columns: 1fr;
  }

  .url-row {
    flex-direction: column;
    align-items: stretch;
  }

  .url-btn {
    height: auto;
  }
}
</style>
