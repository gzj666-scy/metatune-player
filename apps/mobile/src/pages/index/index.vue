<template>
    <view class="page-container">
        <!-- 自定义导航栏 -->
        <view class="custom-navbar">
            <view class="navbar-left">
                <text class="navbar-title">🎵 Metatune Player</text>
            </view>
            <view class="navbar-right">
                <text class="platform-badge">移动端</text>
            </view>
        </view>

        <!-- 主内容 -->
        <scroll-view class="content" scroll-y>
            <view class="hero-section">
                <HelloWorld
                    msg="欢迎使用 Metatune Player"
                    description="移动端版本，随时随地享受音乐"
                />
            </view>

            <view class="features-section">
                <view class="section-title">
                    <text>✨ 核心功能</text>
                </view>

                <view class="features-grid">
                    <view class="feature-item">
                        <view class="feature-icon">🎧</view>
                        <text class="feature-title">高品质播放</text>
                        <text class="feature-desc">支持多种音频格式</text>
                    </view>

                    <view class="feature-item">
                        <view class="feature-icon">📱</view>
                        <text class="feature-title">多端同步</text>
                        <text class="feature-desc">与桌面端数据同步</text>
                    </view>

                    <view class="feature-item">
                        <view class="feature-icon">🎵</view>
                        <text class="feature-title">智能推荐</text>
                        <text class="feature-desc">个性化音乐推荐</text>
                    </view>

                    <view class="feature-item">
                        <view class="feature-icon">⚡</view>
                        <text class="feature-title">快速加载</text>
                        <text class="feature-desc">基于 Vite 构建</text>
                    </view>
                </view>
            </view>

            <view class="demo-section">
                <view class="section-title">
                    <text>🧪 公共包功能演示</text>
                </view>

                <view class="demo-card">
                    <view class="demo-item">
                        <text class="demo-label">格式化时间:</text>
                        <text class="demo-value">{{ 5555555555 }}</text>
                    </view>

                    <view class="demo-item">
                        <text class="demo-label">唯一ID:</text>
                        <text class="demo-value">{{ 666666666666 }}</text>
                    </view>

                    <button class="demo-button">
                        <text>🔄 生成新ID</text>
                    </button>

                    <view class="counter-demo">
                        <text class="counter-label">节流计数: 1</text>
                        <button class="counter-button">
                            <text>⚡ 快速点击</text>
                        </button>
                    </view>
                </view>
            </view>

            <view class="action-section">
                <button class="primary-button" @tap="goToAbout">
                    <text>📖 关于我们</text>
                </button>

                <button class="secondary-button" @tap="showSystemInfo">
                    <text>ℹ️ 系统信息</text>
                </button>
            </view>
        </scroll-view>
    </view>
</template>

<script setup lang="ts">
    import { ref } from "vue";
    import { onLoad } from "@dcloudio/uni-app";
    import { HelloWorld } from "@metatune/common";

    // 页面跳转
    const goToAbout = () => {
        uni.navigateTo({
            url: "/pages/about/about",
        });
    };

    // 系统信息
    const showSystemInfo = () => {
        const systemInfo = uni.getSystemInfoSync();
        uni.showModal({
            title: "系统信息",
            content: `系统: ${systemInfo.platform}\n版本: ${systemInfo.version}\n屏幕: ${systemInfo.windowWidth}x${systemInfo.windowHeight}`,
            showCancel: false,
        });
    };

    // 页面加载
    onLoad(() => {
        console.log("页面加载完成");
    });
</script>

<style lang="scss" scoped>
    .page-container {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
    }

    .custom-navbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 30rpx 40rpx;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;

        .navbar-title {
            font-size: 36rpx;
            font-weight: bold;
        }

        .platform-badge {
            background: rgba(255, 255, 255, 0.2);
            padding: 8rpx 16rpx;
            border-radius: 20rpx;
            font-size: 24rpx;
        }
    }

    .content {
        flex: 1;
        padding: 40rpx;
    }

    .hero-section {
        margin-bottom: 60rpx;
    }

    .section-title {
        font-size: 36rpx;
        font-weight: bold;
        margin: 40rpx 0 20rpx;
        color: #333;
    }

    .features-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20rpx;
        margin: 20rpx 0;
    }

    .feature-item {
        background: white;
        border-radius: 20rpx;
        padding: 30rpx;
        text-align: center;
        box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
        transition: transform 0.3s;

        &:active {
            transform: scale(0.95);
        }

        .feature-icon {
            font-size: 60rpx;
            margin-bottom: 20rpx;
        }

        .feature-title {
            display: block;
            font-size: 30rpx;
            font-weight: bold;
            margin-bottom: 10rpx;
            color: #333;
        }

        .feature-desc {
            display: block;
            font-size: 24rpx;
            color: #666;
        }
    }

    .demo-section {
        margin: 40rpx 0;
    }

    .demo-card {
        background: white;
        border-radius: 20rpx;
        padding: 40rpx;
        margin-top: 20rpx;
        box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
    }

    .demo-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20rpx;
        padding-bottom: 20rpx;
        border-bottom: 2rpx solid #f0f0f0;

        &:last-child {
            border-bottom: none;
        }

        .demo-label {
            font-size: 28rpx;
            color: #666;
        }

        .demo-value {
            font-size: 28rpx;
            font-weight: bold;
            color: #667eea;
            word-break: break-all;
        }
    }

    .demo-button {
        width: 100%;
        margin: 20rpx 0;
        background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
    }

    .counter-demo {
        margin-top: 40rpx;
        text-align: center;

        .counter-label {
            display: block;
            font-size: 28rpx;
            margin-bottom: 20rpx;
            color: #333;
        }

        .counter-button {
            background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
        }
    }

    .action-section {
        margin: 60rpx 0;

        .primary-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin-bottom: 20rpx;
        }

        .secondary-button {
            background: linear-gradient(135deg, #607d8b 0%, #37474f 100%);
        }
    }
</style>
