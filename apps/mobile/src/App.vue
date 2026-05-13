<script setup lang="ts">
    import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
    import { ref } from "vue";

    // 应用启动
    onLaunch(() => {
        console.log("应用启动");
    });

    // 应用显示
    onShow(() => {
        console.log("应用显示");
    });

    // 应用隐藏
    onHide(() => {
        console.log("应用隐藏");
    });

    const title = ref("Metatune Player");
</script>

<style>
    /* 全局样式 */
    page {
        font-family:
            -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        min-height: 100vh;
    }

    .container {
        padding: 20rpx;
    }

    .card {
        background: white;
        border-radius: 16rpx;
        box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
        padding: 30rpx;
        margin: 20rpx 0;
    }

    button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 50rpx;
        padding: 20rpx 40rpx;
        font-size: 32rpx;
        font-weight: bold;
        transition: all 0.3s;
    }

    button:active {
        transform: scale(0.95);
    }
</style>
