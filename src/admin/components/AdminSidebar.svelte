<script lang="ts">
    import { slide } from 'svelte/transition';

    // Props in Svelte 5
    let { 
        collections = {}, 
        activeCollection = null, 
        view = null,
        activePage = null
    } = $props();

    // State
    let isCollectionsOpen = $state(activeCollection || (!activeCollection && !view));
    let isPagesOpen = $state(view === 'pages');

    // Static list of front-end pages (excluding admin, api, 404)
    const sitePages = [
        { path: '/', label: 'Accueil', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
        { path: '/a-propos', label: 'À propos', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
        { path: '/contact', label: 'Contact', icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6' },
        { path: '/ateliers', label: 'Ateliers', icon: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' },
        { path: '/atelier', label: 'Atelier (détail)', icon: 'M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2zM14 2v6h6' },
        { path: '/mentions-legales', label: 'Mentions légales', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
        { path: '/politique-de-confidentialite', label: 'Politique de confidentialité', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
    ];

    function toggleCollections() {
        isCollectionsOpen = !isCollectionsOpen;
    }

    function togglePages() {
        isPagesOpen = !isPagesOpen;
    }

    async function handleLogout(e: Event) {
        e.preventDefault();
        document.cookie = "admin_session=; Path=/; Max-Age=0";
        window.location.href = "/login/";
    }
</script>

<aside class="admin-sidebar" id="admin-sidebar">
    <div class="admin-sidebar-brand">
        <h1>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.5rem;">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            <span>CMS</span>
        </h1>
    </div>

    <nav class="admin-sidebar-nav">
        <!-- Collections Dropdown -->
        <div class="admin-sidebar-dropdown {isCollectionsOpen ? 'is-open' : ''}">
            <button 
                class="admin-sidebar-nav-toggle" 
                type="button"
                on:click={toggleCollections}
            >
                <div class="nav-label">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect></svg>
                    <span>Collections</span>
                </div>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="chevron"
                    ><path d="m9 18 6-6-6-6"></path></svg>
            </button>

            {#if isCollectionsOpen}
                <div class="admin-sidebar-dropdown-content" transition:slide={{ duration: 300 }}>
                    <a
                        href="/"
                        class={(!activeCollection && !view) ? "active" : ""}
                    >
                        <span>Toutes les collections</span>
                    </a>
                    {#each Object.entries(collections) as [id, config]}
                        <a
                            href="/?collection={id}"
                            class={activeCollection === id ? "active" : ""}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                ><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15a2.5 2.5 0 0 1 2.5-2.5Z"></path></svg>
                            <span>{id}</span>
                        </a>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- Pages Dropdown -->
        <div class="admin-sidebar-dropdown {isPagesOpen ? 'is-open' : ''}">
            <button 
                class="admin-sidebar-nav-toggle" 
                type="button"
                on:click={togglePages}
            >
                <div class="nav-label">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M3 15h6"></path><path d="M6 12v6"></path></svg>
                    <span>Pages</span>
                </div>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="chevron"
                    ><path d="m9 18 6-6-6-6"></path></svg>
            </button>

            {#if isPagesOpen}
                <div class="admin-sidebar-dropdown-content" transition:slide={{ duration: 300 }}>
                    <a
                        href="/?view=pages"
                        class={view === 'pages' && !activePage ? "active" : ""}
                    >
                        <span>Toutes les pages</span>
                    </a>
                    {#each sitePages as page}
                        <a
                            href="/?view=pages&page={encodeURIComponent(page.path)}"
                            class={activePage === page.path ? "active" : ""}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                ><path d={page.icon}></path></svg>
                            <span>{page.label}</span>
                        </a>
                    {/each}
                </div>
            {/if}
        </div>

        <div class="admin-sidebar-separator" style="margin: 1.5rem 0.75rem 0.5rem; height: 1px; background: var(--admin-border); opacity: 0.5;"></div>

        <a
            href="/?view=seo"
            class={view === "seo" ? "active" : ""}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <span>SEO</span>
        </a>
    </nav>

    <div class="admin-sidebar-footer">
        <button
            on:click={handleLogout}
            class="admin-btn admin-btn-ghost"
            style="width:100%;justify-content:center;"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" x2="9" y1="12" y2="12"></line></svg>
            <span>Déconnexion</span>
        </button>
    </div>
</aside>

<style>
    /* We override the display: none of the CSS content 
       since Svelte handles visibility with transition */
    .admin-sidebar-dropdown-content {
        display: flex !important;
    }

    button.admin-btn-ghost {
        cursor: pointer;
    }
</style>
