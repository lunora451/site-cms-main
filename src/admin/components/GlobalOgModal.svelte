<script lang="ts">
    import { fade, scale } from "svelte/transition";
    import { actions } from "astro:actions";

    let {
        active = $bindable(false),
        onSaveSuccess = null
    } = $props();

    // Form state
    let siteName = $state('');
    let defaultImage = $state('');
    let defaultImageAlt = $state('');
    let locale = $state('fr_FR');
    let type = $state('website');
    
    let sha = $state('');
    let seoConfig: any = $state(null);
    let isLoading = $state(false);
    let isSaving = $state(false);
    let error = $state('');

    $effect(() => {
        if (active) {
            loadConfig();
        }
    });

    async function loadConfig() {
        isLoading = true;
        error = '';
        try {
            const { data, error: actionError } = await actions.admin.getSeoConfig();
            if (actionError) {
                error = 'Impossible de charger la configuration.';
            } else if (data) {
                seoConfig = JSON.parse(data.content);
                sha = data.sha;
                const og = seoConfig.global?.og || {};
                siteName = og.siteName || '';
                defaultImage = og.defaultImage || '';
                defaultImageAlt = og.defaultImageAlt || '';
                locale = og.locale || 'fr_FR';
                type = og.type || 'website';
            }
        } catch (e) {
            error = 'Erreur réseau.';
        } finally {
            isLoading = false;
        }
    }

    async function handleSave() {
        isSaving = true;
        error = '';

        if (!seoConfig) seoConfig = { global: { og: {}, jsonLd: [] }, pages: {} };
        if (!seoConfig.global) seoConfig.global = { og: {}, jsonLd: [] };
        
        seoConfig.global.og = {
            siteName,
            defaultImage,
            defaultImageAlt,
            locale,
            type
        };

        try {
            const { data, error: actionError } = await actions.admin.saveSeoConfig({
                content: JSON.stringify(seoConfig, null, 2),
                sha
            });
            if (actionError) {
                error = 'Erreur lors de la sauvegarde.';
            } else {
                active = false;
                onSaveSuccess?.();
            }
        } catch (e) {
            error = 'Erreur réseau.';
        } finally {
            isSaving = false;
        }
    }

    function close() {
        if (isSaving) return;
        active = false;
        error = '';
    }
</script>

{#if active}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-overlay" role="button" tabindex="-1" onclick={close} transition:fade={{ duration: 200 }}>
        <div class="modal-content" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} transition:scale={{ duration: 300, start: 0.95, opacity: 0 }}>
            <div class="modal-header">
                <div class="header-left">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                    <h3>Open Graph par défaut</h3>
                </div>
                <button class="close-btn" onclick={close} aria-label="Fermer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>

            <div class="modal-body">
                {#if isLoading}
                    <div class="loader-container">
                        <div class="admin-spinner"></div>
                        <p>Chargement...</p>
                    </div>
                {:else}
                    {#if error}
                        <div class="error-msg">{error}</div>
                    {/if}
                    <p class="modal-description">
                        Ces valeurs seront utilisées comme fallback pour toutes les pages qui n'ont pas d'Open Graph spécifique.
                    </p>

                    <div class="admin-form-group">
                        <label for="og-site-name">og:site_name</label>
                        <input type="text" id="og-site-name" class="admin-input" bind:value={siteName} placeholder="Nom du site..." />
                    </div>

                    <div class="form-row">
                        <div class="admin-form-group">
                            <label for="og-default-image">Image par défaut (URL)</label>
                            <input type="text" id="og-default-image" class="admin-input" bind:value={defaultImage} placeholder="https://votresite.fr/og-image.jpg" />
                        </div>
                        <div class="admin-form-group">
                            <label for="og-default-alt">Image alt</label>
                            <input type="text" id="og-default-alt" class="admin-input" bind:value={defaultImageAlt} placeholder="Description de l'image..." />
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="admin-form-group">
                            <label for="og-locale">Locale</label>
                            <select id="og-locale" class="admin-input" bind:value={locale}>
                                <option value="fr_FR">fr_FR</option>
                                <option value="en_US">en_US</option>
                                <option value="en_GB">en_GB</option>
                                <option value="de_DE">de_DE</option>
                                <option value="es_ES">es_ES</option>
                            </select>
                        </div>
                        <div class="admin-form-group">
                            <label for="og-default-type">Type par défaut</label>
                            <select id="og-default-type" class="admin-input" bind:value={type}>
                                <option value="website">website</option>
                                <option value="article">article</option>
                            </select>
                        </div>
                    </div>
                {/if}
            </div>

            <div class="modal-footer">
                <button class="admin-btn" onclick={close} disabled={isSaving}>Annuler</button>
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
        gap: 1.25rem;
    }

    .modal-description {
        font-size: 0.875rem;
        color: var(--admin-text-secondary);
        margin: 0;
        line-height: 1.5;
    }

    .loader-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 3rem 0;
        gap: 1rem;
        color: var(--admin-text-muted);
    }

    .error-msg {
        padding: 0.75rem 1rem;
        background: rgba(239, 68, 68, 0.05);
        color: var(--admin-danger);
        border: 1px solid rgba(239, 68, 68, 0.1);
        border-radius: var(--admin-radius-sm);
        font-size: 0.8125rem;
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    @media (max-width: 500px) {
        .form-row {
            grid-template-columns: 1fr;
        }
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
