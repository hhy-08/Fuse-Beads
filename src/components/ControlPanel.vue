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
        <span>珠子尺寸 {{ beadSize }}px</span>
        <input
          type="range"
          min="8"
          max="28"
          :value="beadSize"
          @input="EmitBeadSize"
        />
      </label>

      <div class="color-row">
        <label class="color-field">
          <span>珠子颜色</span>
          <input type="color" :value="beadColor" @input="EmitBeadColor" />
        </label>
        <label class="color-field">
          <span>背景颜色</span>
          <input
            type="color"
            :value="backgroundColor"
            @input="EmitBackgroundColor"
          />
        </label>
      </div>

      <label class="toggle">
        <input type="checkbox" :checked="showGrid" @change="EmitShowGrid" />
        <span>显示辅助网格</span>
      </label>
    </section>

    <section class="section">
      <h2>描边设置</h2>
      <label class="toggle">
        <input type="checkbox" :checked="showStroke" @change="EmitShowStroke" />
        <span>启用描边</span>
      </label>

      <div class="color-row" :class="{ disabled: !showStroke }">
        <label class="color-field">
          <span>描边颜色</span>
          <input
            type="color"
            :value="strokeColor"
            :disabled="!showStroke"
            @input="EmitStrokeColor"
          />
        </label>
      </div>

      <label class="field" :class="{ disabled: !showStroke }">
        <span>描边粗细 {{ strokeWidth }}px</span>
        <input
          type="range"
          min="0.5"
          max="4"
          step="0.5"
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
 * 使用 Options API 收集用户配置并通过事件回传父组件
 */
import { defineComponent } from 'vue'

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
  /**
   * 组件挂载后聚焦文字输入框，方便立即编辑
   */
  mounted() {
    const input = this.$el.querySelector('.text-input') as HTMLInputElement | null
    if (input) {
      input.focus()
      input.select()
    }
  },
  methods: {
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
     * 派发珠子颜色变更事件
     * @param event 输入事件
     */
    EmitBeadColor(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateBeadColor', target.value)
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
     * 派发描边颜色变更事件
     * @param event 输入事件
     */
    EmitStrokeColor(event: Event) {
      const target = event.target as HTMLInputElement
      this.$emit('UpdateStrokeColor', target.value)
    },
    /**
     * 派发描边粗细变更事件
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

.color-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
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
