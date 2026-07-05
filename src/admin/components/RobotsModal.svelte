<script lang="ts">
    import { fade, scale } from "svelte/transition";
    import { actions } from "astro:actions";

    let {
        active = $bindable(false),
        onSaveSuccess = null
    } = $props();

    let content = $state("");
    let sha = $state("");
    let isLoading = $state(false);
    let isSaving = $state(false);
    let error = $state("");

    // Fetch data when modal becomes active
    $effect(() => {
        if (active) {
            loadRobots();
        }
    });

    async function loadRobots() {
        isLoading = true;
        error = "";
        try {
            const { data, error: actionError } = await actions.admin.getRobots();
            if (actionError) {
                error = "Impossible de charger le fichier robots.txt";
                console.error(actionError);
            } else if (data) {
                content = data.content;
                sha = data.sha;
            }
        } catch (e) {
            error = "Erreur réseau lors du chargement.";
        } finally {
            isLoading = false;
        }
    }

    async function handleSave() {
        if (!content.trim()) {
            error = "Le contenu ne peut pas être vide.";
            return;
        }

        isSaving = true;
        error = "";
        try {
            const { data, error: actionError } = await actions.admin.saveRobots({
                content,
                sha
            });

            if (actionError) {
                error = "Erreur lors de la sauvegarde : " + (actionError.message || "Inconnue");
            } else {
                active = false;
                onSaveSuccess?.();
            }
        } catch (e) {
            error = "Erreur réseau lors de la sauvegarde.";
        } finally {
            isSaving = false;
        }
    }

    function close() {
        if (isSaving) return;
        active = false;
        content = "";
        sha = "";
        error = "";
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
        <div 
            class="modal-content" 
            role="dialog"
            aria-modal="true"
            tabindex="-1"
            onclick={(e) => e.stopPropagation()}
            transition:scale={{ duration: 300, start: 0.95, opacity: 0 }}
        >
            <div class="modal-header">
                <div class="header-left">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="admin-icon"><path d="M22 10v6M2 10l10-8 10 8c0 0-4.5 3.5-10 3.5S2 10 2 10zM12 18l-1.5-1.5M12 18l1.5-1.5M12 18v-4.5"/></svg>
                    <h3>Modifier Robots.txt</h3>
                </div>
                <button class="close-btn" onclick={close} aria-label="Fermer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>

            <div class="modal-body">
                {#if isLoading}
                    <div class="loader-container">
                        <div class="admin-spinner"></div>
                        <p>Chargement du fichier...</p>
                    </div>
                {:else}
                    {#if error}
                        <div class="error-msg">{error}</div>
                    {/if}
                    <textarea 
                        bind:value={content} 
                        placeholder="Ex: User-agent: *\nAllow: /"
                        disabled={isSaving}
                    ></textarea>
                    <p class="help-text">Ce fichier indique aux moteurs de recherche quelles pages ils peuvent explorer.</p>
                {/if}
            </div>

            <div class="modal-footer">
                <button class="admin-btn" onclick={close} disabled={isSaving}>
                    Annuler
                </button>
                <button class="admin-btn admin-btn-primary" onclick={handleSave} disabled={isSaving || isLoading}>
                    {#if isSaving}
                        <div class="admin-spinner admin-spinner-sm"></div>
                        Sauvegarde...
                    {:else}
                        Sauvegarder
                    {/if}
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
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        padding: 1.5rem;
    }

    .modal-content {
        background: #ffffff;
        border: 1px solid var(--admin-border);
        border-radius: var(--admin-radius-lg);
        width: 100%;
        max-width: 600px;
        max-height: 90vh;
        box-shadow: var(--admin-shadow-lg);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .modal-header {
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--admin-border-subtle);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: var(--admin-text);
    }

    .header-left h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        letter-spacing: -0.01em;
    }

    .close-btn {
        background: transparent;
        border: none;
        color: var(--admin-text-muted);
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
        transition: var(--admin-transition);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .close-btn:hover {
        background: var(--admin-bg-hover);
        color: var(--admin-text);
    }

    .modal-body {
        padding: 1.5rem;
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .loader-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 0;
        gap: 1rem;
        color: var(--admin-text-muted);
    }

    textarea {
        width: 100%;
        height: 300px;
        padding: 1rem;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
        font-size: 0.875rem;
        line-height: 1.5;
        border: 1px solid var(--admin-border);
        border-radius: var(--admin-radius);
        background: #fdfdfd;
        color: var(--admin-text);
        resize: none;
        transition: var(--admin-transition);
        outline: none;
    }

    textarea:focus {
        border-color: var(--admin-primary);
        box-shadow: 0 0 0 3px var(--admin-primary-subtle);
        background: #ffffff;
    }

    .help-text {
        margin: 0;
        font-size: 0.75rem;
        color: var(--admin-text-muted);
    }

    .error-msg {
        padding: 0.75rem 1rem;
        background: rgba(239, 68, 68, 0.05);
        color: var(--admin-danger);
        border: 1px solid rgba(239, 68, 68, 0.1);
        border-radius: var(--admin-radius-sm);
        font-size: 0.8125rem;
        font-weight: 500;
    }

    .modal-footer {
        padding: 1.25rem 1.5rem;
        border-top: 1px solid var(--admin-border-subtle);
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        background: #fcfcfc;
    }
</style>
