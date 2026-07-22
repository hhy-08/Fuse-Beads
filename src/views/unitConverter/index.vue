<template>
  <div class="unit-page">
    <header class="hero">
      <div class="hero-copy">
        <p class="brand">{{ appBrand }}</p>
        <h1>单位转换</h1>
        <p class="subtitle">长度、重量、面积、体积、温度一键换算</p>
      </div>
      <nav class="hero-nav">
        <router-link to="/">工具列表</router-link>
        <router-link to="/about">关于</router-link>
      </nav>
    </header>

    <main class="workspace">
      <section class="converter-card">
        <div class="type-tabs">
          <button
            v-for="type in measureTypes"
            :key="type.value"
            type="button"
            class="type-tab"
            :class="{ active: selectedType === type.value }"
            @click="HandleSelectType(type.value)"
          >
            {{ type.label }}
          </button>
        </div>

        <p v-if="rateText" class="conversion-formula">
          <template v-if="selectedType === 'temperature'">
            {{ rateText }}
          </template>
          <template v-else>
            1 {{ fromLabel }} = {{ rateText }} {{ toLabel }}
          </template>
        </p>

        <div class="converter-form">
          <div class="conversion-row">
            <input
              class="value-input"
              type="number"
              step="any"
              :value="inputValue"
              @input="HandleInputChange"
            />
            <select class="unit-select" :value="fromUnit" @change="HandleFromUnitChange">
              <option
                v-for="unit in availableUnits"
                :key="unit.value"
                :value="unit.value"
              >
                {{ unit.label }}
              </option>
            </select>
          </div>

          <div class="conversion-arrow">
            <button type="button" class="swap-btn" title="交换单位" @click="HandleSwap">
              ↕ 交换
            </button>
          </div>

          <div class="conversion-row">
            <input
              class="value-input"
              type="number"
              step="any"
              :value="outputValue"
              readonly
            />
            <select class="unit-select" :value="toUnit" @change="HandleToUnitChange">
              <option
                v-for="unit in availableUnits"
                :key="unit.value"
                :value="unit.value"
              >
                {{ unit.label }}
              </option>
            </select>
          </div>
        </div>
      </section>

      <section v-if="conversionHistory.length" class="history-card">
        <div class="history-header">
          <h2>转换记录</h2>
          <button type="button" class="clear-btn" @click="ClearHistory">
            清空记录
          </button>
        </div>
        <ul class="history-list">
          <li v-for="(record, index) in conversionHistory" :key="`${record.timestamp}-${index}`">
            <div class="history-meta">
              <span class="type-tag">{{ ResolveTypeLabel(record.type) }}</span>
              <span class="timestamp">{{ record.timestamp }}</span>
            </div>
            <p class="history-text">{{ record.input }} → {{ record.output }}</p>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<script lang="ts">
/**
 * 单位转换工具页
 * 参考 toolbox unit-converter：多类型换算与历史记录
 */
import { defineComponent } from 'vue'
import { APPBRAND } from '@/utils/Brand'
import {
  ConvertUnitValue,
  FormatUnitNumber,
  GetMeasureTypes,
  GetUnitDefinitions,
  ResolveConversionRateText,
  ResolveDefaultUnits,
  ResolveUnitShortLabel,
  type UnitConversionRecord,
  type UnitMeasureType,
  type UnitOption,
} from '@/utils/UnitConverter'

export default defineComponent({
  name: 'UnitConverterView',
  data() {
    const defaults = ResolveDefaultUnits('length')
    return {
      appBrand: APPBRAND,
      measureTypes: GetMeasureTypes(),
      unitDefinitions: GetUnitDefinitions(),
      selectedType: 'length' as UnitMeasureType,
      inputValue: 1,
      fromUnit: defaults.fromUnit,
      toUnit: defaults.toUnit,
      outputValue: '0',
      conversionHistory: [] as UnitConversionRecord[],
      historyTimer: null as ReturnType<typeof setTimeout> | null,
    }
  },
  computed: {
    /**
     * 当前类型可用单位
     * @returns 单位列表
     */
    availableUnits(): UnitOption[] {
      return this.unitDefinitions[this.selectedType] || []
    },
    /**
     * 源单位简称
     * @returns 文案
     */
    fromLabel(): string {
      return ResolveUnitShortLabel(this.availableUnits, this.fromUnit)
    },
    /**
     * 目标单位简称
     * @returns 文案
     */
    toLabel(): string {
      return ResolveUnitShortLabel(this.availableUnits, this.toUnit)
    },
    /**
     * 换算比率说明
     * @returns 文案
     */
    rateText(): string {
      return ResolveConversionRateText(
        this.selectedType,
        this.fromUnit,
        this.toUnit,
      )
    },
  },
  /**
   * 挂载后初始化换算
   */
  mounted() {
    this.$store.commit('SETAPPTITLE', '单位转换')
    this.RunConvert(false)
  },
  /**
   * 卸载时清理定时器
   */
  beforeUnmount() {
    if (this.historyTimer) {
      clearTimeout(this.historyTimer)
    }
  },
  methods: {
    /**
     * 类型中文名
     * @param type 类型
     * @returns 文案
     */
    ResolveTypeLabel(type: UnitMeasureType): string {
      const matched = this.measureTypes.find((item) => item.value === type)
      return matched ? matched.label : type
    },
    /**
     * 执行换算
     * @param shouldRecord 是否写入历史
     */
    RunConvert(shouldRecord: boolean) {
      const result = ConvertUnitValue(
        this.selectedType,
        Number(this.inputValue),
        this.fromUnit,
        this.toUnit,
      )
      this.outputValue = FormatUnitNumber(result)
      if (shouldRecord) {
        this.ScheduleHistoryRecord()
      }
    },
    /**
     * 防抖写入历史，避免输入时刷屏
     */
    ScheduleHistoryRecord() {
      if (this.historyTimer) {
        clearTimeout(this.historyTimer)
      }
      this.historyTimer = setTimeout(() => {
        this.AddConversionRecord()
      }, 450)
    },
    /**
     * 追加转换记录
     */
    AddConversionRecord() {
      if (!this.fromUnit || !this.toUnit) {
        return
      }
      const record: UnitConversionRecord = {
        type: this.selectedType,
        input: `${FormatUnitNumber(Number(this.inputValue))} ${this.fromLabel}`,
        output: `${this.outputValue} ${this.toLabel}`,
        timestamp: new Date().toLocaleString(),
      }
      const first = this.conversionHistory[0]
      if (
        first &&
        first.type === record.type &&
        first.input === record.input &&
        first.output === record.output
      ) {
        return
      }
      this.conversionHistory.unshift(record)
      if (this.conversionHistory.length > 50) {
        this.conversionHistory.pop()
      }
    },
    /**
     * 切换转换类型
     * @param type 类型
     */
    HandleSelectType(type: UnitMeasureType) {
      this.selectedType = type
      const defaults = ResolveDefaultUnits(type)
      this.fromUnit = defaults.fromUnit
      this.toUnit = defaults.toUnit
      this.RunConvert(true)
    },
    /**
     * 输入值变更
     * @param event 输入事件
     */
    HandleInputChange(event: Event) {
      const target = event.target as HTMLInputElement
      this.inputValue = Number(target.value)
      this.RunConvert(true)
    },
    /**
     * 源单位变更
     * @param event 变更事件
     */
    HandleFromUnitChange(event: Event) {
      const target = event.target as HTMLSelectElement
      this.fromUnit = target.value
      this.RunConvert(true)
    },
    /**
     * 目标单位变更
     * @param event 变更事件
     */
    HandleToUnitChange(event: Event) {
      const target = event.target as HTMLSelectElement
      this.toUnit = target.value
      this.RunConvert(true)
    },
    /**
     * 交换源/目标单位，并回填当前结果为输入
     */
    HandleSwap() {
      const nextInput = Number(this.outputValue)
      const nextFrom = this.toUnit
      const nextTo = this.fromUnit
      this.fromUnit = nextFrom
      this.toUnit = nextTo
      this.inputValue = Number.isFinite(nextInput) ? nextInput : 0
      this.RunConvert(true)
    },
    /**
     * 清空历史
     */
    ClearHistory() {
      this.conversionHistory = []
    },
  },
})
</script>

<style scoped>
.unit-page {
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
  width: min(760px, 100%);
  margin: 0 auto;
  padding: 28px 6vw 48px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.converter-card,
.history-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(49, 65, 95, 0.1);
}

.type-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.type-tab {
  border: 1px solid rgba(49, 65, 95, 0.18);
  background: #fff;
  color: #31415f;
  border-radius: 999px;
  padding: 8px 14px;
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
}

.type-tab.active {
  background: #31486f;
  border-color: #31486f;
  color: #fff8ef;
}

.conversion-formula {
  margin: 16px 0 0;
  text-align: center;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(49, 72, 111, 0.08);
  color: #4a5a76;
  font-size: 0.95rem;
}

.converter-form {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.conversion-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.value-input,
.unit-select {
  border: 1px solid rgba(49, 65, 95, 0.2);
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
  background: #fff;
  color: #1f2a3d;
}

.value-input {
  flex: 1;
  min-width: 0;
}

.unit-select {
  width: 168px;
  flex-shrink: 0;
}

.value-input[readonly] {
  background: rgba(238, 242, 248, 0.9);
  color: #31415f;
}

.conversion-arrow {
  display: flex;
  justify-content: center;
}

.swap-btn {
  border: 1px solid rgba(49, 65, 95, 0.2);
  background: #fff;
  color: #2f5f9f;
  border-radius: 999px;
  padding: 6px 14px;
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
}

.swap-btn:hover {
  border-color: #3d6eb0;
  background: rgba(84, 148, 255, 0.08);
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.history-header h2 {
  margin: 0;
  font-size: 1.05rem;
  color: #1f2a3d;
}

.clear-btn {
  border: none;
  background: transparent;
  color: #9f2f2f;
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 360px;
  overflow-y: auto;
}

.history-list li {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(49, 72, 111, 0.05);
}

.history-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.type-tag {
  display: inline-block;
  min-width: 48px;
  text-align: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(49, 72, 111, 0.12);
  color: #31486f;
  font-size: 0.75rem;
}

.timestamp {
  color: #7a879c;
  font-size: 0.78rem;
}

.history-text {
  margin: 0;
  color: #31415f;
  font-size: 0.92rem;
}

@media (max-width: 700px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .conversion-row {
    flex-direction: column;
    align-items: stretch;
  }

  .unit-select {
    width: 100%;
  }
}
</style>
