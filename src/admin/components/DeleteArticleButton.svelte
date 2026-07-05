<script lang="ts">
    import ConfirmationModal from "./ConfirmationModal.svelte";

    let { 
        collection, 
        filename, 
        title = "",
        isDropdown = false
    } = $props();

    let showModal = $state(false);
    let isDeleting = $state(false);

    async function handleDelete() {
        isDeleting = true;
        try {
            const res = await fetch(
                `/api/admin/articles?collection=${collection}&file=${filename}`,
                {
                    method: "DELETE",
                },
            );
            const data = await res.json();
            if (data.success) {
                window.showToast?.("Article supprimé", "success");
                // Find and remove the table row
                const btn = document.querySelector(`[data-delete-file="${filename}"][data-delete-collection="${collection}"]`);
                if (btn) {
                    btn.closest("tr")?.remove();
                }
            } else {
                window.showToast?.("Erreur: " + (data.error || "Échec"), "error");
            }
        } catch (err) {
            window.showToast?.("Erreur réseau", "error");
        } finally {
            isDeleting = false;
            showModal = false;
        }
    }
</script>

{#if isDropdown}
    <button
        class="admin-dropdown-item danger"
        onclick={(e) => { e.stopPropagation(); showModal = true; }}
        disabled={isDeleting}
        data-delete-file={filename}
        data-delete-collection={collection}
    >
        {#if isDeleting}
            <div class="admin-spinner admin-spinner-sm" style="border-top-color: var(--admin-danger);"></div>
            Suppression...
        {:else}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="admin-icon"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            Supprimer
        {/if}
    </button>
{:else}
    <button
        class="admin-btn admin-btn-ghost admin-btn-sm"
        onclick={() => (showModal = true)}
        disabled={isDeleting}
        data-delete-file={filename}
        data-delete-collection={collection}
        title="Supprimer l'article"
    >
        {#if isDeleting}
            <div class="admin-spinner admin-spinner-sm"></div>
        {:else}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="admin-icon"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
        {/if}
    </button>
{/if}

<ConfirmationModal
    bind:active={showModal}
    title="Supprimer l'article"
    message={`Êtes-vous sûr de vouloir supprimer "${title || filename}" ? Cette action est irréversible.`}
    confirmLabel="Supprimer définitivement"
    cancelLabel="Annuler"
    type="danger"
    onclose={() => (showModal = false)}
    onconfirm={handleDelete}
/>
