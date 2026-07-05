<script lang="ts">
    import { fade, scale } from "svelte/transition";

    let {
        active = $bindable(false),
        title = "Confirmation",
        message = "Êtes-vous sûr de vouloir effectuer cette action ?",
        confirmLabel = "Confirmer",
        cancelLabel = "Annuler",
        type = "danger",
        onclose,
        onconfirm,
    } = $props();

    function close() {
        active = false;
        onclose?.();
    }

    function confirm() {
        onconfirm?.();
    }
</script>

{#if active}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
        class="modal-overlay" 
        role="button"
        tabindex="-1"
        onclick={close}
        transition:fade={{ duration: 200 }}
    >
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
            class="modal-content {type}" 
            role="dialog"
            aria-modal="true"
            tabindex="-1"
            onclick={(e) => e.stopPropagation()}
            transition:scale={{ duration: 300, start: 0.95, opacity: 0 }}
        >
            <div class="modal-header">
                <div class="modal-icon">
                    {#if type === "danger"}
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="admin-icon"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    {:else if type === "warning"}
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="admin-icon"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    {:else}
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="admin-icon"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    {/if}
                </div>
                <h3>{title}</h3>
            </div>

            <div class="modal-body">
                <p>{message}</p>
            </div>

            <div class="modal-actions">
                <button class="btn-cancel" onclick={close}>
                    {cancelLabel}
                </button>
                <button class="btn-confirm" onclick={confirm}>
                    {confirmLabel}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.4);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        padding: 1.5rem;
    }

    .modal-content {
        background: #ffffff;
        border: 1px solid var(--admin-border);
        border-radius: var(--admin-radius);
        width: 100%;
        max-width: 400px;
        box-shadow: var(--admin-shadow-lg);
        overflow: hidden;
        animation: modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modal-in {
        from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }

    .modal-header {
        padding: 2.5rem 1.5rem 1rem;
        text-align: center;
    }

    .modal-icon {
        margin-bottom: 1.25rem;
        display: flex;
        justify-content: center;
        color: var(--admin-text-secondary);
        opacity: 0.8;
    }

    .modal-header h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--admin-text);
        letter-spacing: -0.01em;
    }

    .modal-body {
        padding: 0 2rem 2.5rem;
        text-align: center;
    }

    .modal-body p {
        margin: 0;
        font-size: 0.875rem;
        line-height: 1.6;
        color: var(--admin-text-secondary);
    }

    .modal-actions {
        display: flex;
        border-top: 1px solid var(--admin-border);
    }

    .modal-actions button {
        flex: 1;
        padding: 1.25rem;
        border: none;
        background: #ffffff;
        font-family: inherit;
        font-size: 0.8125rem;
        font-weight: 600;
        cursor: pointer;
        transition: var(--admin-transition);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .modal-actions button:first-child {
        border-right: 1px solid var(--admin-border);
    }

    .btn-cancel {
        color: var(--admin-text-secondary);
    }

    .btn-cancel:hover {
        background: #f8fafc;
        color: var(--admin-text);
    }

    .btn-confirm {
        color: var(--admin-text);
    }

    .danger .btn-confirm {
        color: var(--admin-danger);
    }

    .danger .btn-confirm:hover {
        background: rgba(239, 68, 68, 0.03);
    }

    .warning .btn-confirm {
        color: #f59e0b;
    }

    .warning .btn-confirm:hover {
        background: rgba(245, 158, 11, 0.03);
    }

    .info .btn-confirm {
        color: var(--admin-primary);
    }

    .info .btn-confirm:hover {
        background: rgba(59, 130, 246, 0.03);
    }
</style>
