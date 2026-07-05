<script lang="ts">
    export let collection: string;
    export let filename: string;
    export let published: boolean = true;

    let loading = false;

    async function togglePublish() {
        if (loading) return;
        loading = true;

        try {
            const response = await fetch("/api/admin/articles", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    collection,
                    filename,
                    published: !published,
                }),
            });

            const data = await response.json();
            if (data.success) {
                published = data.published;
            } else {
                alert("Erreur lors de la mise à jour: " + (data.error || "Inconnu"));
            }
        } catch (error) {
            console.error(error);
            alert("Erreur réseau");
        } finally {
            loading = false;
        }
    }
</script>

<div class="publish-toggle-container">
    <button 
        class="toggle-btn {published ? 'published' : 'draft'}" 
        on:click={togglePublish}
        disabled={loading}
        title={published ? 'Passer en brouillon' : 'Publier'}
    >
        <span class="toggle-track">
            <span class="toggle-thumb"></span>
        </span>
        <span class="toggle-label">
            {loading ? '...' : (published ? 'Publié' : 'Brouillon')}
        </span>
    </button>
</div>

<style>
    .publish-toggle-container {
        display: flex;
        align-items: center;
    }

    .toggle-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--admin-text-muted);
        transition: all 0.2s ease;
    }

    .toggle-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .toggle-track {
        width: 32px;
        height: 18px;
        background: #334155;
        border-radius: 9px;
        position: relative;
        transition: background 0.2s ease;
    }

    .toggle-thumb {
        width: 14px;
        height: 14px;
        background: white;
        border-radius: 50%;
        position: absolute;
        top: 2px;
        left: 2px;
        transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .published .toggle-track {
        background: #10b981;
    }

    .published .toggle-thumb {
        transform: translateX(14px);
    }

    .published .toggle-label {
        color: #10b981;
    }

    .draft .toggle-label {
        color: var(--admin-text-muted);
    }

    .toggle-btn:hover:not(:disabled) .toggle-track {
        filter: brightness(1.1);
    }
</style>
