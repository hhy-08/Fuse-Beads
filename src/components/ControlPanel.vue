<template>
  <aside class="panel">
    <section class="section">
      <h2>生成模式</h2>
      <div class="mode-row">
        <button
          type="button"
          class="mode-btn"
          :class="{ active: sourceMode === 'text' }"
          @click="EmitSourceMode('text')"
        >
          文字转拼豆
        </button>
        <button
          type="button"
          class="mode-btn"
          :class="{ active: sourceMode === 'image' }"
          @click="EmitSourceMode('image')"
        >
          图片转拼豆
        </button>
      </div>
    </section>

    <section v-if="sourceMode === 'text'" class="section">
      <h2>文字内容</h2>
      <label class="field">
        <span>输入文字</span>
        <input
          class="text-input"
          type="text"
          :value="text"
          maxlength="20"
          placeholder="例如：拼豆 / Hello"
          @input="EmitText"
        />
      </label>

      <label class="field">
        <span>字体</span>
        <select class="font-select" :value="fontId" @change="EmitFontId">
          <option
            v-for="font in fontOptions"
            :key="font.id"
            :value="font.id"
            :style="{ fontFamily: font.previewFamily }"
          >
            {{ font.label }}
          </option>
        </select>
      </label>

      <label class="field">
        <span>字间距 {{ letterSpacing }}px（负值可叠连）</span>
        <input
          type="range"
          min="-24"
          max="24"
          step="1"
          :value="letterSpacing"
          @input="EmitLetterSpacing"
        />
      </label>

      <label class="field">
        <span>像素阈值 {{ threshold }}</span>
        <input
          type="range"
          min="80"
          max="240"
          :value="threshold"
          @input="EmitThreshold"
        />
      </label>

      <div class="char-editor">
        <div class="mard-header">
          <span>逐字设置</span>
          <span class="mard-hex">点选字符后调颜色/大小</span>
        </div>

        <div class="char-chips">
          <button
            v-for="(item, index) in charItems"
            :key="`char-${index}-${item.char}`"
            type="button"
            class="char-chip"
            :class="{ active: selectedCharIndex === index }"
            :style="{
              fontFamily: currentFontPreview,
              borderColor: item.color,
              color: item.color,
            }"
            @click="SelectChar(index)"
          >
            <span class="char-glyph">{{ item.display }}</span>
            <span class="char-meta">{{ item.fontSize }}px</span>
          </button>
        </div>

        <template v-if="selectedStyle">
          <label class="field">
            <span>当前字号 {{ selectedStyle.fontSize }}px</span>
            <input
              type="range"
              min="24"
              max="96"
              :value="selectedStyle.fontSize"
              @input="EmitSelectedFontSize"
            />
          </label>

          <div class="effect-row">
            <label class="effect-toggle">
              <input
                type="checkbox"
                :checked="selectedStyle.bold"
                @change="EmitSelectedEffect('bold', $event)"
              />
              <span>加粗</span>
            </label>
            <label class="effect-toggle">
              <input
                type="checkbox"
                :checked="selectedStyle.italic"
                @change="EmitSelectedEffect('italic', $event)"
              />
              <span>倾斜</span>
            </label>
            <label class="effect-toggle">
              <input
                type="checkbox"
                :checked="selectedStyle.underline"
                @change="EmitSelectedEffect('underline', $event)"
              />
              <span>下划线</span>
            </label>
            <label class="effect-toggle">
              <input
                type="checkbox"
                :checked="selectedStyle.lineThrough"
                @change="EmitSelectedEffect('lineThrough', $event)"
              />
              <span>删除线</span>
            </label>
          </div>

          <div class="align-block">
            <div class="mard-header">
              <span>垂直对齐</span>
              <span class="mard-hex">{{ AlignLabel(selectedStyle.align) }}</span>
            </div>
            <div class="align-row">
              <button
                v-for="option in alignOptions"
                :key="option.value"
                type="button"
                class="align-btn"
                :class="{ active: selectedStyle.align === option.value }"
                @click="EmitSelectedAlign(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div class="action-row">
            <button type="button" class="ghost-btn" @click="EmitApplyFontSizeToAll">
              字号应用到全部
            </button>
            <button type="button" class="ghost-btn" @click="EmitApplyColorToAll">
              颜色应用到全部
            </button>
            <button type="button" class="ghost-btn" @click="EmitApplyEffectToAll">
              样式应用到全部
            </button>
            <button type="button" class="ghost-btn" @click="EmitApplyAlignToAll">
              对齐应用到全部
            </button>
          </div>

          <div class="mard-picker">
            <div class="mard-header">
              <span>当前字颜色 · MARD {{ selectedColorCode }}</span>
              <span class="mard-hex">{{ selectedStyle.color }}</span>
            </div>
            <div class="series-tabs">
              <button
                v-for="series in seriesList"
                :key="`char-${series}`"
                type="button"
                class="series-tab"
                :class="{ active: beadSeries === series }"
                @click="SelectBeadSeries(series)"
              >
                {{ series }}
              </button>
            </div>
            <div class="swatch-grid">
              <button
                v-for="color in filteredBeadColors"
                :key="`char-color-${color.code}`"
                type="button"
                class="swatch"
                :class="{ active: IsSameHex(selectedStyle.color, color.hex) }"
                :style="{ backgroundColor: color.hex }"
                :title="`${color.code} ${color.hex}`"
                @click="EmitSelectedColor(color.hex)"
              >
                <span class="swatch-code">{{ color.code }}</span>
              </button>
            </div>
          </div>
        </template>

        <p v-else class="empty-tip">请先输入文字，再选择字符进行设置</p>

        <p class="font-preview" :style="{ fontFamily: currentFontPreview }">
          <span
            v-for="(item, index) in charItems"
            :key="`preview-${index}`"
            :style="{
              color: item.color,
              fontSize: `${Math.max(18, Math.round(item.fontSize * 0.45))}px`,
              fontWeight: item.bold ? '700' : '400',
              fontStyle: item.italic ? 'italic' : 'normal',
              textDecoration: BuildTextDecoration(item),
              alignSelf: ResolvePreviewAlignSelf(item.align),
              marginRight: `${Math.max(0, letterSpacing)}px`,
              marginLeft: `${letterSpacing < 0 ? letterSpacing : 0}px`,
            }"
          >{{ item.display }}</span>
        </p>
      </div>
    </section>

    <section v-else class="section">
      <h2>图片内容</h2>
      <label class="upload-box">
        <input
          class="file-input"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          @change="EmitImageFile"
        />
        <span v-if="!imageDataUrl">点击上传图片（PNG / JPG / WEBP）</span>
        <span v-else>重新选择图片</span>
      </label>

      <div v-if="imageDataUrl" class="image-preview-wrap">
        <img class="image-preview" :src="imageDataUrl" alt="上传预览" />
        <button type="button" class="ghost-btn" @click="EmitClearImage">
          清除图片
        </button>
      </div>

      <label class="field">
        <span>最大宽度 {{ imageMaxWidth }} 豆</span>
        <input
          type="range"
          min="8"
          max="128"
          :value="imageMaxWidth"
          @input="EmitImageMaxWidth"
        />
      </label>

      <label class="field">
        <span>最大高度 {{ imageMaxHeight }} 豆</span>
        <input
          type="range"
          min="8"
          max="128"
          :value="imageMaxHeight"
          @input="EmitImageMaxHeight"
        />
      </label>

      <label class="field">
        <span>透明抠图阈值 {{ imageAlphaThreshold }}</span>
        <input
          type="range"
          min="0"
          max="250"
          :value="imageAlphaThreshold"
          @input="EmitImageAlphaThreshold"
        />
      </label>

      <p class="empty-tip">
        图片会按比例缩放到最大宽高内，并自动匹配最近的 MARD 色号。
      </p>
    </section>

    <section class="section">
      <h2>珠子外观</h2>
      <label class="field">
        <span>格子尺寸 {{ beadSize }}px（越大色值越清晰）</span>
        <input
          type="range"
          min="28"
          max="72"
          :value="beadSize"
          @input="EmitBeadSize"
        />
      </label>

      <label class="color-field">
        <span>背景颜色</span>
        <input
          type="color"
          :value="backgroundColor"
          @input="EmitBackgroundColor"
        />
      </label>

      <label class="toggle">
        <input type="checkbox" :checked="showGrid" @change="EmitShowGrid" />
        <span>显示辅助网格</span>
      </label>

      <label class="toggle">
        <input
          type="checkbox"
          :checked="showColorCode"
          @change="EmitShowColorCode"
        />
        <span>豆豆上显示色值</span>
      </label>
    </section>

    <section class="section">
      <h2>描边设置</h2>
      <label class="toggle">
        <input type="checkbox" :checked="showStroke" @change="EmitShowStroke" />
        <span>启用外轮廓描边豆</span>
      </label>

      <div class="mard-picker" :class="{ disabled: !showStroke }">
        <div class="mard-header">
          <span>描边颜色 · MARD {{ strokeColorCode }}</span>
          <span class="mard-hex">{{ strokeColor }}</span>
        </div>
        <div class="series-tabs">
          <button
            v-for="series in seriesList"
            :key="`stroke-${series}`"
            type="button"
            class="series-tab"
            :class="{ active: strokeSeries === series }"
            :disabled="!showStroke"
            @click="SelectStrokeSeries(series)"
          >
            {{ series }}
          </button>
        </div>
        <div class="swatch-grid">
          <button
            v-for="color in filteredStrokeColors"
            :key="`stroke-color-${color.code}`"
            type="button"
            class="swatch"
            :class="{ active: IsSameHex(strokeColor, color.hex) }"
            :style="{ backgroundColor: color.hex }"
            :title="`${color.code} ${color.hex}`"
            :disabled="!showStroke"
            @click="EmitStrokeColorByMard(color.hex)"
          >
            <span class="swatch-code">{{ color.code }}</span>
          </button>
        </div>
      </div>

      <label class="field" :class="{ disabled: !showStroke }">
        <span>描边宽度 {{ strokeWidth }} 豆</span>
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          :value="strokeWidth"
          :disabled="!showStroke"
          @input="EmitStrokeWidth"
        />
      </label>
    </section>

    <button class="export-btn" type="button" @click="EmitExport">
      导出 PNG 图纸
    </button>
  </aside>
</template>

<script lang="ts">
/**
 * 控制面板组件
 * 支持字间距、逐字颜色/字号，以及 MARD 色卡选择
 */
import { defineComponent, type PropType } from 'vue'
import {
  FindMardColorByHex,
  GetMardColorsBySeries,
  MARDSERIES,
  NormalizeHex,
  type MardColor,
} from '@/utils/MardColors'
import { FindFontOptionById, FONTOPTIONS } from '@/utils/FontOptions'
import {
  CHARALIGNOPTIONS,
  type CharStyle,
  type CharVerticalAlign,
} from '@/utils/TextToPixels'

export default defineComponent({
  name: 'ControlPanel',
  props: {
    sourceMode: { type: String as PropType<'text' | 'image'>, required: true },
    text: { type: String, required: true },
    fontId: { type: String, required: true },
    letterSpacing: { type: Number, required: true },
    charStyles: { type: Array as PropType<CharStyle[]>, required: true },
    threshold: { type: Number, required: true },
    beadSize: { type: Number, required: true },
    backgroundColor: { type: String, required: true },
    showStroke: { type: Boolean, required: true },
    strokeColor: { type: String, required: true },
    strokeWidth: { type: Number, required: true },
    showGrid: { type: Boolean, required: true },
    showColorCode: { type: Boolean, required: true },
    imageDataUrl: { type: String, required: true },
    imageMaxWidth: { type: Number, required: true },
    imageMaxHeight: { type: Number, required: true },
    imageAlphaThreshold: { type: Number, required: true },
  },
  emits: [
    'UpdateSourceMode',
    'UpdateText',
    'UpdateFontId',
    'UpdateLetterSpacing',
    'UpdateCharStyle',
    'ApplyColorToAll',
    'ApplyFontSizeToAll',
    'ApplyEffectToAll',
    'ApplyAlignToAll',
    'UpdateThreshold',
    'UpdateBeadSize',
    'UpdateBackgroundColor',
    'UpdateShowStroke',
    'UpdateStrokeColor',
    'UpdateStrokeWidth',
    'UpdateShowGrid',
    'UpdateShowColorCode',
    'UpdateImageDataUrl',
    'UpdateImageMaxWidth',
    'UpdateImageMaxHeight',
    'UpdateImageAlphaThreshold',
    'ExportImage',
  ],
  data() {
    return {
      seriesList: MARDSERIES as readonly string[],
      fontOptions: FONTOPTIONS,
      alignOptions: CHARALIGNOPTIONS,
      beadSeries: '全部',
      strokeSeries: 'H',
      selectedCharIndex: 0,
    }
  },
  computed: {
    /**
     * 当前字体预览用 CSS family
     * @returns font-family 字符串
     */
    currentFontPreview(): string {
      return FindFontOptionById(this.fontId).previewFamily
    },
    /**
     * 逐字展示列表
     * @returns 字符与样式组合
     */
    charItems(): Array<CharStyle & { char: string; display: string }> {
      return Array.from(this.text).map((char, index) => {
        const style = this.charStyles[index] || {
          color: '#0F54C0',
          fontSize: 48,
          bold: true,
          italic: false,
          underline: false,
          lineThrough: false,
          align: 'middle' as CharVerticalAlign,
        }
        return {
          char,
          display: char.trim() ? char : '␠',
          color: style.color,
          fontSize: style.fontSize,
          bold: style.bold,
          italic: style.italic,
          underline: style.underline,
          lineThrough: style.lineThrough,
          align: style.align,
        }
      })
    },
    /**
     * 当前选中的字符样式
     * @returns 样式或 null
     */
    selectedStyle(): CharStyle | null {
      if (!this.charItems.length) {
        return null
      }
      const index = Math.min(this.selectedCharIndex, this.charItems.length - 1)
      return this.charStyles[index] || null
    },
    /**
     * 当前选中字的 MARD 色号
     * @returns 色号文案
     */
    selectedColorCode(): string {
      if (!this.selectedStyle) {
        return '自定义'
      }
      const matched = FindMardColorByHex(this.selectedStyle.color)
      return matched ? matched.code : '自定义'
    },
    /**
     * 当前描边色对应的 MARD 色号文案
     * @returns 色号或「自定义」
     */
    strokeColorCode(): string {
      const matched = FindMardColorByHex(this.strokeColor)
      return matched ? matched.code : '自定义'
    },
    /**
     * 按系列筛选后的珠子色卡列表
     * @returns MARD 色数组
     */
    filteredBeadColors(): MardColor[] {
      return GetMardColorsBySeries(this.beadSeries)
    },
    /**
     * 按系列筛选后的描边色卡列表
     * @returns MARD 色数组
     */
    filteredStrokeColors(): MardColor[] {
      return GetMardColorsBySeries(this.strokeSeries)
    },
  },
  watch: {
    text() {
      if (!this.charItems.length) {
        this.selectedCharIndex = 0
        return
      }
      if (this.selectedCharIndex > this.charItems.length - 1) {
        this.selectedCharIndex = this.charItems.length - 1
      }
    },
  },
  /**
   * 组件挂载后聚焦文字输入框，并校正色卡系列选中态
   */
  mounted() {
    const input = this.$el.querySelector('.text-input') as HTMLInputElement | null
    if (input) {
      input.focus()
      input.select()
    }
    this.SyncSeriesFromSelected()
  },
  methods: {
    /**
     * 组装预览用 text-decoration
     * @param style 单字样式
     * @returns CSS text-decoration
     */
    BuildTextDecoration(style: CharStyle): string {
      const parts: string[] = []
      if (style.underline) {
        parts.push('underline')
      }
      if (style.lineThrough) {
        parts.push('line-through')
      }
      return parts.length ? parts.join(' ') : 'none'
    },
    /**
     * 对齐方式文案
     * @param align 对齐值
     * @returns 中文标签
     */
    AlignLabel(align: CharVerticalAlign): string {
      const matched = CHARALIGNOPTIONS.find((item) => item.value === align)
      return matched ? matched.label : '居中'
    },
    /**
     * 预览区 align-self 映射
     * @param align 对齐值
     * @returns CSS align-self
     */
    ResolvePreviewAlignSelf(align: CharVerticalAlign): string {
      if (align === 'top') {
        return 'flex-start'
      }
      if (align === 'bottom') {
        return 'flex-end'
      }
      return 'center'
    },
    /**
     * 根据当前选中字颜色同步色卡系列
     */
    SyncSeriesFromSelected() {
      if (this.selectedStyle) {
        const matched = FindMardColorByHex(this.selectedStyle.color)
        if (matched) {
          this.beadSeries = matched.series
        }
      }
      const strokeMatched = FindMardColorByHex(this.strokeColor)
      if (strokeMatched) {
        this.strokeSeries = strokeMatched.series
      }
    },
    /**
     * 比较两个 HEX 是否相同（忽略大小写）
     * @param left 颜色 A
     * @param right 颜色 B
     * @returns 是否相同
     */
    IsSameHex(left: string, right: string): boolean {
      return NormalizeHex(left) === NormalizeHex(right)
    },
    /**
     * 选中某个字符进行编辑
     * @param index 字符索引
     */
    SelectChar(index: number) {
      this.selectedCharIndex = index
      this.SyncSeriesFromSelected()
    },
    /**
     * 切换珠子色卡系列
     * @param series 系列名
     */
    SelectBeadSeries(series: string) {
      this.beadSeries = series
    },
    /**
     * 切换描边色卡系列
     * @param series 系列名
     */
    SelectStrokeSeries(series: string) {
      this.strokeSeries = series
    },
    /**
     * 派发模式切换事件
     * @param mode 文字或图片
     */
    EmitSourceMode(mode: 'text' | 'image') {
      this.$emit('UpdateSourceMode', mode)
    },
    /**
     * 派发文字变更事件
     * @param event 输入事件
     */
    EmitText(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateText', target.value)
    },
    /**
     * 读取上传图片并转为 dataURL
     * @param event 文件选择事件
     */
    EmitImageFile(event: Event) {
      const target = event.target as HTMLInputElement
      const file = target.files && target.files[0]
      if (!file) {
        return
      }
      if (!file.type.startsWith('image/')) {
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : ''
        this.$emit('UpdateImageDataUrl', result)
      }
      reader.readAsDataURL(file)
      target.value = ''
    },
    /**
     * 清除已上传图片
     */
    EmitClearImage() {
      this.$emit('UpdateImageDataUrl', '')
    },
    /**
     * 派发图片最大宽度变更
     * @param event 输入事件
     */
    EmitImageMaxWidth(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateImageMaxWidth', Number(target.value))
    },
    /**
     * 派发图片最大高度变更
     * @param event 输入事件
     */
    EmitImageMaxHeight(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateImageMaxHeight', Number(target.value))
    },
    /**
     * 派发透明抠图阈值变更
     * @param event 输入事件
     */
    EmitImageAlphaThreshold(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateImageAlphaThreshold', Number(target.value))
    },
    /**
     * 派发字体变更事件
     * @param event 变更事件
     */
    EmitFontId(event: Event) {
      const target = event.target as HTMLSelectElement
      this.$emit('UpdateFontId', target.value)
    },
    /**
     * 派发字间距变更事件
     * @param event 输入事件
     */
    EmitLetterSpacing(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateLetterSpacing', Number(target.value))
    },
    /**
     * 派发当前选中字号变更
     * @param event 输入事件
     */
    EmitSelectedFontSize(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateCharStyle', {
        index: this.selectedCharIndex,
        style: { fontSize: Number(target.value) },
      })
    },
    /**
     * 派发当前选中字颜色变更
     * @param hex MARD HEX
     */
    EmitSelectedColor(hex: string) {
      this.$emit('UpdateCharStyle', {
        index: this.selectedCharIndex,
        style: { color: NormalizeHex(hex) },
      })
    },
    /**
     * 派发当前选中字文字效果变更
     * @param key 效果字段
     * @param event 变更事件
     */
    EmitSelectedEffect(
      key: 'bold' | 'italic' | 'underline' | 'lineThrough',
      event: Event,
    ) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateCharStyle', {
        index: this.selectedCharIndex,
        style: { [key]: target.checked },
      })
    },
    /**
     * 派发当前选中字垂直对齐变更
     * @param align 对齐方式
     */
    EmitSelectedAlign(align: CharVerticalAlign) {
      this.$emit('UpdateCharStyle', {
        index: this.selectedCharIndex,
        style: { align },
      })
    },
    /**
     * 将当前字号应用到全部字符
     */
    EmitApplyFontSizeToAll() {
      if (!this.selectedStyle) {
        return
      }
      this.$emit('ApplyFontSizeToAll', this.selectedStyle.fontSize)
    },
    /**
     * 将当前颜色应用到全部字符
     */
    EmitApplyColorToAll() {
      if (!this.selectedStyle) {
        return
      }
      this.$emit('ApplyColorToAll', this.selectedStyle.color)
    },
    /**
     * 将当前文字效果应用到全部字符
     */
    EmitApplyEffectToAll() {
      if (!this.selectedStyle) {
        return
      }
      this.$emit('ApplyEffectToAll', {
        bold: this.selectedStyle.bold,
        italic: this.selectedStyle.italic,
        underline: this.selectedStyle.underline,
        lineThrough: this.selectedStyle.lineThrough,
      })
    },
    /**
     * 将当前对齐应用到全部字符
     */
    EmitApplyAlignToAll() {
      if (!this.selectedStyle) {
        return
      }
      this.$emit('ApplyAlignToAll', this.selectedStyle.align)
    },
    /**
     * 派发阈值变更事件
     * @param event 输入事件
     */
    EmitThreshold(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateThreshold', Number(target.value))
    },
    /**
     * 派发格子尺寸变更事件
     * @param event 输入事件
     */
    EmitBeadSize(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateBeadSize', Number(target.value))
    },
    /**
     * 派发背景颜色变更事件
     * @param event 输入事件
     */
    EmitBackgroundColor(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateBackgroundColor', target.value)
    },
    /**
     * 派发描边开关变更事件
     * @param event 变更事件
     */
    EmitShowStroke(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateShowStroke', target.checked)
    },
    /**
     * 通过 MARD 色块派发描边颜色
     * @param hex MARD HEX
     */
    EmitStrokeColorByMard(hex: string) {
      this.$emit('UpdateStrokeColor', NormalizeHex(hex))
    },
    /**
     * 派发描边宽度（豆数）变更事件
     * @param event 输入事件
     */
    EmitStrokeWidth(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateStrokeWidth', Number(target.value))
    },
    /**
     * 派发网格开关变更事件
     * @param event 变更事件
     */
    EmitShowGrid(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateShowGrid', target.checked)
    },
    /**
     * 派发色值显示开关变更事件
     * @param event 变更事件
     */
    EmitShowColorCode(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateShowColorCode', target.checked)
    },
    /**
     * 派发导出图纸事件
     */
    EmitExport() {
      this.$emit('ExportImage')
    },
  },
})
</script>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px;
  border-radius: 20px;
  background: rgba(255, 252, 247, 0.92);
  border: 1px solid rgba(40, 56, 84, 0.08);
  box-shadow: 0 18px 40px rgba(28, 42, 68, 0.08);
  height: fit-content;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section h2 {
  margin: 0;
  font-size: 0.95rem;
  color: #24324d;
  letter-spacing: 0.04em;
}

.mode-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mode-btn {
  height: 40px;
  border: 1px solid #d7deea;
  border-radius: 12px;
  background: #fff;
  color: #31415f;
  font-size: 0.88rem;
  cursor: pointer;
}

.mode-btn.active,
.mode-btn:hover {
  border-color: #3f6fe8;
  color: #3f6fe8;
  background: rgba(63, 111, 232, 0.08);
}

.upload-box {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 88px;
  padding: 16px;
  border: 1px dashed #b7c3d8;
  border-radius: 14px;
  background: #f8fafc;
  color: #4b5872;
  font-size: 0.88rem;
  cursor: pointer;
  text-align: center;
}

.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.image-preview-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.image-preview {
  width: 100%;
  max-height: 180px;
  object-fit: contain;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e4eaf3;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.86rem;
  color: #4b5872;
}

.field input[type='text'] {
  height: 42px;
  border: 1px solid #d7deea;
  border-radius: 12px;
  padding: 0 12px;
  font-size: 1rem;
  color: #1f2a3d;
  background: #fff;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field input[type='text']:focus {
  border-color: #4d7dff;
  box-shadow: 0 0 0 3px rgba(77, 125, 255, 0.18);
}

.field input[type='range'] {
  width: 100%;
  accent-color: #3f6fe8;
}

.font-select {
  height: 42px;
  border: 1px solid #d7deea;
  border-radius: 12px;
  padding: 0 12px;
  font-size: 0.95rem;
  color: #1f2a3d;
  background: #fff;
  outline: none;
  cursor: pointer;
}

.font-select:focus {
  border-color: #4d7dff;
  box-shadow: 0 0 0 3px rgba(77, 125, 255, 0.18);
}

.font-preview {
  margin: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: #f3f6fb;
  border: 1px dashed #d0d8e6;
  color: #24324d;
  line-height: 1.4;
  word-break: break-all;
  min-height: 72px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.char-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e4eaf3;
}

.char-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.char-chip {
  min-width: 52px;
  padding: 8px 10px;
  border: 2px solid #d7deea;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.char-chip.active {
  box-shadow: 0 0 0 2px rgba(63, 111, 232, 0.28);
  transform: translateY(-1px);
}

.char-glyph {
  font-size: 1.2rem;
  line-height: 1;
}

.char-meta {
  font-size: 0.68rem;
  color: #6a7790;
}

.action-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.action-row .ghost-btn:last-child {
  grid-column: auto;
}

.align-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.align-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.align-btn {
  height: 34px;
  border: 1px solid #d7deea;
  border-radius: 10px;
  background: #fff;
  color: #31415f;
  font-size: 0.82rem;
  cursor: pointer;
}

.align-btn.active,
.align-btn:hover {
  border-color: #3f6fe8;
  color: #3f6fe8;
  background: rgba(63, 111, 232, 0.08);
}

.effect-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.effect-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #d7deea;
  border-radius: 10px;
  background: #fff;
  color: #31415f;
  font-size: 0.82rem;
  cursor: pointer;
}

.effect-toggle input {
  width: 15px;
  height: 15px;
  accent-color: #3f6fe8;
}

.ghost-btn {
  height: 34px;
  border: 1px solid #d0d8e6;
  border-radius: 10px;
  background: #fff;
  color: #31415f;
  font-size: 0.78rem;
  cursor: pointer;
}

.ghost-btn:hover {
  border-color: #3f6fe8;
  color: #3f6fe8;
}

.empty-tip {
  margin: 0;
  font-size: 0.84rem;
  color: #8a95a8;
}

.color-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.86rem;
  color: #4b5872;
}

.color-field input[type='color'] {
  width: 100%;
  height: 42px;
  border: 1px solid #d7deea;
  border-radius: 12px;
  padding: 4px;
  background: #fff;
  cursor: pointer;
}

.mard-picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.86rem;
  color: #4b5872;
}

.mard-hex {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.78rem;
  color: #6a7790;
}

.series-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.series-tab {
  height: 28px;
  padding: 0 10px;
  border: 1px solid #d7deea;
  border-radius: 8px;
  background: #fff;
  color: #4b5872;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.series-tab.active,
.series-tab:hover:not(:disabled) {
  background: #3f6fe8;
  border-color: #3f6fe8;
  color: #fff;
}

.series-tab:disabled {
  cursor: not-allowed;
}

.swatch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(42px, 1fr));
  gap: 6px;
  max-height: 180px;
  overflow: auto;
  padding: 4px;
  border: 1px solid #e4eaf3;
  border-radius: 12px;
  background: #f8fafc;
}

.swatch {
  position: relative;
  aspect-ratio: 1;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  padding: 0;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
  transition: transform 0.12s ease, border-color 0.12s ease;
}

.swatch:hover:not(:disabled) {
  transform: translateY(-1px);
}

.swatch.active {
  border-color: #1f2a3d;
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.08),
    0 0 0 2px rgba(63, 111, 232, 0.35);
}

.swatch:disabled {
  cursor: not-allowed;
}

.swatch-code {
  position: absolute;
  left: 50%;
  bottom: 2px;
  transform: translateX(-50%);
  font-size: 0.55rem;
  line-height: 1;
  color: rgba(20, 28, 40, 0.75);
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.9);
  pointer-events: none;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  color: #31415f;
  cursor: pointer;
}

.toggle input {
  width: 16px;
  height: 16px;
  accent-color: #3f6fe8;
}

.disabled {
  opacity: 0.45;
  pointer-events: none;
}

.export-btn {
  margin-top: 4px;
  height: 46px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #355fd8, #5d8dff);
  color: #fff;
  font-size: 0.98rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  box-shadow: 0 10px 24px rgba(53, 95, 216, 0.28);
}

.export-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(53, 95, 216, 0.34);
}

.export-btn:active {
  transform: translateY(0);
}
</style>
