<script lang="ts">
    import { fade, slide } from 'svelte/transition';
    import { actions } from 'astro:actions';

    let { activePage = null } = $props();

    // SEO Config state
    let seoConfig: any = $state(null);
    let sha = $state('');
    let isLoading = $state(true);
    let isSaving = $state(false);
    let error = $state('');
    let saveSuccess = $state(false);

    // Per-page data (bound to form)
    let metaTitle = $state('');
    let metaDescription = $state('');
    let ogTitle = $state('');
    let ogDescription = $state('');
    let ogImage = $state('');
    let ogImageAlt = $state('');
    let ogType = $state('website');
    let jsonLdRaw = $state('');
    let jsonLdError = $state('');

    // Accordion state
    let openSection = $state('meta');

    // Pages list
    const sitePages = [
        { path: '/', label: 'Accueil' },
        { path: '/a-propos', label: 'À propos' },
        { path: '/contact', label: 'Contact' },
        { path: '/ateliers', label: 'Ateliers' },
        { path: '/atelier', label: 'Atelier (détail)' },
        { path: '/mentions-legales', label: 'Mentions légales' },
        { path: '/politique-de-confidentialite', label: 'Politique de confidentialité' },
    ];

    // Character limits
    const META_TITLE_RECOMMENDED = 60;
    const META_DESC_RECOMMENDED = 160;

    function getCharCountColor(len: number, max: number): string {
        if (len === 0) return 'var(--admin-text-muted)';
        if (len <= max * 0.8) return 'var(--admin-success)';
        if (len <= max) return 'var(--admin-warning)';
        return 'var(--admin-danger)';
    }

    // Load SEO config
    async function loadConfig() {
        isLoading = true;
        error = '';
        try {
            const { data, error: actionError } = await actions.admin.getSeoConfig();
            if (actionError) {
                error = 'Impossible de charger la configuration SEO.';
                console.error(actionError);
            } else if (data) {
                seoConfig = JSON.parse(data.content);
                sha = data.sha;
                if (activePage) {
                    loadPageData(activePage);
                }
            }
        } catch (e) {
            error = 'Erreur réseau lors du chargement.';
        } finally {
            isLoading = false;
        }
    }

    function loadPageData(pagePath: string) {
        if (!seoConfig) return;
        const pageData = seoConfig.pages?.[pagePath] || {};
        metaTitle = pageData.metaTitle || '';
        metaDescription = pageData.metaDescription || '';
        ogTitle = pageData.og?.title || '';
        ogDescription = pageData.og?.description || '';
        ogImage = pageData.og?.image || '';
        ogImageAlt = pageData.og?.imageAlt || '';
        ogType = pageData.og?.type || 'website';
        
        if (pageData.jsonLd && pageData.jsonLd.length > 0) {
            jsonLdRaw = JSON.stringify(pageData.jsonLd, null, 2);
        } else {
            jsonLdRaw = '';
        }
        jsonLdError = '';
    }

    // Save config
    async function handleSave() {
        if (!seoConfig || !activePage) return;

        // Validate JSON-LD if present
        if (jsonLdRaw.trim()) {
            try {
                const parsed = JSON.parse(jsonLdRaw);
                if (!Array.isArray(parsed)) {
                    jsonLdError = 'Le JSON-LD doit être un tableau [...]';
                    return;
                }
                jsonLdError = '';
            } catch {
                jsonLdError = 'JSON invalide. Vérifiez la syntaxe.';
                return;
            }
        }

        isSaving = true;
        error = '';
        saveSuccess = false;

        // Build page data
        const pageData: any = {};
        if (metaTitle) pageData.metaTitle = metaTitle;
        if (metaDescription) pageData.metaDescription = metaDescription;
        
        const og: any = {};
        if (ogTitle) og.title = ogTitle;
        if (ogDescription) og.description = ogDescription;
        if (ogImage) og.image = ogImage;
        if (ogImageAlt) og.imageAlt = ogImageAlt;
        if (ogType) og.type = ogType;
        if (Object.keys(og).length > 0) pageData.og = og;

        if (jsonLdRaw.trim()) {
            try {
                pageData.jsonLd = JSON.parse(jsonLdRaw);
            } catch { /* already validated */ }
        }

        // Update config
        if (!seoConfig.pages) seoConfig.pages = {};
        if (Object.keys(pageData).length > 0) {
            seoConfig.pages[activePage] = pageData;
        } else {
            delete seoConfig.pages[activePage];
        }

        try {
            const { data, error: actionError } = await actions.admin.saveSeoConfig({
                content: JSON.stringify(seoConfig, null, 2),
                sha
            });
            if (actionError) {
                error = 'Erreur lors de la sauvegarde : ' + (actionError.message || 'Inconnue');
            } else {
                saveSuccess = true;
                // Reload to get new SHA
                const reload = await actions.admin.getSeoConfig();
                if (reload.data) {
                    sha = reload.data.sha;
                }
                if (window.showToast) {
                    window.showToast('Configuration SEO sauvegardée !', 'success');
                }
                setTimeout(() => { saveSuccess = false; }, 3000);
            }
        } catch (e) {
            error = 'Erreur réseau lors de la sauvegarde.';
        } finally {
            isSaving = false;
        }
    }

    // Check if page has SEO config
    function hasConfig(pagePath: string): { meta: boolean; og: boolean; jsonLd: boolean } {
        if (!seoConfig?.pages?.[pagePath]) return { meta: false, og: false, jsonLd: false };
        const p = seoConfig.pages[pagePath];
        return {
            meta: !!(p.metaTitle || p.metaDescription),
            og: !!(p.og && Object.keys(p.og).length > 0),
            jsonLd: !!(p.jsonLd && p.jsonLd.length > 0)
        };
    }

    function toggleSection(section: string) {
        openSection = openSection === section ? '' : section;
    }

    // Validate JSON-LD in real-time
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

    // JSON-LD presets
    function insertJsonLdPreset(type: string) {
        const presets: Record<string, any> = {
            'Article': [{ "@context": "https://schema.org", "@type": "Article", "headline": "", "description": "", "author": { "@type": "Person", "name": "" }, "datePublished": "", "image": "" }],
            'FAQ': [{ "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{ "@type": "Question", "name": "Question ?", "acceptedAnswer": { "@type": "Answer", "text": "Réponse." } }] }],
            'BreadcrumbList': [{ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Accueil", "item": "/" }] }],
            'Service': [{ "@context": "https://schema.org", "@type": "Service", "name": "", "description": "", "provider": { "@type": "LocalBusiness", "name": "" }, "areaServed": "" }],
        };
        jsonLdRaw = JSON.stringify(presets[type] || [], null, 2);
        jsonLdError = '';
    }

    // Init load
    $effect(() => {
        loadConfig();
    });

    // Reload page data when activePage changes
    $effect(() => {
        if (activePage && seoConfig) {
            loadPageData(activePage);
            openSection = 'meta';
        }
    });
</script>

<div class="page-seo-editor" transition:fade={{ duration: 200 }}>
    {#if isLoading}
        <div class="loader-container">
            <div class="admin-spinner"></div>
            <p>Chargement de la configuration SEO...</p>
        </div>
    {:else if !activePage}
        <!-- Pages List View -->
        <header class="seo-header">
            <div class="header-content">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="title-icon">
                    <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M3 15h6"></path>
                    <path d="M6 12v6"></path>
                </svg>
                <div class="header-text">
                    <h1>Pages du site</h1>
                    <p>Gérez le SEO de chaque page : meta, Open Graph et JSON-LD.</p>
                </div>
            </div>
        </header>

        <div class="pages-table-wrapper">
            <table class="admin-table pages-table">
                <thead>
                    <tr>
                        <th>Page</th>
                        <th>Route</th>
                        <th style="text-align: center;">Meta</th>
                        <th style="text-align: center;">OG</th>
                        <th style="text-align: center;">JSON-LD</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {#each sitePages as page}
                        {@const status = hasConfig(page.path)}
                        <tr>
                            <td class="page-name">{page.label}</td>
                            <td class="page-route"><code>{page.path}</code></td>
                            <td style="text-align: center;">
                                <span class="status-dot {status.meta ? 'active' : 'inactive'}" title={status.meta ? 'Configuré' : 'Non configuré'}></span>
                            </td>
                            <td style="text-align: center;">
                                <span class="status-dot {status.og ? 'active' : 'inactive'}" title={status.og ? 'Configuré' : 'Non configuré'}></span>
                            </td>
                            <td style="text-align: center;">
                                <span class="status-dot {status.jsonLd ? 'active' : 'inactive'}" title={status.jsonLd ? 'Configuré' : 'Non configuré'}></span>
                            </td>
                            <td>
                                <a href="/?view=pages&page={encodeURIComponent(page.path)}" class="admin-btn admin-btn-sm">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    Éditer
                                </a>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {:else}
        <!-- Single Page Editor -->
        <header class="seo-header">
            <div class="header-content">
                <a href="/?view=pages" class="back-btn" title="Retour aux pages">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"></path></svg>
                </a>
                <div class="header-text">
                    <h1>{sitePages.find(p => p.path === activePage)?.label || activePage}</h1>
                    <p><code>{activePage}</code> — Configuration SEO de la page</p>
                </div>
            </div>
            <button 
                class="admin-btn admin-btn-primary" 
                onclick={handleSave}
                disabled={isSaving}
            >
                {#if isSaving}
                    <div class="admin-spinner admin-spinner-sm"></div>
                    Sauvegarde...
                {:else}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    Sauvegarder
                {/if}
            </button>
        </header>

        {#if error}
            <div class="error-msg" transition:slide={{ duration: 200 }}>{error}</div>
        {/if}

        <div class="editor-sections">
            <!-- Section 1: Meta Title & Description -->
            <div class="editor-section {openSection === 'meta' ? 'is-open' : ''}">
                <button class="section-header" type="button" onclick={() => toggleSection('meta')}>
                    <div class="section-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                        <span>Meta Title & Description</span>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon"><path d="m6 9 6 6 6-6"></path></svg>
                </button>

                {#if openSection === 'meta'}
                    <div class="section-body" transition:slide={{ duration: 300 }}>
                        <div class="form-group">
                            <label for="meta-title">
                                Meta Title
                                <span class="char-counter" style="color: {getCharCountColor(metaTitle.length, META_TITLE_RECOMMENDED)}">
                                    {metaTitle.length}/{META_TITLE_RECOMMENDED}
                                </span>
                            </label>
                            <input 
                                type="text" 
                                id="meta-title"
                                class="admin-input" 
                                bind:value={metaTitle}
                                placeholder="Titre affiché dans les résultats Google..."
                            />
                            <div class="char-bar">
                                <div class="char-bar-fill" style="width: {Math.min(100, (metaTitle.length / META_TITLE_RECOMMENDED) * 100)}%; background: {getCharCountColor(metaTitle.length, META_TITLE_RECOMMENDED)}"></div>
                            </div>
                            <p class="help-text">Recommandé : 50-60 caractères pour un affichage optimal dans Google.</p>
                        </div>

                        <div class="form-group">
                            <label for="meta-desc">
                                Meta Description
                                <span class="char-counter" style="color: {getCharCountColor(metaDescription.length, META_DESC_RECOMMENDED)}">
                                    {metaDescription.length}/{META_DESC_RECOMMENDED}
                                </span>
                            </label>
                            <textarea 
                                id="meta-desc"
                                class="admin-textarea" 
                                bind:value={metaDescription}
                                placeholder="Description affichée sous le titre dans les résultats de recherche..."
                                rows="3"
                            ></textarea>
                            <div class="char-bar">
                                <div class="char-bar-fill" style="width: {Math.min(100, (metaDescription.length / META_DESC_RECOMMENDED) * 100)}%; background: {getCharCountColor(metaDescription.length, META_DESC_RECOMMENDED)}"></div>
                            </div>
                            <p class="help-text">Recommandé : 150-160 caractères. Soyez descriptif et incitatif.</p>
                        </div>

                        <!-- Google Preview -->
                        <div class="google-preview">
                            <p class="preview-label">Aperçu Google</p>
                            <div class="preview-card">
                                <div class="preview-url">votresite.fr{activePage === '/' ? '' : activePage}</div>
                                <div class="preview-title">{metaTitle || 'Titre de la page'}</div>
                                <div class="preview-desc">{metaDescription || 'La description de votre page apparaîtra ici dans les résultats de recherche Google.'}</div>
                            </div>
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Section 2: Open Graph -->
            <div class="editor-section {openSection === 'og' ? 'is-open' : ''}">
                <button class="section-header" type="button" onclick={() => toggleSection('og')}>
                    <div class="section-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                        <span>Open Graph (Réseaux sociaux)</span>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon"><path d="m6 9 6 6 6-6"></path></svg>
                </button>

                {#if openSection === 'og'}
                    <div class="section-body" transition:slide={{ duration: 300 }}>
                        <p class="section-note">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                            Les valeurs vides utiliseront les OG par défaut (configurables dans la vue SEO).
                        </p>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="og-title">og:title</label>
                                <input type="text" id="og-title" class="admin-input" bind:value={ogTitle} placeholder="Titre pour les réseaux sociaux..." />
                            </div>
                            <div class="form-group">
                                <label for="og-type">og:type</label>
                                <select id="og-type" class="admin-input" bind:value={ogType}>
                                    <option value="website">website</option>
                                    <option value="article">article</option>
                                    <option value="profile">profile</option>
                                    <option value="product">product</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="og-desc">og:description</label>
                            <textarea id="og-desc" class="admin-textarea" bind:value={ogDescription} placeholder="Description pour les réseaux sociaux..." rows="2"></textarea>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="og-image">og:image (URL)</label>
                                <input type="text" id="og-image" class="admin-input" bind:value={ogImage} placeholder="https://votresite.fr/image.jpg" />
                            </div>
                            <div class="form-group">
                                <label for="og-image-alt">og:image:alt</label>
                                <input type="text" id="og-image-alt" class="admin-input" bind:value={ogImageAlt} placeholder="Description de l'image..." />
                            </div>
                        </div>

                        <!-- OG Preview Card -->
                        <div class="og-preview">
                            <p class="preview-label">Aperçu partage social</p>
                            <div class="og-preview-card">
                                {#if ogImage}
                                    <div class="og-preview-image" style="background-image: url({ogImage})"></div>
                                {:else}
                                    <div class="og-preview-image og-preview-placeholder">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                    </div>
                                {/if}
                                <div class="og-preview-body">
                                    <div class="og-preview-domain">votresite.fr</div>
                                    <div class="og-preview-title">{ogTitle || metaTitle || 'Titre de la page'}</div>
                                    <div class="og-preview-desc">{ogDescription || metaDescription || 'Description de la page'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Section 3: JSON-LD -->
            <div class="editor-section {openSection === 'jsonld' ? 'is-open' : ''}">
                <button class="section-header" type="button" onclick={() => toggleSection('jsonld')}>
                    <div class="section-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                        <span>JSON-LD (Données structurées)</span>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon"><path d="m6 9 6 6 6-6"></path></svg>
                </button>

                {#if openSection === 'jsonld'}
                    <div class="section-body" transition:slide={{ duration: 300 }}>
                        <div class="jsonld-presets">
                            <span class="preset-label">Templates :</span>
                            <button class="admin-btn admin-btn-sm" type="button" onclick={() => insertJsonLdPreset('Article')}>Article</button>
                            <button class="admin-btn admin-btn-sm" type="button" onclick={() => insertJsonLdPreset('FAQ')}>FAQ</button>
                            <button class="admin-btn admin-btn-sm" type="button" onclick={() => insertJsonLdPreset('BreadcrumbList')}>Breadcrumb</button>
                            <button class="admin-btn admin-btn-sm" type="button" onclick={() => insertJsonLdPreset('Service')}>Service</button>
                        </div>

                        <div class="form-group">
                            <label for="jsonld-editor">
                                Contenu JSON-LD
                                {#if jsonLdError}
                                    <span class="jsonld-error-badge">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                                        Erreur
                                    </span>
                                {:else if jsonLdRaw.trim()}
                                    <span class="jsonld-valid-badge">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                        Valide
                                    </span>
                                {/if}
                            </label>
                            <textarea 
                                id="jsonld-editor"
                                class="admin-textarea jsonld-textarea {jsonLdError ? 'has-error' : ''}" 
                                bind:value={jsonLdRaw}
                                oninput={validateJsonLd}
                                placeholder={`[
  {
    "@context": "https://schema.org",
    "@type": "...",
    ...
  }
]`}
                                rows="12"
                            ></textarea>
                            {#if jsonLdError}
                                <p class="error-text">{jsonLdError}</p>
                            {/if}
                            <p class="help-text">Le JSON-LD doit être un tableau d'objets (ex: <code>[{'{'}...{'}'}]</code>). Ce schéma est spécifique à cette page.</p>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    .page-seo-editor {
        animation: fade-in 0.4s ease-out;
    }

    @keyframes fade-in {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    /* Header */
    .seo-header {
        margin-bottom: 2rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }

    .header-content {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .title-icon {
        color: var(--admin-primary);
        opacity: 0.8;
    }

    .header-text h1 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: var(--admin-text);
    }

    .header-text p {
        margin: 0.25rem 0 0;
        color: var(--admin-text-secondary);
        font-size: 0.875rem;
    }

    .header-text code {
        font-size: 0.8rem;
        background: var(--admin-bg-hover);
        padding: 0.125rem 0.375rem;
        border-radius: 3px;
        color: var(--admin-text);
    }

    .back-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: var(--admin-radius-sm);
        color: var(--admin-text-secondary);
        transition: var(--admin-transition);
        text-decoration: none;
    }

    .back-btn:hover {
        background: var(--admin-bg-hover);
        color: var(--admin-text);
    }

    /* Loader */
    .loader-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 6rem 0;
        gap: 1rem;
        color: var(--admin-text-muted);
    }

    /* Error */
    .error-msg {
        padding: 0.75rem 1rem;
        background: rgba(239, 68, 68, 0.05);
        color: var(--admin-danger);
        border: 1px solid rgba(239, 68, 68, 0.1);
        border-radius: var(--admin-radius-sm);
        font-size: 0.8125rem;
        font-weight: 500;
        margin-bottom: 1.5rem;
    }

    /* Pages Table */
    .pages-table-wrapper {
        background: #ffffff;
        border: 1px solid var(--admin-border);
        border-radius: var(--admin-radius-lg);
        overflow: hidden;
    }

    .pages-table {
        margin: 0;
    }

    .page-name {
        font-weight: 600;
        color: var(--admin-text);
    }

    .page-route code {
        font-size: 0.8rem;
        background: var(--admin-bg-hover);
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        color: var(--admin-text-secondary);
    }

    .status-dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        transition: var(--admin-transition);
    }

    .status-dot.active {
        background: var(--admin-success);
        box-shadow: 0 0 6px rgba(16, 185, 129, 0.3);
    }

    .status-dot.inactive {
        background: var(--admin-border);
    }

    /* Editor Sections (Accordion) */
    .editor-sections {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .editor-section {
        background: #ffffff;
        border: 1px solid var(--admin-border);
        border-radius: var(--admin-radius-lg);
        overflow: hidden;
        transition: var(--admin-transition);
    }

    .editor-section.is-open {
        border-color: var(--admin-primary);
        box-shadow: 0 0 0 3px var(--admin-primary-subtle);
    }

    .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 1.25rem 1.5rem;
        background: transparent;
        border: none;
        cursor: pointer;
        transition: var(--admin-transition);
        outline: none;
    }

    .section-header:hover {
        background: var(--admin-bg-hover);
    }

    .section-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 1rem;
        font-weight: 600;
        color: var(--admin-text);
    }

    .section-title svg {
        opacity: 0.6;
    }

    .chevron-icon {
        color: var(--admin-text-muted);
        transition: transform 0.3s ease;
    }

    .editor-section.is-open .chevron-icon {
        transform: rotate(180deg);
    }

    .section-body {
        padding: 0 1.5rem 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    .section-note {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8125rem;
        color: var(--admin-text-muted);
        padding: 0.75rem 1rem;
        background: var(--admin-primary-subtle);
        border-radius: var(--admin-radius-sm);
        margin: 0;
    }

    /* Forms */
    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .form-group label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--admin-text-secondary);
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    @media (max-width: 600px) {
        .form-row {
            grid-template-columns: 1fr;
        }

        .seo-header {
            flex-direction: column;
            align-items: flex-start;
        }
    }

    .char-counter {
        font-weight: 600;
        font-size: 0.7rem;
        font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
        transition: color 0.2s ease;
    }

    .char-bar {
        height: 3px;
        background: var(--admin-border-subtle);
        border-radius: 2px;
        overflow: hidden;
    }

    .char-bar-fill {
        height: 100%;
        border-radius: 2px;
        transition: all 0.3s ease;
    }

    .help-text {
        margin: 0;
        font-size: 0.75rem;
        color: var(--admin-text-muted);
        line-height: 1.4;
    }

    .help-text code {
        font-size: 0.7rem;
        background: var(--admin-bg-hover);
        padding: 0.1rem 0.3rem;
        border-radius: 2px;
    }

    .error-text {
        margin: 0;
        font-size: 0.75rem;
        color: var(--admin-danger);
        font-weight: 500;
    }

    /* Google Preview */
    .google-preview, .og-preview {
        margin-top: 0.5rem;
    }

    .preview-label {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--admin-text-muted);
        margin: 0 0 0.75rem;
    }

    .preview-card {
        padding: 1rem 1.25rem;
        background: #fdfdfd;
        border: 1px solid var(--admin-border-subtle);
        border-radius: var(--admin-radius);
    }

    .preview-url {
        font-size: 0.75rem;
        color: #202124;
        margin-bottom: 0.2rem;
    }

    .preview-title {
        font-size: 1.125rem;
        color: #1a0dab;
        font-weight: 400;
        margin-bottom: 0.25rem;
        line-height: 1.3;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .preview-desc {
        font-size: 0.8125rem;
        color: #545454;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    /* OG Preview Card */
    .og-preview-card {
        border: 1px solid var(--admin-border);
        border-radius: var(--admin-radius);
        overflow: hidden;
        background: #ffffff;
    }

    .og-preview-image {
        height: 160px;
        background-size: cover;
        background-position: center;
        background-color: var(--admin-bg-hover);
    }

    .og-preview-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--admin-text-muted);
    }

    .og-preview-body {
        padding: 0.875rem 1rem;
        border-top: 1px solid var(--admin-border-subtle);
    }

    .og-preview-domain {
        font-size: 0.7rem;
        color: var(--admin-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.03em;
        margin-bottom: 0.25rem;
    }

    .og-preview-title {
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--admin-text);
        margin-bottom: 0.25rem;
        line-height: 1.3;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .og-preview-desc {
        font-size: 0.8125rem;
        color: var(--admin-text-secondary);
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    /* JSON-LD */
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
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
        font-size: 0.8125rem;
        line-height: 1.6;
        resize: vertical;
        min-height: 200px;
        tab-size: 2;
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
</style>
