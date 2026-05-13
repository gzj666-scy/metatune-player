<template>
    <div class="hello-world">
        <h1>{{ msg }}</h1>
        <p class="description">{{ description }}</p>
        <slot name="default"></slot>
    </div>
</template>

<script lang="ts" setup>
    import { computed } from "vue";

    interface Props {
        msg: string;
        description?: string;
    }

    const props = withDefaults(defineProps<Props>(), {
        description: "这是一个公共组件，在桌面端和移动端都可以使用",
    });

    const formattedMessage = computed(() => `✨ ${props.msg} ✨`);
</script>

<style scoped>
    .hello-world {
        text-align: center;
        padding: 20px;
        border-radius: 8px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        margin: 20px 0;
    }

    h1 {
        font-size: 2em;
        margin-bottom: 10px;
    }

    .description {
        font-size: 1.1em;
        opacity: 0.9;
    }
</style>
