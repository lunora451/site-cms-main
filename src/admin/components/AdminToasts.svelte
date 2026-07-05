<script lang="ts">
    import { toastStore, removeToast, showToast } from '../../libs/admin/toast-store';
    import { fly } from 'svelte/transition';
    import { onMount } from 'svelte';

    onMount(() => {
        // Expose to window for legacy scripts compatibility
        (window as any).showToast = showToast;
    });
</script>

<div class="admin-toast-container">
    {#each $toastStore as toast (toast.id)}
        <div 
            class="admin-toast admin-toast-{toast.type}"
            in:fly={{ y: 20, duration: 300 }}
            out:fly={{ x: 100, duration: 300 }}
            on:click={() => removeToast(toast.id)}
            role="alert"
        >
            {toast.message}
        </div>
    {/each}
</div>

<style>
    /* Ensure the container is always present for portals if needed, 
       but here we just use fixed positioning already defined in CSS */
    .admin-toast-container {
        position: fixed;
        bottom: 0;
        right: 0;
        z-index: 9999;
        pointer-events: none;
    }

    .admin-toast {
        pointer-events: auto;
        cursor: pointer;
        margin: 1rem 2rem;
        /* Animation is handled by Svelte slide/fly, 
           so we override the CSS animation if it exists */
        animation: none !important;
    }
</style>
