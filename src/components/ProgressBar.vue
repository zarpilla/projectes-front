<template>
  <div class="k-progress">
    <div class="k-progress-outer">
      <div
        class="k-progress-outer-bg k-progress-outer-bg-border"
        :style="{ background: bgColor, height: lineHeight + 'px' }"
      ></div>
      <div
        class="k-progress-outer-line"
        :style="{
          width: percent + '%',
          height: lineHeight + 'px',
          marginTop: -lineHeight + 'px',
          background: color
        }"
      ></div>
    </div>
    <div class="k-progress-text">{{ percent }}%</div>
  </div>
</template>

<script>
// Replaces k-progress 1.5.0 (Vue 2 only), registered globally as <kk-progress>.
// Only the plain "line" bar is used here, so this renders the same markup and
// styles as k-progress for that case.
export default {
  name: "ProgressBar",
  props: {
    percent: {
      type: Number,
      default: 0,
      required: true,
      validator: value => value >= 0 && value <= 100
    },
    color: {
      type: String,
      default: "#409eff"
    },
    bgColor: {
      type: String,
      default: "#ebeef5"
    },
    lineHeight: {
      type: Number,
      default: 6
    }
  }
};
</script>

<style>
.k-progress {
  margin: 0;
  padding: 0;
  color: #606266;
  font-size: 14px;
  margin-right: 8px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}
.k-progress-outer {
  box-sizing: border-box;
  width: 100%;
  display: inline-block;
  vertical-align: middle;
  margin-right: -55px;
  padding-right: 50px;
}
.k-progress-outer-bg {
  width: 100%;
  position: relative;
}
.k-progress-outer-bg-border {
  border-radius: 100px;
}
.k-progress-outer-line {
  position: relative;
  border-radius: 100px;
  transition: all 0.4s cubic-bezier(0.08, 0.82, 0.17, 1) 0s;
}
.k-progress-text {
  margin-left: 10px;
  display: inline-block;
  vertical-align: middle;
  text-align: left;
  word-break: keep-all;
}
</style>
