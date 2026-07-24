<template>
  <article class="clock-card" :class="{ night: !item.isDaytime }">
    <div class="card-top">
      <div>
        <h3>{{ item.country }}</h3>
        <p class="card-label">{{ item.label }}</p>
      </div>
      <div class="card-top-right">
        <span class="period-badge" :title="`${item.ampm} · ${item.periodLabel}`">
          {{ item.periodLabel }}
        </span>
        <button
          type="button"
          class="fav-btn"
          :class="{ active: isFavorite }"
          :title="isFavorite ? '取消收藏' : '收藏'"
          @click="$emit('ToggleFavorite', item.timezone)"
        >
          {{ isFavorite ? '★' : '☆' }}
        </button>
      </div>
    </div>

    <div class="card-body">
      <div class="analog" aria-hidden="true">
        <div class="analog-face">
          <span
            v-for="tick in 12"
            :key="tick"
            class="tick"
            :style="{ transform: `rotate(${tick * 30}deg)` }"
          />
          <span class="hand hour" :style="{ transform: `rotate(${item.hourDeg}deg)` }" />
          <span class="hand minute" :style="{ transform: `rotate(${item.minuteDeg}deg)` }" />
          <span class="hand second" :style="{ transform: `rotate(${item.secondDeg}deg)` }" />
          <span class="center-dot" />
        </div>
      </div>

      <div class="digital">
        <p class="card-time">{{ item.timeText }}</p>
        <p class="card-time12">{{ item.time12Text }}</p>
        <p class="period-line">
          <span class="ampm-tag">{{ item.ampm }}</span>
          <span>{{ item.isDaytime ? '白天' : '夜间' }}</span>
        </p>
      </div>
    </div>

    <div class="card-meta">
      <span>{{ item.dateText }} · {{ item.weekdayText }}</span>
      <span class="offset">{{ item.offsetText }}</span>
    </div>
    <button
      type="button"
      class="ghost mini"
      @click="
        $emit(
          'Copy',
          `${item.country} ${item.dateText} ${item.timeText}（${item.periodLabel}/${item.ampm}） ${item.offsetText}`
        )
      "
    >
      复制
    </button>
  </article>
</template>

<script lang="ts">
/**
 * 世界时钟单卡：模拟表盘 + 数字时间 + 上午/下午时段
 */
import { defineComponent, type PropType } from 'vue'
import type { WorldClockItem } from '@/utils/WorldClock'

export default defineComponent({
  name: 'WorldClockCard',
  props: {
    item: {
      type: Object as PropType<WorldClockItem>,
      required: true,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['ToggleFavorite', 'Copy'],
})
</script>

<style scoped>
.clock-card {
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(49, 65, 95, 0.1);
  background: linear-gradient(160deg, #fff8ef 0%, #eef4ff 100%);
  color: #1f2a3d;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.clock-card.night {
  background: linear-gradient(160deg, #243552 0%, #1d2a44 100%);
  color: #fff8ef;
  border-color: rgba(255, 248, 239, 0.12);
}

.card-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.card-top h3 {
  margin: 0;
  font-size: 1.05rem;
}

.card-label {
  margin: 4px 0 0;
  font-size: 0.8rem;
  opacity: 0.78;
}

.card-top-right {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.period-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(49, 72, 111, 0.14);
  color: #31486f;
  white-space: nowrap;
}

.clock-card.night .period-badge {
  background: rgba(255, 210, 122, 0.2);
  color: #ffd27a;
}

.fav-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1.15rem;
  color: inherit;
  opacity: 0.7;
  line-height: 1;
  padding: 0;
}

.fav-btn.active {
  opacity: 1;
  color: #e2a93b;
}

.clock-card.night .fav-btn.active {
  color: #ffd27a;
}

.card-body {
  display: flex;
  align-items: center;
  gap: 14px;
}

.analog {
  flex-shrink: 0;
}

.analog-face {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  border: 2px solid rgba(49, 72, 111, 0.35);
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.55), transparent 45%),
    linear-gradient(160deg, #f7fafc 0%, #d9e4f5 100%);
  box-shadow: inset 0 0 0 4px rgba(255, 255, 255, 0.35);
}

.clock-card.night .analog-face {
  border-color: rgba(255, 248, 239, 0.35);
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 248, 239, 0.12), transparent 45%),
    linear-gradient(160deg, #2a3c5c 0%, #1a2438 100%);
  box-shadow: inset 0 0 0 4px rgba(255, 248, 239, 0.08);
}

.tick {
  position: absolute;
  left: 50%;
  top: 6px;
  width: 2px;
  height: 7px;
  margin-left: -1px;
  background: rgba(49, 72, 111, 0.55);
  transform-origin: 50% 38px;
  border-radius: 1px;
}

.tick:nth-child(3n) {
  height: 10px;
  width: 2.5px;
  background: rgba(49, 72, 111, 0.85);
}

.clock-card.night .tick {
  background: rgba(255, 248, 239, 0.45);
}

.clock-card.night .tick:nth-child(3n) {
  background: rgba(255, 210, 122, 0.9);
}

.hand {
  position: absolute;
  left: 50%;
  bottom: 50%;
  transform-origin: 50% 100%;
  border-radius: 999px;
  background: #1f2a3d;
}

.clock-card.night .hand {
  background: #fff8ef;
}

.hand.hour {
  width: 3.5px;
  height: 24px;
  margin-left: -1.75px;
}

.hand.minute {
  width: 2.5px;
  height: 30px;
  margin-left: -1.25px;
}

.hand.second {
  width: 1.5px;
  height: 34px;
  margin-left: -0.75px;
  background: #d35400;
}

.clock-card.night .hand.second {
  background: #ff9f43;
}

.center-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 7px;
  height: 7px;
  margin: -3.5px 0 0 -3.5px;
  border-radius: 50%;
  background: #d35400;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.55);
}

.clock-card.night .center-dot {
  background: #ff9f43;
  box-shadow: 0 0 0 2px rgba(29, 42, 68, 0.8);
}

.digital {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-time {
  margin: 0;
  font-size: clamp(1.35rem, 2.6vw, 1.75rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  line-height: 1.15;
}

.card-time12 {
  margin: 0;
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.88;
}

.period-line {
  margin: 2px 0 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  opacity: 0.85;
}

.ampm-tag {
  display: inline-flex;
  padding: 1px 7px;
  border-radius: 6px;
  background: rgba(49, 72, 111, 0.12);
  font-weight: 600;
}

.clock-card.night .ampm-tag {
  background: rgba(255, 248, 239, 0.14);
}

.card-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 0.82rem;
  opacity: 0.86;
}

.offset {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(49, 72, 111, 0.12);
}

.clock-card.night .offset {
  background: rgba(255, 248, 239, 0.14);
}

.ghost.mini {
  align-self: flex-start;
  border: 1px solid rgba(49, 65, 95, 0.25);
  background: transparent;
  color: inherit;
  border-radius: 8px;
  padding: 5px 10px;
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
}

.clock-card.night .ghost.mini {
  border-color: rgba(255, 248, 239, 0.28);
}
</style>
