<template>
    <div class="lyric-container" ref="lyricContainer">
        <!-- 歌词显示区域 -->
        <div
            class="lyric-lines"
            :style="{ transform: `translateY(${translateY}px)` }"
        >
            <div
                v-for="(line, index) in lyricLines"
                :key="index"
                class="lyric-line"
                :class="{
                    current: index === currentLyricIndex,
                    passed: index < currentLyricIndex,
                }"
                :style="{
                    color: getLineColor(index),
                    fontSize: index === currentLyricIndex ? '1.2em' : '1em',
                    opacity: getLineOpacity(index),
                }"
                @click="seekToLine(line.time)"
            >
                <div class="main-text">{{ line.text }}</div>
                <div v-if="line.translatedText" class="translated-text">
                    {{ line.translatedText }}
                </div>
            </div>
        </div>

        <!-- 无歌词提示 -->
        <div v-if="!lyricLines.length" class="no-lyric">
            <p>暂无歌词</p>
            <button
                v-if="!isLoadingExternalLyric"
                class="load-external-btn"
                @click="loadExternalLyric"
            >
                加载外部歌词文件
            </button>
            <p v-else>加载中...</p>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { ref, computed, watch, onMounted, onUnmounted } from "vue";
    import { LyricParser } from "../utils/lyricParser";
    import { DynamicColorAdjuster } from "../utils/colorUtils";

    interface Props {
        lyricText?: string; // 内嵌歌词文本
        lyricFilePath?: string; // 外挂歌词文件路径
        currentTime: number; // 当前播放时间(秒)
        backgroundColor?: [number, number, number]; // 背景主色调，用于动态调整文字颜色
        onSeek?: (time: number) => void; // 点击歌词跳转的回调
    }

    const props = withDefaults(defineProps<Props>(), {
        currentTime: 0,
        backgroundColor: () => [128, 128, 128] as [number, number, number],
    });

    const emit = defineEmits<{
        seek: [time: number];
        "load-external": [];
    }>();

    // 响应式数据
    const lyricLines = ref<
        Array<{ time: number; text: string; translatedText?: string }>
    >([]);
    const currentLyricIndex = ref(-1);
    const translateY = ref(0);
    const lyricContainer = ref<HTMLDivElement>();
    const isLoadingExternalLyric = ref(false);

    // 计算属性
    const lineHeight = 60; // 每行歌词的高度(px)
    const visibleLines = 5; // 可见行数

    // 歌词颜色
    const getLineColor = (index: number): string => {
        const isCurrent = index === currentLyricIndex.value;
        return DynamicColorAdjuster.getTextColor(
            props.backgroundColor,
            isCurrent,
        );
    };

    // 歌词透明度
    const getLineOpacity = (index: number): number => {
        if (index === currentLyricIndex.value) return 1;
        if (Math.abs(index - currentLyricIndex.value) <= 1) return 0.8;
        return 0.5;
    };

    // 监听当前时间变化
    watch(
        () => props.currentTime,
        (newTime) => {
            if (!lyricLines.value.length) return;

            const { currentIndex } = LyricParser.getCurrentLyric(
                lyricLines.value,
                newTime,
            );

            if (currentIndex !== currentLyricIndex.value) {
                currentLyricIndex.value = currentIndex;
                // 滚动到当前歌词位置
                scrollToCurrentLyric();
            }
        },
    );

    // 监听内嵌歌词文本变化
    watch(
        () => props.lyricText,
        (newLyricText) => {
            if (newLyricText) {
                parseLyric(newLyricText);
            } else {
                lyricLines.value = [];
                currentLyricIndex.value = -1;
            }
        },
    );

    // 初始化时解析歌词
    onMounted(() => {
        if (props.lyricText) {
            parseLyric(props.lyricText);
        }
    });

    // 解析歌词
    const parseLyric = (text: string) => {
        // 尝试LRC格式解析
        let lines = LyricParser.parseLRC(text);

        if (lines.length === 0) {
            // 如果LRC解析失败，尝试TXT格式
            lines = LyricParser.parseTXT(text);
        }

        lyricLines.value = lines;
        currentLyricIndex.value = -1;
        translateY.value = 0;
    };

    // 滚动到当前歌词
    const scrollToCurrentLyric = () => {
        if (currentLyricIndex.value < 0 || !lyricContainer.value) return;

        const targetPosition = currentLyricIndex.value * lineHeight;
        const containerHeight = lyricContainer.value.clientHeight;
        const centerPosition = containerHeight / 2 - lineHeight / 2;

        translateY.value = centerPosition - targetPosition;

        // 平滑过渡
        lyricContainer.value.style.transition = "transform 0.3s ease";
        setTimeout(() => {
            if (lyricContainer.value) {
                lyricContainer.value.style.transition = "";
            }
        }, 300);
    };

    // 点击歌词跳转
    const seekToLine = (time: number) => {
        emit("seek", time);
    };

    // 加载外部歌词
    const loadExternalLyric = () => {
        isLoadingExternalLyric.value = true;
        emit("load-external");
    };

    // 暴露方法：从外部设置歌词
    const setLyric = (
        lines: Array<{ time: number; text: string; translatedText?: string }>,
    ) => {
        lyricLines.value = lines;
        currentLyricIndex.value = -1;
        translateY.value = 0;
    };

    // 暴露方法供父组件调用
    defineExpose({
        setLyric,
    });
</script>

<style scoped>
    .lyric-container {
        height: 300px;
        overflow: hidden;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .lyric-lines {
        transition: transform 0.3s ease;
        text-align: center;
        width: 100%;
    }

    .lyric-line {
        padding: 10px 0;
        margin: 5px 0;
        cursor: pointer;
        transition: all 0.3s ease;
        min-height: 40px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .lyric-line:hover {
        transform: scale(1.05);
    }

    .lyric-line.current {
        font-weight: bold;
        text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
    }

    .main-text {
        font-size: 1.1em;
        margin-bottom: 4px;
    }

    .translated-text {
        font-size: 0.9em;
        opacity: 0.8;
        font-style: italic;
    }

    .no-lyric {
        text-align: center;
        color: var(--text-color-secondary, #999);
    }

    .load-external-btn {
        margin-top: 10px;
        padding: 8px 16px;
        background: var(--primary-color, #0066cc);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .load-external-btn:hover {
        background: var(--primary-color-dark, #0052a3);
    }
</style>
