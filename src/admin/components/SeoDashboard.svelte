<script lang="ts">
    import RobotsModal from "./RobotsModal.svelte";
    import GlobalOgModal from "./GlobalOgModal.svelte";
    import GlobalJsonLdModal from "./GlobalJsonLdModal.svelte";

    let isRobotsModalOpen = $state(false);
    let isGlobalOgModalOpen = $state(false);
    let isGlobalJsonLdModalOpen = $state(false);

    const seoTiles = [
        {
            id: 'robots',
            title: 'modify Robots.txt',
            icon: 'M22 10v6M2 10l10-8 10 8c0 0-4.5 3.5-10 3.5S2 10 2 10zM12 18l-1.5-1.5M12 18l1.5-1.5M12 18v-4.5',
            description: 'Gérer les accès des robots d\'exploration.',
            color: '#ff9a9e',
            action: () => { isRobotsModalOpen = true; }
        },
        {
            id: 'global-og',
            title: 'OG par défaut',
            icon: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
            description: 'Valeurs Open Graph de fallback pour toutes les pages.',
            color: '#c3aed6',
            action: () => { isGlobalOgModalOpen = true; }
        },
        {
            id: 'global-jsonld',
            title: 'JSON-LD Communs',
            icon: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
            description: 'Schémas de données structurées appliqués à toutes les pages.',
            color: '#a8e6cf',
            action: () => { isGlobalJsonLdModalOpen = true; }
        },
        {
            id: 'analytics',
            title: 'Analytics & Tracking',
            icon: 'M18 20V10M12 20V4M6 20v-6',
            description: 'Gérer vos IDs Google Analytics et tracking.',
            color: '#f6d365',
            status: 'Prochainement'
        }
    ];

    function handleSaveSuccess(msg: string) {
        if (window.showToast) {
            window.showToast(msg, "success");
        }
    }
</script>

<div class="seo-dashboard">
    <header class="seo-header">
        <div class="header-content">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="title-icon">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <div class="header-text">
                <h1>Optimisation SEO</h1>
                <p>Améliorez la visibilité de votre site sur les moteurs de recherche.</p>
            </div>
        </div>
    </header>

    <div class="tiles-grid">
        {#each seoTiles as tile}
            <button 
                class="seo-tile" 
                onclick={tile.action}
                disabled={!!tile.status}
                style="--tile-color: {tile.color}"
            >
                <div class="tile-icon-wrapper">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d={tile.icon}></path>
                    </svg>
                </div>
                
                <div class="tile-content">
                    <div class="tile-title-row">
                        <h3>{tile.title}</h3>
                        {#if tile.status}
                            <span class="status-badge">{tile.status}</span>
                        {/if}
                    </div>
                    <p>{tile.description}</p>
                </div>

                <div class="tile-arrow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"></path>
                    </svg>
                </div>
            </button>
        {/each}
    </div>

    <RobotsModal bind:active={isRobotsModalOpen} onSaveSuccess={() => handleSaveSuccess("Le fichier robots.txt a été mis à jour avec succès !")} />
    <GlobalOgModal bind:active={isGlobalOgModalOpen} onSaveSuccess={() => handleSaveSuccess("Les valeurs Open Graph par défaut ont été sauvegardées !")} />
    <GlobalJsonLdModal bind:active={isGlobalJsonLdModalOpen} onSaveSuccess={() => handleSaveSuccess("Les JSON-LD communs ont été sauvegardés !")} />
</div>

<style>
    .seo-dashboard {
        animation: fade-in 0.4s ease-out;
    }

    @keyframes fade-in {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .seo-header {
        margin-bottom: 3rem;
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

    .tiles-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.5rem;
    }

    .seo-tile {
        position: relative;
        display: flex;
        flex-direction: column;
        padding: 2rem;
        background: #ffffff;
        border: 1px solid var(--admin-border);
        border-radius: var(--admin-radius-lg);
        text-align: left;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        overflow: hidden;
        outline: none;
    }

    .seo-tile::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--tile-color);
        opacity: 0.6;
        transition: opacity 0.25s ease;
    }

    .seo-tile:hover {
        transform: translateY(-4px);
        border-color: var(--admin-primary);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.04), 0 4px 8px rgba(0, 0, 0, 0.02);
    }

    .seo-tile:hover::before {
        opacity: 1;
    }

    .seo-tile:disabled {
        cursor: default;
        opacity: 0.7;
        background: #fafafa;
    }

    .seo-tile:disabled:hover {
        transform: none;
        border-color: var(--admin-border);
        box-shadow: none;
    }

    .tile-icon-wrapper {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--admin-bg-hover);
        border-radius: 12px;
        color: var(--admin-text);
        margin-bottom: 1.5rem;
        transition: all 0.25s ease;
    }

    .seo-tile:hover .tile-icon-wrapper {
        background: var(--admin-primary-subtle);
        color: var(--admin-primary);
        transform: scale(1.1);
    }

    .tile-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.5rem;
    }

    .tile-title-row h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--admin-text);
    }

    .status-badge {
        font-size: 0.65rem;
        font-weight: 700;
        text-transform: uppercase;
        padding: 0.25rem 0.5rem;
        background: var(--admin-bg-hover);
        color: var(--admin-text-muted);
        border-radius: 4px;
        letter-spacing: 0.05em;
    }

    .tile-content p {
        margin: 0;
        font-size: 0.875rem;
        color: var(--admin-text-secondary);
        line-height: 1.5;
    }

    .tile-arrow {
        position: absolute;
        bottom: 2rem;
        right: 2rem;
        color: var(--admin-text-muted);
        opacity: 0;
        transform: translateX(-10px);
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .seo-tile:hover .tile-arrow {
        opacity: 1;
        transform: translateX(0);
        color: var(--admin-primary);
    }

    @media (max-width: 640px) {
        .tiles-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
