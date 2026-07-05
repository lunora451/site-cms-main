<script>
    import { onMount } from "svelte";
    import ConfirmationModal from "./ConfirmationModal.svelte";
    let {
        active = $bindable(false),
        collection = "blog",
        expectedType = "media",
        onclose,
        onselect,
        ondelete,
    } = $props();

    let currentTab = $state("photos");
    let media = $state([]);
    let loading = $state(false);
    let error = $state(null);
    let searchQuery = $state("");
    let uploading = $state(false);
    let fileInput = $state(null);

    let renamingId = $state(null);
    let newName = $state("");
    let showDeleteModal = $state(false);
    let itemToDelete = $state(null);

    let filteredMedia = $derived(
        media.filter((m) => {
            const searchMatch = m.name
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
            if (!searchMatch) return false;
            if (expectedType === "video") return m.type === "video";
            if (expectedType === "image") return m.type === "image";
            return true;
        }),
    );

    async function loadMedia() {
        loading = true;
        error = null;
        try {
            const res = await fetch(`/api/admin/media`);
            if (res.ok) {
                media = await res.json();
            } else {
                const data = await res.json();
                throw new Error(data.error || "Échec du chargement");
            }
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        if (active) {
            loadMedia();
        }
    });

    async function handleUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        uploading = true;

        try {
            let uploadFile = file;
            let uploadName = file.name;

            const formData = new FormData();
            formData.append("file", uploadFile, uploadName);
            formData.append("collection", collection);

            const res = await fetch("/api/admin/media", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                window.showToast?.("Image ajoutée !", "success");
                loadMedia();
            } else {
                window.showToast?.(data.error || "Erreur upload", "error");
            }
        } catch (err) {
            window.showToast?.("Erreur réseau", "error");
        } finally {
            uploading = false;
            fileInput.value = "";
        }
    }

    async function deleteItem(item) {
        itemToDelete = item;
        showDeleteModal = true;
    }

    async function confirmDelete() {
        if (!itemToDelete) return;
        const item = itemToDelete;

        try {
            const res = await fetch(
                `/api/admin/media?key=${encodeURIComponent(item.key)}&collection=${encodeURIComponent(collection)}`,
                {
                    method: "DELETE",
                },
            );
            if (res.ok) {
                window.showToast?.("Supprimé", "success");
                loadMedia();
                ondelete?.(item);
            } else {
                const data = await res.json();
                window.showToast?.(data.error || "Erreur suppression", "error");
            }
        } catch (err) {
            window.showToast?.("Erreur réseau", "error");
        }
    }

    function startRename(item) {
        renamingId = item.key;
        newName = item.name;
    }

    async function submitRename(item) {
        if (!newName || newName === item.name) {
            renamingId = null;
            return;
        }

        try {
            const res = await fetch("/api/admin/media", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    oldKey: item.key,
                    newName: newName,
                    collection: collection,
                }),
            });
            if (res.ok) {
                window.showToast?.("Renommé", "success");
                renamingId = null;
                loadMedia();
            } else {
                const data = await res.json();
                window.showToast?.(data.error || "Erreur renommage", "error");
            }
        } catch (err) {
            window.showToast?.("Erreur réseau", "error");
        }
    }

    function autofocus(node) {
        node.focus();
    }

    function select(item) {
        onselect?.(item);
        close();
    }

    function close() {
        onclose?.();
        active = false;
    }
</script>

{#if active}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
        class="media-modal-overlay active"
        role="button"
        tabindex="-1"
        onclick={close}
    >
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
            class="media-modal"
            role="dialog"
            aria-modal="true"
            tabindex="-1"
            onclick={(e) => e.stopPropagation()}
        >
            <div class="media-modal-header">
                <div class="media-modal-title">
                    {#if expectedType === "video"}
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            style="margin-right: 0.5rem; vertical-align: middle;"
                            ><path d="m22 8-6 4 6 4V8Z" /><rect
                                width="14"
                                height="12"
                                x="2"
                                y="6"
                                rx="2"
                                ry="2"
                            /></svg
                        >
                        Vidéothèque — {collection}
                    {:else if expectedType === "image"}
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            style="margin-right: 0.5rem; vertical-align: middle;"
                            ><path
                                d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"
                            /><circle cx="12" cy="13" r="3" /></svg
                        >
                        Photothèque — {collection}
                    {:else}
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            style="margin-right: 0.5rem; vertical-align: middle;"
                            ><path
                                d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"
                            /></svg
                        >
                        Médiathèque — {collection}
                    {/if}
                </div>
                <button class="close-btn" onclick={close}>✕</button>
            </div>

            <div class="media-modal-toolbar">
                <div class="search-wrapper">
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        ><circle cx="11" cy="11" r="8"></circle><line
                            x1="21"
                            y1="21"
                            x2="16.65"
                            y2="16.65"
                        ></line></svg
                    >
                    <input
                        type="text"
                        placeholder="Rechercher un média..."
                        bind:value={searchQuery}
                    />
                </div>

                <input
                    type="file"
                    bind:this={fileInput}
                    onchange={handleUpload}
                    style="display: none;"
                    accept={expectedType === "video"
                        ? "video/*"
                        : expectedType === "image"
                          ? "image/*"
                          : "image/*,video/*"}
                />
                <button
                    class="upload-btn"
                    onclick={() => fileInput.click()}
                    disabled={uploading}
                >
                    {#if uploading}
                        <div class="spinner"></div>
                    {:else}
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            ><path
                                d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                            /><polyline points="17 8 12 3 7 8" /><line
                                x1="12"
                                x2="12"
                                y1="3"
                                y2="15"
                            /></svg
                        >
                        Importer
                    {/if}
                </button>
            </div>

            <div class="media-modal-content">
                {#if loading}
                    <div class="status-box">
                        <div class="spinner"></div>
                        <p>Chargement des médias...</p>
                    </div>
                    <div class="status-box error">
                        <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--admin-danger)"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            style="margin-bottom: 0.5rem;"
                            ><path
                                d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
                            /><line x1="12" x2="12" y1="9" y2="13" /><line
                                x1="12"
                                x2="12.01"
                                y1="17"
                                y2="17"
                            /></svg
                        >
                        <p>{error}</p>
                        <button
                            class="admin-btn admin-btn-ghost"
                            onclick={loadMedia}>Réessayer</button
                        >
                    </div>
                {:else if filteredMedia.length === 0}
                    <div class="status-box empty">
                        <p>Aucun média trouvé.</p>
                    </div>
                {:else}
                    <div class="media-grid">
                        {#each filteredMedia as item}
                            <div
                                class="media-card"
                                class:is-renaming={renamingId === item.key}
                            >
                                <div
                                    class="media-preview"
                                    onclick={() => select(item)}
                                >
                                    {#if item.type === "video"}
                                        <video
                                            src={item.url}
                                            muted
                                            loop
                                            onmouseover={function () {
                                                this.play();
                                            }}
                                            onmouseout={function () {
                                                this.pause();
                                            }}
                                            style="width:100%; height:100%; object-fit: cover;"
                                        ></video>
                                    {:else}
                                        <img
                                            src={item.url}
                                            alt={item.name}
                                            loading="lazy"
                                        />
                                    {/if}
                                    <div class="select-overlay">
                                        Sélectionner
                                    </div>
                                </div>
                                <div class="media-info">
                                    {#if renamingId === item.key}
                                        <input
                                            type="text"
                                            bind:value={newName}
                                            onkeydown={(e) =>
                                                e.key === "Enter" &&
                                                submitRename(item)}
                                            onblur={() => submitRename(item)}
                                            use:autofocus
                                        />
                                    {:else}
                                        <span
                                            class="media-name"
                                            title={item.name}>{item.name}</span
                                        >
                                    {/if}
                                    <div class="media-actions">
                                        <button
                                            title="Renommer"
                                            onclick={(e) => {
                                                e.stopPropagation();
                                                startRename(item);
                                            }}
                                            ><svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                ><path d="M12 20h9" /><path
                                                    d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                                                /></svg
                                            ></button
                                        >
                                        <button
                                            title="Supprimer"
                                            class="delete"
                                            onclick={(e) => {
                                                e.stopPropagation();
                                                deleteItem(item);
                                            }}
                                            ><svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                ><path d="M3 6h18" /><path
                                                    d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"
                                                /><path
                                                    d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
                                                /><line
                                                    x1="10"
                                                    x2="10"
                                                    y1="11"
                                                    y2="17"
                                                /><line
                                                    x1="14"
                                                    x2="14"
                                                    y1="11"
                                                    y2="17"
                                                /></svg
                                            ></button
                                        >
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<ConfirmationModal
    active={showDeleteModal}
    title="Supprimer le média"
    message={`Voulez-vous vraiment supprimer "${itemToDelete?.name}" ?`}
    confirmLabel="Supprimer"
    cancelLabel="Annuler"
    type="danger"
    onclose={() => {
        showDeleteModal = false;
        itemToDelete = null;
    }}
    onconfirm={confirmDelete}
/>

<style>
    .media-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
    }

    .media-modal-overlay.active {
        opacity: 1;
        pointer-events: auto;
    }

    .media-modal {
        width: 90%;
        max-width: 1000px;
        height: 80vh;
        background: var(--admin-bg, #fff);
        border-radius: 16px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: translateY(20px);
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .media-modal-overlay.active .media-modal {
        transform: translateY(0);
    }

    .media-modal-header {
        padding: 1rem 1.5rem;
        background: var(--admin-panel-bg, #f8fafc);
        border-bottom: 1px solid var(--admin-border, #e2e8f0);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .media-modal-title {
        font-weight: 600;
        font-size: 1.125rem;
        color: var(--admin-text-main, #1e293b);
    }

    .close-btn {
        background: transparent;
        border: none;
        font-size: 1.25rem;
        color: var(--admin-text-secondary);
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 50%;
    }

    .close-btn:hover {
        background: rgba(0, 0, 0, 0.05);
    }

    .media-modal-toolbar {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--admin-border);
        display: flex;
        gap: 1rem;
        align-items: center;
    }

    .search-wrapper {
        flex: 1;
        position: relative;
        display: flex;
        align-items: center;
    }

    .search-wrapper svg {
        position: absolute;
        left: 12px;
        color: var(--admin-text-muted, #94a3b8);
    }

    .search-wrapper input {
        width: 100%;
        padding: 0.625rem 1rem 0.625rem 2.5rem;
        border: 1px solid var(--admin-border);
        border-radius: 10px;
        font-size: 0.875rem;
        transition: border-color 0.2s;
    }

    .search-wrapper input:focus {
        outline: none;
        border-color: var(--admin-primary);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
    }

    .upload-btn {
        padding: 0.625rem 1.25rem;
        background: var(--admin-primary);
        color: white;
        border: none;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: opacity 0.2s;
    }

    .upload-btn:hover {
        opacity: 0.9;
    }

    .media-modal-content {
        flex: 1;
        padding: 1.5rem;
        overflow-y: auto;
    }

    .media-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 1.5rem;
    }

    .media-card {
        background: var(--admin-panel-bg);
        border: 1px solid var(--admin-border);
        border-radius: 12px;
        overflow: hidden;
        transition:
            transform 0.2s,
            box-shadow 0.2s;
    }

    .media-card:hover {
        background: var(--admin-bg-hover, #f1f1f1);
        border-color: var(--admin-text-muted);
    }

    .media-preview {
        aspect-ratio: 1;
        background: #f1f5f9;
        position: relative;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .media-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .select-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        opacity: 0;
        transition: opacity 0.2s;
    }

    .media-preview:hover .select-overlay {
        opacity: 1;
    }

    .media-info {
        padding: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .media-name {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--admin-text-main);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .media-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
    }

    .media-actions button {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        font-size: 0.875rem;
        filter: grayscale(1);
        transition:
            filter 0.2s,
            background 0.2s;
    }

    .media-actions button:hover {
        filter: grayscale(0);
        background: rgba(0, 0, 0, 0.05);
    }

    .media-actions button.delete:hover {
        background: #fee2e2;
    }

    .status-box {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--admin-text-muted);
        gap: 1rem;
    }

    .spinner {
        width: 24px;
        height: 24px;
        border: 3px solid rgba(0, 0, 0, 0.1);
        border-top-color: var(--admin-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .is-renaming input {
        width: 100%;
        padding: 4px 8px;
        border: 1px solid var(--admin-primary);
        border-radius: 4px;
        font-size: 0.75rem;
        outline: none;
    }
</style>
