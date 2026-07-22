<template>
  <aside class="panel">
    <section class="section">
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
        <span>采样字号 {{ fontSize }}px</span>
        <input
          type="range"
          min="24"
          max="96"
          :value="fontSize"
          @input="EmitFontSize"
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
    </section>

    <section class="section">
      <h2>珠子外观</h2>
      <label class="field">
        <span>格子尺寸 {{ beadSize }}px</span>
        <input
          type="range"
          min="12"
          max="36"
          :value="beadSize"
          @input="EmitBeadSize"
        />
      </label>

      <div class="mard-picker">
        <div class="mard-header">
          <span>珠子颜色 · MARD {{ beadColorCode }}</span>
          <span class="mard-hex">{{ beadColor }}</span>
        </div>
        <div class="series-tabs">
          <button
            v-for="series in seriesList"
            :key="`bead-${series}`"
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
            :key="`bead-color-${color.code}`"
            type="button"
            class="swatch"
            :class="{ active: IsSameHex(beadColor, color.hex) }"
            :style="{ backgroundColor: color.hex }"
            :title="`${color.code} ${color.hex}`"
            @click="EmitBeadColorByMard(color.hex)"
          >
            <span class="swatch-code">{{ color.code }}</span>
          </button>
        </div>
      </div>

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
 * 使用 Options API 收集用户配置，珠子/描边颜色采用 MARD 色卡选择
 */
import { defineComponent } from 'vue'
import {
  FindMardColorByHex,
  GetMardColorsBySeries,
  MARDSERIES,
  NormalizeHex,
  type MardColor,
} from '@/utils/MardColors'

export default defineComponent({
  name: 'ControlPanel',
  props: {
    text: { type: String, required: true },
    fontSize: { type: Number, required: true },
    threshold: { type: Number, required: true },
    beadSize: { type: Number, required: true },
    beadColor: { type: String, required: true },
    backgroundColor: { type: String, required: true },
    showStroke: { type: Boolean, required: true },
    strokeColor: { type: String, required: true },
    strokeWidth: { type: Number, required: true },
    showGrid: { type: Boolean, required: true },
  },
  emits: [
    'UpdateText',
    'UpdateFontSize',
    'UpdateThreshold',
    'UpdateBeadSize',
    'UpdateBeadColor',
    'UpdateBackgroundColor',
    'UpdateShowStroke',
    'UpdateStrokeColor',
    'UpdateStrokeWidth',
    'UpdateShowGrid',
    'ExportImage',
  ],
  data() {
    return {
      seriesList: MARDSERIES as readonly string[],
      beadSeries: '全部',
      strokeSeries: 'H',
    }
  },
  computed: {
    /**
     * 当前珠子色对应的 MARD 色号文案
     * @returns 色号或「自定义」
     */
    beadColorCode(): string {
      const matched = FindMardColorByHex(this.beadColor)
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
  /**
   * 组件挂载后聚焦文字输入框，并校正色卡系列选中态
   */
  mounted() {
    const input = this.$el.querySelector('.text-input') as HTMLInputElement | null
    if (input) {
      input.focus()
      input.select()
    }
    this.SyncSeriesFromColor()
  },
  methods: {
    /**
     * 根据当前颜色同步色卡系列选中项
     */
    SyncSeriesFromColor() {
      const beadMatched = FindMardColorByHex(this.beadColor)
      if (beadMatched) {
        this.beadSeries = beadMatched.series
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
     * 派发文字变更事件
     * @param event 输入事件
     */
    EmitText(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateText', target.value)
    },
    /**
     * 派发字号变更事件
     * @param event 输入事件
     */
    EmitFontSize(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateFontSize', Number(target.value))
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
     * 派发珠子尺寸变更事件
     * @param event 输入事件
     */
    EmitBeadSize(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateBeadSize', Number(target.value))
    },
    /**
     * 通过 MARD 色块派发珠子颜色
     * @param hex MARD HEX
     */
    EmitBeadColorByMard(hex: string) {
      this.$emit('UpdateBeadColor', NormalizeHex(hex))
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
