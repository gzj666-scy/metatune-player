<template>
    <view>
        <view class="header">
            <view class="back-button" @tap="goBack">
                <text>← 返回</text>
            </view>
            <text class="title">关于我们</text>
        </view>

        <view class="content">
            <view class="about-card">
                <view class="logo">🎵</view>
                <text class="app-name">Metatune Player</text>
                <text class="version">版本 1.0.0</text>

                <view class="description">
                    <text
                        >Metatune Player
                        是一个现代化的跨平台音乐播放器，采用最新的前端技术栈开发，提供无缝的音乐体验。</text
                    >
                </view>

                <view class="tech-stack">
                    <text class="tech-title">技术栈：</text>
                    <view class="tech-tags">
                        <view class="tech-tag">Vue 3</view>
                        <view class="tech-tag">TypeScript</view>
                        <view class="tech-tag">Vite</view>
                        <view class="tech-tag">Electron</view>
                        <view class="tech-tag">UniApp</view>
                        <view class="tech-tag">Monorepo</view>
                    </view>
                </view>

                <view class="features">
                    <text class="features-title">特色功能：</text>
                    <view class="feature-item"
                        >🎯 多端支持 (桌面端 + 移动端)</view
                    >
                    <view class="feature-item">⚡ 极速加载</view>
                    <view class="feature-item">🎨 现代化界面</view>
                    <view class="feature-item">🔧 Monorepo 架构</view>
                </view>
            </view>
        </view>
    </view>
</template>

<script setup lang="ts">
    import { onLoad } from "@dcloudio/uni-app";

    const goBack = () => {
        uni.navigateBack();
    };

    onLoad(() => {
        console.log("关于页面加载");
    });
</script>

<style lang="scss" scoped>
    .header {
        display: flex;
        align-items: center;
        padding: 30rpx 40rpx;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;

        .back-button {
            padding: 10rpx 20rpx;
            border-radius: 8rpx;
            background: rgba(255, 255, 255, 0.1);
            margin-right: 20rpx;
        }

        .title {
            font-size: 36rpx;
            font-weight: bold;
        }
    }

    .content {
        padding: 40rpx;
    }

    .about-card {
        background: white;
        border-radius: 20rpx;
        padding: 40rpx;
        box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
        text-align: center;
    }

    .logo {
        font-size: 100rpx;
        margin-bottom: 20rpx;
    }

    .app-name {
        display: block;
        font-size: 48rpx;
        font-weight: bold;
        color: #333;
        margin-bottom: 10rpx;
    }

    .version {
        display: block;
        font-size: 28rpx;
        color: #666;
        margin-bottom: 40rpx;
    }

    .description {
        font-size: 28rpx;
        line-height: 1.6;
        color: #555;
        margin-bottom: 40rpx;
        text-align: left;
    }

    .tech-stack {
        margin-bottom: 40rpx;
        text-align: left;

        .tech-title {
            display: block;
            font-size: 32rpx;
            font-weight: bold;
            margin-bottom: 20rpx;
            color: #333;
        }

        .tech-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 20rpx;

            .tech-tag {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 10rpx 20rpx;
                border-radius: 8rpx;
                font-size: 24rpx;
            }
        }
    }

    .features {
        text-align: left;

        .features-title {
            display: block;
            font-size: 32rpx;
            font-weight: bold;
            margin-bottom: 20rpx;
            color: #333;
        }

        .feature-item {
            font-size: 28rpx;
            color: #555;
            margin-bottom: 15rpx;
            padding-left: 20rpx;
            position: relative;

            &::before {
                content: "•";
                position: absolute;
                left: 0;
                color: #667eea;
            }
        }
    }
</style>
