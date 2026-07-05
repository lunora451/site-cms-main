<script>
    import { onMount } from "svelte";
    import PublishToggle from "./PublishToggle.svelte";
    import DeleteArticleButton from "./DeleteArticleButton.svelte";

    let { 
        collectionName, 
        files = [], 
        description = "",
        showPublished = true
    } = $props();

    let searchQuery = $state("");
    let activeDropdown = $state(null);

    let filteredFiles = $derived(
        files.filter((file) =>
            file.title.toLowerCase().includes(searchQuery.toLowerCase()),
        )
    );

    function clearSearch() {
        searchQuery = "";
    }

    function toggleDropdown(id, e) {
        e.stopPropagation();
        activeDropdown = activeDropdown === id ? null : id;
    }

    onMount(() => {
        const handleClickOutside = () => {
            activeDropdown = null;
        };
        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    });
</script>

<div class="admin-card">
    <div class="admin-card-header">
        <div class="admin-collection-info">
            <h2 style="text-transform: capitalize;">{collectionName}</h2>
            {#if description}
                <p class="admin-description">
                    {description}
                </p>
            {/if}
        </div>

        <div class="admin-actions-row">
            <div class="search-container">
                <span class="search-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </span>
                <input
                    type="text"
                    placeholder="Rechercher par titre..."
                    bind:value={searchQuery}
                    class="admin-input-search"
                />
                {#if searchQuery}
                    <button class="clear-search" onclick={clearSearch} aria-label="Effacer la recherche">✕</button>
                {/if}
            </div>

            <div class="admin-flex action-group" style="gap: 1.5rem;">
                <span class="admin-badge admin-badge-primary">
                    {filteredFiles.length}
                    {filteredFiles.length > 1 ? "articles" : "article"}
                </span>
                <a
                    href={`/edit/?collection=${collectionName}`}
                    class="admin-btn admin-btn-primary admin-btn-sm"
                >
                    <span class="btn-text">Nouveau</span>
                </a>
            </div>
        </div>
    </div>

    {#if filteredFiles.length > 0}
        <div class="admin-table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Titre</th>
                        {#if showPublished}
                            <th>Publié</th>
                        {/if}
                        <th style="text-align: right;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each filteredFiles as file (file.name)}
                        <tr>
                            <td class="admin-table-title" title={file.title}>
                                {file.title}
                            </td>
                            {#if showPublished}
                                <td>
                                    <PublishToggle
                                        collection={collectionName}
                                        filename={file.name}
                                        published={file.published}
                                    />
                                </td>
                            {/if}
                            <td style="text-align: right;">
                                <!-- Desktop view: Direct buttons -->
                                <div class="admin-flex admin-gap-sm desktop-only" style="justify-content: flex-end;">
                                    <a
                                        href={`/edit/?collection=${collectionName}&file=${file.name}`}
                                        class="admin-btn admin-btn-ghost admin-btn-sm"
                                        title="Éditer"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="admin-icon" style="margin-right: 0.4rem;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                        Éditer
                                    </a>
                                    <DeleteArticleButton
                                        collection={collectionName}
                                        filename={file.name}
                                        title={file.title}
                                    />
                                </div>

                                <!-- Mobile view: 3 dots dropdown -->
                                <div class="admin-dropdown mobile-only">
                                    <button 
                                        class="admin-btn admin-btn-ghost admin-btn-icon" 
                                        onclick={(e) => toggleDropdown(file.name, e)}
                                        aria-label="Actions"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="admin-icon"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                                    </button>

                                    {#if activeDropdown === file.name}
                                        <div class="admin-dropdown-menu">
                                            <a 
                                                href={`/edit/?collection=${collectionName}&file=${file.name}`}
                                                class="admin-dropdown-item"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="admin-icon"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                Éditer
                                            </a>
                                            <div onclick={(e) => e.stopPropagation()} role="none" style="display: contents;">
                                                <DeleteArticleButton
                                                    collection={collectionName}
                                                    filename={file.name}
                                                    title={file.title}
                                                    isDropdown={true}
                                                />
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {:else}
        <div class="admin-empty">
            <div class="admin-empty-icon">
                {#if searchQuery}
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.3;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                {:else}
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.3;"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
                {/if}
            </div>
            <h3>{searchQuery ? "Aucun résultat" : "Aucun article"}</h3>
            <p>
                {searchQuery
                    ? `Aucun article trouvé pour "${searchQuery}"`
                    : "Créez votre premier article dans cette collection"}
            </p>
            {#if searchQuery}
                <button
                    class="admin-btn admin-btn-ghost admin-btn-sm"
                    onclick={clearSearch}
                >
                    Effacer la recherche
                </button>
            {/if}
        </div>
    {/if}
</div>

<style>
    .admin-card-header {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    @media (min-width: 900px) {
        .admin-card-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
        }
    }

    .admin-collection-info h2 {
        font-size: 1.25rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        margin: 0;
    }

    .admin-actions-row {
        display: flex;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap;
    }

    @media (max-width: 600px) {
        .admin-actions-row {
            flex-direction: column;
            align-items: stretch;
            width: 100%;
        }

        .search-container {
            min-width: 100%;
        }

        .action-group {
            justify-content: space-between;
        }
    }

    .admin-description {
        color: var(--admin-text-secondary);
        font-size: 0.875rem;
        margin-top: 0.25rem;
        line-height: 1.5;
        max-width: 600px;
    }

    .search-container {
        position: relative;
        display: flex;
        align-items: center;
        min-width: 240px;
    }

    .search-icon {
        position: absolute;
        left: 0.875rem;
        font-size: 0.9rem;
        opacity: 0.4;
        pointer-events: none;
    }

    .admin-input-search {
        width: 100%;
        padding: 0.5rem 2.5rem 0.5rem 2.5rem;
        background: #ffffff;
        border: 1px solid var(--admin-border);
        border-radius: var(--admin-radius-sm);
        color: var(--admin-text);
        font-size: 0.875rem;
        transition: var(--admin-transition);
    }

    .admin-input-search:focus {
        outline: none;
        border-color: var(--admin-primary);
        box-shadow: 0 0 0 3px var(--admin-primary-subtle);
    }

    .clear-search {
        position: absolute;
        right: 0.75rem;
        background: none;
        border: none;
        color: var(--admin-text-muted);
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s;
    }

    .clear-search:hover {
        color: var(--admin-text);
    }

    .admin-table-title {
        font-weight: 500;
        color: var(--admin-text);
    }

    .admin-empty {
        text-align: center;
        padding: 4rem 2rem;
        border: 1px dashed var(--admin-border);
        border-radius: var(--admin-radius);
    }

    .admin-empty-icon {
        font-size: 2.5rem;
        margin-bottom: 1rem;
        opacity: 0.3;
    }
</style>
