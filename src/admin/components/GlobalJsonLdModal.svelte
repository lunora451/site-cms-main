<script lang="ts">
    import { fade, scale } from "svelte/transition";
    import { actions } from "astro:actions";

    let {
        active = $bindable(false),
        onSaveSuccess = null
    } = $props();

    let jsonLdRaw = $state('');
    let jsonLdError = $state('');
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
                const globalJsonLd = seoConfig.global?.jsonLd || [];
                jsonLdRaw = globalJsonLd.length > 0 ? JSON.stringify(globalJsonLd, null, 2) : '';
                jsonLdError = '';
            }
        } catch (e) {
            error = 'Erreur réseau.';
        } finally {
            isLoading = false;
        }
    }

    function validateJsonLd() {
        if (!jsonLdRaw.trim()) {
            jsonLdError = '';
            return;
        }
        try {
            const parsed = JSON.parse(jsonLdRaw);
            if (!Array.isArray(parsed)) {
                jsonLdError = 'Le JSON-LD doit être un tableau [...]';
            } else {
                jsonLdError = '';
            }
        } catch {
            jsonLdError = 'JSON invalide. Vérifiez la syntaxe.';
        }
    }

    function insertPreset(type: string) {
        const presets: Record<string, any[]> = {
            'WebSite': [{ "@context": "https://schema.org", "@type": "WebSite", "name": "", "alternateName": [], "url": "/" }],
            'Organization': [{ "@context": "https://schema.org", "@type": "Organization", "name": "", "url": "/", "logo": "", "sameAs": [], "contactPoint": { "@type": "ContactPoint", "telephone": "", "contactType": "customer service" } }],
            'LocalBusiness': [{ "@context": "https://schema.org", "@type": "LocalBusiness", "name": "", "url": "/", "logo": "", "description": "", "telephone": "", "email": "", "address": { "@type": "PostalAddress", "streetAddress": "", "addressLocality": "", "postalCode": "", "addressCountry": "FR" }, "geo": { "@type": "GeoCoordinates", "latitude": "", "longitude": "" }, "priceRange": "$$" }],
        };
        
        // Append to existing if present
        if (jsonLdRaw.trim()) {
            try {
                const existing = JSON.parse(jsonLdRaw);
                if (Array.isArray(existing)) {
                    const combined = [...existing, ...(presets[type] || [])];
                    jsonLdRaw = JSON.stringify(combined, null, 2);
                    jsonLdError = '';
                    return;
                }
            } catch { /* fall through */ }
        }
        jsonLdRaw = JSON.stringify(presets[type] || [], null, 2);
        jsonLdError = '';
    }

    async function handleSave() {
        if (jsonLdRaw.trim()) {
            try {
                const parsed = JSON.parse(jsonLdRaw);
                if (!Array.isArray(parsed)) {
                    jsonLdError = 'Le JSON-LD doit être un tableau [...]';
                    return;
                }
            } catch {
                jsonLdError = 'JSON invalide.';
                return;
            }
        }

        isSaving = true;
        error = '';

        if (!seoConfig) seoConfig = { global: { og: {}, jsonLd: [] }, pages: {} };
        if (!seoConfig.global) seoConfig.global = { og: {}, jsonLd: [] };

        seoConfig.global.jsonLd = jsonLdRaw.trim() ? JSON.parse(jsonLdRaw) : [];

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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                    <h3>JSON-LD communs à toutes les pages</h3>
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
                        Ces schémas JSON-LD seront injectés dans le <code>&lt;head&gt;</code> de <strong>toutes les pages</strong> du site. Idéal pour Organization, WebSite, etc.
                    </p>

                    <div class="jsonld-presets">
                        <span class="preset-label">Ajouter un template :</span>
                        <button class="admin-btn admin-btn-sm" type="button" onclick={() => insertPreset('WebSite')}>WebSite</button>
                        <button class="admin-btn admin-btn-sm" type="button" onclick={() => insertPreset('Organization')}>Organization</button>
                        <button class="admin-btn admin-btn-sm" type="button" onclick={() => insertPreset('LocalBusiness')}>LocalBusiness</button>
                    </div>

                    <div class="admin-form-group">
                        <label for="global-jsonld">
                            JSON-LD Global
                            {#if jsonLdError}
                                <span class="jsonld-error-badge">Erreur</span>
                            {:else if jsonLdRaw.trim()}
                                <span class="jsonld-valid-badge">Valide</span>
                            {/if}
                        </label>
                        <textarea 
                            id="global-jsonld"
                            class="jsonld-textarea {jsonLdError ? 'has-error' : ''}" 
                            bind:value={jsonLdRaw}
                            oninput={validateJsonLd}
                            placeholder={`[
  {
    "@context": "https://schema.org",
    "@type": "Organization"
  }
]`}
                            rows="16"
                        ></textarea>
                        {#if jsonLdError}
                            <p class="error-text">{jsonLdError}</p>
                        {/if}
                        <p class="help-text">Format : tableau JSON (<code>[{'{'}...{'}'}]</code>). Ces données structurées aident les moteurs de recherche à comprendre votre site.</p>
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
        max-width: 700px;
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

    .modal-description code {
        font-size: 0.8rem;
        background: var(--admin-bg-hover);
        padding: 0.1rem 0.3rem;
        border-radius: 2px;
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

    .jsonld-presets {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .preset-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--admin-text-muted);
    }

    .jsonld-textarea {
        width: 100%;
        padding: 1rem;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
        font-size: 0.8125rem;
        line-height: 1.6;
        border: 1px solid var(--admin-border);
        border-radius: var(--admin-radius);
        background: #fdfdfd;
        color: var(--admin-text);
        resize: vertical;
        min-height: 250px;
        transition: var(--admin-transition);
        outline: none;
        tab-size: 2;
    }

    .jsonld-textarea:focus {
        border-color: var(--admin-primary);
        box-shadow: 0 0 0 3px var(--admin-primary-subtle);
        background: #ffffff;
    }

    .jsonld-textarea.has-error {
        border-color: var(--admin-danger);
    }

    .jsonld-textarea.has-error:focus {
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    .jsonld-error-badge, .jsonld-valid-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.65rem;
        padding: 0.15rem 0.4rem;
        border-radius: 3px;
        font-weight: 700;
        text-transform: uppercase;
    }

    .jsonld-error-badge {
        background: rgba(239, 68, 68, 0.08);
        color: var(--admin-danger);
    }

    .jsonld-valid-badge {
        background: rgba(16, 185, 129, 0.08);
        color: var(--admin-success);
    }

    .error-text {
        margin: 0;
        font-size: 0.75rem;
        color: var(--admin-danger);
        font-weight: 500;
    }

    .help-text {
        margin: 0;
        font-size: 0.75rem;
        color: var(--admin-text-muted);
    }

    .help-text code {
        font-size: 0.7rem;
        background: var(--admin-bg-hover);
        padding: 0.1rem 0.3rem;
        border-radius: 2px;
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
