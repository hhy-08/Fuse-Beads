<template>
  <div class="color-page">
    <ToolPageHero title="拾色器（色值转换）" subtitle="屏幕取色，HEX / RGB / HSL / 透明度互相转换，支持自定义调色" />

    <main class="workspace">
      <section class="picker-layout">
        <div class="preview-card">
          <div class="swatch-wrap">
            <div
              class="swatch"
              :style="{ background: cssRgba, color: contrastText }"
            >
              <span class="swatch-hex">{{ color.hex }}</span>
              <span class="swatch-sub">{{ rgbText }}</span>
              <span class="swatch-sub">透明度 {{ color.alpha }}%</span>
            </div>
          </div>

          <div class="preview-actions">
            <label class="native-picker">
              <span>调色板选色</span>
              <input
                type="color"
                :value="color.hexOpaque"
                @input="HandleNativeColor"
              />
            </label>
            <button
              type="button"
              class="primary"
              :disabled="!eyeDropperSupported || isPicking"
              :title="
                eyeDropperSupported
                  ? '从屏幕任意位置取色'
                  : '当前浏览器不支持 EyeDropper'
              "
              @click="HandleEyeDrop"
            >
              {{ isPicking ? '取色中…' : '屏幕取色' }}
            </button>
            <button type="button" class="ghost" @click="HandleSavePalette">
              加入调色
            </button>
          </div>

          <p v-if="statusText" class="status" :class="{ error: hasError, ok: !hasError }">
            {{ statusText }}
          </p>
        </div>

        <div class="fields-card">
          <div class="field-row">
            <label class="field-label">HEX</label>
            <div class="field-controls">
              <input
                class="field-input"
                :value="hexInput"
                spellcheck="false"
                placeholder="#31486FCC"
                @input="HandleHexInput"
              />
              <button type="button" class="ghost mini" @click="HandleCopy(color.hex)">
                复制
              </button>
            </div>
          </div>

          <div class="field-row">
            <label class="field-label">RGB / A</label>
            <div class="rgb-grid rgba-grid">
              <label>
                R
                <input
                  type="number"
                  min="0"
                  max="255"
                  :value="color.rgb.r"
                  @input="HandleRgbInput('r', $event)"
                />
              </label>
              <label>
                G
                <input
                  type="number"
                  min="0"
                  max="255"
                  :value="color.rgb.g"
                  @input="HandleRgbInput('g', $event)"
                />
              </label>
              <label>
                B
                <input
                  type="number"
                  min="0"
                  max="255"
                  :value="color.rgb.b"
                  @input="HandleRgbInput('b', $event)"
                />
              </label>
              <label>
                A%
                <input
                  type="number"
                  min="0"
                  max="100"
                  :value="color.alpha"
                  @input="HandleAlphaInput"
                />
              </label>
              <button type="button" class="ghost mini" @click="HandleCopy(rgbText)">
                复制
              </button>
            </div>
          </div>

          <div class="field-row">
            <label class="field-label">HSL / A</label>
            <div class="rgb-grid rgba-grid">
              <label>
                H
                <input
                  type="number"
                  min="0"
                  max="360"
                  :value="color.hsl.h"
                  @input="HandleHslInput('h', $event)"
                />
              </label>
              <label>
                S
                <input
                  type="number"
                  min="0"
                  max="100"
                  :value="color.hsl.s"
                  @input="HandleHslInput('s', $event)"
                />
              </label>
              <label>
                L
                <input
                  type="number"
                  min="0"
                  max="100"
                  :value="color.hsl.l"
                  @input="HandleHslInput('l', $event)"
                />
              </label>
              <label>
                A%
                <input
                  type="number"
                  min="0"
                  max="100"
                  :value="color.alpha"
                  @input="HandleAlphaInput"
                />
              </label>
              <button type="button" class="ghost mini" @click="HandleCopy(hslText)">
                复制
              </button>
            </div>
          </div>

          <div class="slider-block">
            <label class="slider-row">
              <span>色相 H {{ color.hsl.h }}°</span>
              <input
                type="range"
                min="0"
                max="360"
                :value="color.hsl.h"
                @input="HandleHslInput('h', $event)"
              />
            </label>
            <label class="slider-row">
              <span>饱和 S {{ color.hsl.s }}%</span>
              <input
                type="range"
                min="0"
                max="100"
                :value="color.hsl.s"
                @input="HandleHslInput('s', $event)"
              />
            </label>
            <label class="slider-row">
              <span>亮度 L {{ color.hsl.l }}%</span>
              <input
                type="range"
                min="0"
                max="100"
                :value="color.hsl.l"
                @input="HandleHslInput('l', $event)"
              />
            </label>
            <label class="slider-row">
              <span>透明度 A {{ color.alpha }}%</span>
              <input
                class="alpha-range"
                type="range"
                min="0"
                max="100"
                :value="color.alpha"
                :style="{ '--alpha-color': color.hexOpaque }"
                @input="HandleAlphaInput"
              />
            </label>
          </div>
        </div>
      </section>

      <section class="palette-card">
        <div class="palette-head">
          <div>
            <h2>自定义调色</h2>
            <p>点击色块应用，右上角 × 可删除；最多保存 {{ paletteMax }} 个</p>
          </div>
          <button
            type="button"
            class="ghost mini"
            :disabled="!palette.length"
            @click="HandleClearPalette"
          >
            清空调色板
          </button>
        </div>

        <ul v-if="palette.length" class="palette-list">
          <li v-for="item in palette" :key="item.id">
            <button
              type="button"
              class="palette-swatch"
              :title="item.hex"
              @click="HandleApplyPalette(item.hex)"
            >
              <span
                class="palette-fill"
                :style="{ background: FormatPaletteCss(item.hex) }"
              />
              <span
                class="palette-label"
                :style="{ color: ResolveContrast(item.hex) }"
              >
                {{ item.hex }}
              </span>
            </button>
            <button
              type="button"
              class="palette-remove"
              title="删除"
              @click="HandleRemovePalette(item.id)"
            >
              ×
            </button>
          </li>
        </ul>
        <p v-else class="palette-empty">还没有自定义颜色，取色或调色后点「加入调色」</p>
      </section>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 拾色器（色值转换）工具页
 * 屏幕取色、HEX / RGB / HSL / 透明度互转、自定义调色板
 */
import { defineComponent } from 'vue'

import ToolPageHero from '@/components/ToolPageHero.vue'
import {
  AddColorToPalette,
  BuildColorFromHex,
  BuildColorFromHsl,
  BuildColorFromRgb,
  BuildColorWithAlpha,
  COLOR_PALETTE_MAX,
  FormatCssRgba,
  FormatHslText,
  FormatRgbText,
  IsEyeDropperSupported,
  LoadColorPalette,
  PickScreenColor,
  RemoveColorFromPalette,
  ResolveContrastTextColor,
  SaveColorPalette,
  type ColorValue,
  type PaletteColor,
} from '@/utils/ColorPicker'

const DEFAULT_COLOR = BuildColorFromHex('#31486F') as ColorValue

export default defineComponent({
  name: 'ColorPickerView',
  components: {
    ToolPageHero,
  },
  data() {
    return {
      color: {
        ...DEFAULT_COLOR,
        rgb: { ...DEFAULT_COLOR.rgb },
        hsl: { ...DEFAULT_COLOR.hsl },
      },
      hexInput: DEFAULT_COLOR.hex,
      palette: [] as PaletteColor[],
      paletteMax: COLOR_PALETTE_MAX,
      eyeDropperSupported: false,
      isPicking: false,
      statusText: '',
      hasError: false,
      copyTimer: null as ReturnType<typeof setTimeout> | null,
    }
  },
  computed: {
    /**
     * RGB / RGBA 文案
     * @returns 文案
     */
    rgbText(): string {
      return FormatRgbText(this.color.rgb, this.color.alpha)
    },
    /**
     * HSL / HSLA 文案
     * @returns 文案
     */
    hslText(): string {
      return FormatHslText(this.color.hsl, this.color.alpha)
    },
    /**
     * CSS rgba 预览色
     * @returns CSS
     */
    cssRgba(): string {
      return FormatCssRgba(this.color)
    },
    /**
     * 预览区对比文字色
     * @returns 颜色
     */
    contrastText(): string {
      return ResolveContrastTextColor(this.color.hex)
    },
  },
  /**
   * 挂载时读取调色板与取色能力
   */
  mounted() {
    this.eyeDropperSupported = IsEyeDropperSupported()
    this.palette = LoadColorPalette()
    if (!this.eyeDropperSupported) {
      this.SetStatus('当前浏览器不支持屏幕取色，可使用调色板或手动输入色值', false)
    }
  },
  beforeUnmount() {
    if (this.copyTimer) {
      clearTimeout(this.copyTimer)
      this.copyTimer = null
    }
  },
  methods: {
    /**
     * 设置状态提示
     * @param text 文案
     * @param isError 是否错误
     */
    SetStatus(text: string, isError = false) {
      this.statusText = text
      this.hasError = isError
    },
    /**
     * 应用完整色值到界面
     * @param next 色值
     * @param syncHexInput 是否同步 HEX 输入框
     */
    ApplyColor(next: ColorValue, syncHexInput = true) {
      this.color = {
        hex: next.hex,
        hexOpaque: next.hexOpaque,
        rgb: { ...next.rgb },
        hsl: { ...next.hsl },
        alpha: next.alpha,
      }
      if (syncHexInput) {
        this.hexInput = next.hex
      }
    },
    /**
     * 计算色块对比文字色
     * @param hex HEX
     * @returns 文字色
     */
    ResolveContrast(hex: string): string {
      return ResolveContrastTextColor(hex)
    },
    /**
     * 调色板色块 CSS（支持透明度）
     * @param hex HEX
     * @returns CSS
     */
    FormatPaletteCss(hex: string): string {
      const next = BuildColorFromHex(hex)
      if (!next) {
        return hex
      }
      return FormatCssRgba(next)
    },
    /**
     * 原生 color input 变更（保留当前透明度）
     * @param event 输入事件
     */
    HandleNativeColor(event: Event) {
      const target = event.target as HTMLInputElement
      const next = BuildColorFromHex(target.value)
      if (!next) {
        return
      }
      this.ApplyColor(BuildColorWithAlpha(next, this.color.alpha))
    },
    /**
     * HEX 输入变更（支持 #RRGGBBAA）
     * @param event 输入事件
     */
    HandleHexInput(event: Event) {
      const target = event.target as HTMLInputElement
      this.hexInput = target.value
      const next = BuildColorFromHex(target.value)
      if (!next) {
        return
      }
      this.ApplyColor(next, false)
      this.hexInput = target.value
    },
    /**
     * RGB 通道变更
     * @param key 通道
     * @param event 输入事件
     */
    HandleRgbInput(key: 'r' | 'g' | 'b', event: Event) {
      const target = event.target as HTMLInputElement
      const value = Number(target.value)
      const next = BuildColorFromRgb(
        {
          ...this.color.rgb,
          [key]: value,
        },
        this.color.alpha
      )
      this.ApplyColor(next)
    },
    /**
     * HSL 通道变更
     * @param key 通道
     * @param event 输入事件
     */
    HandleHslInput(key: 'h' | 's' | 'l', event: Event) {
      const target = event.target as HTMLInputElement
      const value = Number(target.value)
      const next = BuildColorFromHsl(
        {
          ...this.color.hsl,
          [key]: value,
        },
        this.color.alpha
      )
      this.ApplyColor(next)
    },
    /**
     * 透明度变更
     * @param event 输入事件
     */
    HandleAlphaInput(event: Event) {
      const target = event.target as HTMLInputElement
      const value = Number(target.value)
      this.ApplyColor(BuildColorWithAlpha(this.color, value))
    },
    /**
     * 屏幕取色（保留当前透明度，除非取色结果自带 alpha）
     */
    async HandleEyeDrop() {
      if (!this.eyeDropperSupported || this.isPicking) {
        return
      }
      this.isPicking = true
      this.SetStatus('请在屏幕上点击要拾取的颜色…', false)
      try {
        const hex = await PickScreenColor()
        if (!hex) {
          this.SetStatus('已取消取色，或当前环境无法取色', true)
          return
        }
        const picked = BuildColorFromHex(hex)
        if (!picked) {
          this.SetStatus('取到的色值无效', true)
          return
        }
        // EyeDropper 通常返回不透明色，沿用当前 alpha
        const next = BuildColorWithAlpha(picked, this.color.alpha)
        this.ApplyColor(next)
        this.SetStatus(`已取色 ${next.hex}`, false)
      } finally {
        this.isPicking = false
      }
    },
    /**
     * 复制色值
     * @param text 文案
     */
    async HandleCopy(text: string) {
      try {
        await navigator.clipboard.writeText(text)
        this.SetStatus(`已复制 ${text}`, false)
        if (this.copyTimer) {
          clearTimeout(this.copyTimer)
        }
        this.copyTimer = setTimeout(() => {
          this.copyTimer = null
        }, 1600)
      } catch {
        this.SetStatus('复制失败，请手动选择复制', true)
      }
    },
    /**
     * 加入自定义调色板
     */
    HandleSavePalette() {
      this.palette = AddColorToPalette(this.palette, this.color.hex)
      SaveColorPalette(this.palette)
      this.SetStatus(`已加入调色板 ${this.color.hex}`, false)
    },
    /**
     * 应用调色板颜色
     * @param hex HEX
     */
    HandleApplyPalette(hex: string) {
      const next = BuildColorFromHex(hex)
      if (!next) {
        return
      }
      this.ApplyColor(next)
      this.SetStatus(`已应用 ${hex}`, false)
    },
    /**
     * 删除调色板颜色
     * @param id 条目 id
     */
    HandleRemovePalette(id: string) {
      this.palette = RemoveColorFromPalette(this.palette, id)
      SaveColorPalette(this.palette)
    },
    /**
     * 清空调色板
     */
    HandleClearPalette() {
      this.palette = []
      SaveColorPalette(this.palette)
      this.SetStatus('已清空调色板', false)
    },
  },
})
</script>

<style scoped>
.color-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.workspace {
  flex: 1;
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: 28px 6vw 48px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.picker-layout {
  display: grid;
  grid-template-columns: minmax(260px, 360px) 1fr;
  gap: 16px;
  align-items: stretch;
}

.preview-card,
.fields-card,
.palette-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(49, 65, 95, 0.1);
  padding: 16px;
}

.swatch-wrap {
  border-radius: 14px;
  overflow: hidden;
  background-color: #fff;
  background-image:
    linear-gradient(45deg, #d7dde8 25%, transparent 25%),
    linear-gradient(-45deg, #d7dde8 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #d7dde8 75%),
    linear-gradient(-45deg, transparent 75%, #d7dde8 75%);
  background-size: 16px 16px;
  background-position:
    0 0,
    0 8px,
    8px -8px,
    -8px 0;
}

.swatch {
  min-height: 180px;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 4px;
  padding: 18px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
}

.swatch-hex {
  font-size: 1.4rem;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.swatch-sub {
  font-size: 0.9rem;
  opacity: 0.88;
}

.preview-actions {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.native-picker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(49, 65, 95, 0.25);
  border-radius: 10px;
  padding: 6px 10px;
  color: #31415f;
  font-size: 0.9rem;
  cursor: pointer;
  background: #fff;
}

.native-picker input {
  width: 36px;
  height: 28px;
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.primary,
.ghost {
  border-radius: 10px;
  padding: 8px 14px;
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
}

.primary {
  border: none;
  background: #31486f;
  color: #fff8ef;
}

.primary:hover:not(:disabled) {
  background: #3d5a8a;
}

.ghost {
  border: 1px solid rgba(49, 65, 95, 0.25);
  background: transparent;
  color: #31415f;
}

.ghost:hover:not(:disabled) {
  border-color: #3d6eb0;
  background: rgba(84, 148, 255, 0.08);
}

.ghost.mini {
  padding: 5px 10px;
  font-size: 0.8rem;
  border-radius: 8px;
}

.primary:disabled,
.ghost:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.status {
  margin: 12px 0 0;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 0.86rem;
  line-height: 1.45;
}

.status.ok {
  background: rgba(46, 125, 90, 0.1);
  color: #1f6b4a;
}

.status.error {
  background: rgba(159, 47, 47, 0.08);
  color: #9f2f2f;
}

.fields-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-weight: 600;
  color: #1f2a3d;
  font-size: 0.92rem;
}

.field-controls {
  display: flex;
  gap: 8px;
}

.field-input,
.rgb-grid input {
  border: 1px solid rgba(49, 65, 95, 0.2);
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
  background: #fff;
  color: #1f2a3d;
}

.field-input {
  flex: 1;
  min-width: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.rgb-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
  gap: 8px;
  align-items: end;
}

.rgba-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
}

.rgb-grid label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.78rem;
  color: #6a7a94;
}

.rgb-grid input {
  width: 100%;
  box-sizing: border-box;
}

.slider-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
}

.slider-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #31415f;
  font-size: 0.88rem;
}

.slider-row input[type='range'] {
  width: 100%;
  accent-color: #31486f;
}

.alpha-range {
  accent-color: #31486f;
  background: linear-gradient(
    90deg,
    transparent,
    var(--alpha-color, #31486f)
  );
  border-radius: 999px;
}

.palette-card {
  flex-shrink: 0;
}

.palette-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.palette-head h2 {
  margin: 0;
  font-size: 1.05rem;
  color: #1f2a3d;
}

.palette-head p {
  margin: 6px 0 0;
  color: #6a7a94;
  font-size: 0.86rem;
}

.palette-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}

.palette-list li {
  position: relative;
}

.palette-swatch {
  position: relative;
  width: 100%;
  min-height: 64px;
  border: 1px solid rgba(49, 65, 95, 0.12);
  border-radius: 12px;
  cursor: pointer;
  padding: 0;
  overflow: hidden;
  background-color: #fff;
  background-image:
    linear-gradient(45deg, #d7dde8 25%, transparent 25%),
    linear-gradient(-45deg, #d7dde8 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #d7dde8 75%),
    linear-gradient(-45deg, transparent 75%, #d7dde8 75%);
  background-size: 12px 12px;
  background-position:
    0 0,
    0 6px,
    6px -6px,
    -6px 0;
}

.palette-fill {
  position: absolute;
  inset: 0;
}

.palette-label {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  min-height: 64px;
  padding: 8px;
  box-sizing: border-box;
  font: 0.75rem/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  word-break: break-all;
  text-align: left;
}

.palette-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 999px;
  background: rgba(31, 42, 61, 0.55);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}

.palette-empty {
  margin: 0;
  color: #7a879c;
  font-size: 0.9rem;
}

@media (max-width: 900px) {.picker-layout { grid-template-columns: 1fr; } .rgb-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } .rgba-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .rgb-grid .ghost.mini { grid-column: 1 / -1; }}
</style>
