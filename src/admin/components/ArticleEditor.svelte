<script>
    import { onMount } from "svelte";
    import EasyMDE from "easymde";
    import "easymde/dist/easymde.min.css";
    import MediaModal from "./MediaModal.svelte";
    import ConfirmationModal from "./ConfirmationModal.svelte";

    let {
        config = {},
        fields = [],
        initialData = {},
        initialContent = "",
        initialSha = "",
        initialFileName = "",
        collectionName = "",
        githubOwner = "",
        githubRepo = "",
    } = $props();

    let existingData = $state({ ...initialData });
    let existingContent = $state(initialContent);
    let fileSha = $state(initialSha);
    let fileName = $state(initialFileName);

    // Closures for initial values to satisfy Svelte 5 lint
    const getInitialData = () => initialData;
    const getInitialContent = () => initialContent;
    const getInitialSha = () => initialSha;
    const getInitialFileName = () => initialFileName;

    // Sync from props if they change
    $effect(() => {
        existingData = { ...initialData };
        existingContent = initialContent;
        fileSha = initialSha;
        fileName = initialFileName;
    });

    let isEditing = $derived(!!fileName);
    let pageTitle = $derived(
        isEditing
            ? `Éditer — ${existingData.title || fileName}`
            : `Nouveau — ${config.title}`,
    );

    let marked = $state(null);
    let mediaMapping = $state({});

    let iframeRef;
    let iframeLoaded = $state(false);
    let previewTemplate = $state(
        config?.settings?.previewChange || "previewEditable",
    );

    $effect(() => {
        previewTemplate = config?.settings?.previewChange || "previewEditable";
    });

    let showMediaModal = $state(false);
    let showDeleteModal = $state(false);
    let mediaTarget = $state(null);
    let mediaType = $state("media");

    let isSaving = $state(false);
    let sidebarWidth = $state(380);
    let isResizing = $state(false);

    function startResizing(e) {
        isResizing = true;
        document.body.style.cursor = "col-resize";
        window.addEventListener("mousemove", handleResizing);
        window.addEventListener("mouseup", stopResizing);
    }

    function handleResizing(e) {
        if (!isResizing) return;
        let newWidth = e.clientX;
        if (newWidth > 280 && newWidth < 800) {
            sidebarWidth = newWidth;
        }
    }

    function stopResizing() {
        isResizing = false;
        document.body.style.cursor = "";
        window.removeEventListener("mousemove", handleResizing);
        window.removeEventListener("mouseup", stopResizing);
        localStorage.setItem("cms-editor-sidebar-width", sidebarWidth);
    }

    onMount(async () => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/marked@15/marked.min.js";
        script.onload = () => {
            marked = window.marked;
            updatePreview();
        };
        document.head.appendChild(script);

        fetch(`/api/admin/media?collection=${collectionName}`)
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    const newMapping = {};
                    data.forEach((item) => {
                        newMapping[item.name] = item.url;
                    });
                    mediaMapping = newMapping;
                }
            })
            .catch((err) => console.error("Error fetching media", err));

        const handleKeydown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                save();
            }
        };

        window.addEventListener("keydown", handleKeydown);

        const savedWidth = localStorage.getItem("cms-editor-sidebar-width");
        if (savedWidth) {
            sidebarWidth = parseInt(savedWidth, 10);
        }

        return () => {
            window.removeEventListener("keydown", handleKeydown);
        };
    });

    function handleIframeLoad() {
        iframeLoaded = true;
        updatePreview();
    }

    function updatePreview() {
        if (!iframeLoaded || !iframeRef || !iframeRef.contentWindow) return;

        const doc = iframeRef.contentWindow.document;

        fields.forEach((field) => {
            const targetClass = field.className || field.class || field.name;
            const elements = doc.querySelectorAll(`.${targetClass}`);

            elements.forEach((el) => {
                if (field.type === "markdown" && marked) {
                    try {
                        let html = marked.parse(existingContent || "");
                        html = html.replace(
                            /(?:https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/main\/public\/uploads\/img\/|(?:\.\.\/)+(?:public\/uploads\/img\/|assets\/img\/)|\/uploads\/img\/)([a-zA-Z0-9.\-_(%20)]+)(?:\?[^"'\s\)]*)?/g,
                            (match, encodedFilename) => {
                                const filename = decodeURIComponent(encodedFilename).split("?")[0];
                                return mediaMapping[filename] || match;
                            },
                        );
                        el.innerHTML = html;
                    } catch (e) {
                        el.innerHTML = `<p style="color:red;">Erreur de parsing Markdown</p>`;
                    }
                } else if (field.type === "image" || field.type === "media" || field.type === "video") {
                    let src = resolveMedia(existingData[field.name]);
                    if (el.tagName.toLowerCase() === "img") {
                        el.src = src || "";
                    } else if (el.tagName.toLowerCase() === "video") {
                        el.src = src || "";
                    } else {
                        el.style.backgroundImage = src ? `url(${src})` : "none";
                    }
                } else {
                    el.textContent = existingData[field.name] || "";
                }
            });
        });
    }

    $effect(() => {
        if (iframeLoaded) updatePreview();
    });

    function generateSlug(sourceField, targetField) {
        if (existingData[sourceField]) {
            const slug = existingData[sourceField]
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
                .substring(0, 100);
            existingData[targetField] = slug;
        }
    }

    function openMediaModal(target, type = "media") {
        mediaTarget = target;
        mediaType = type;
        showMediaModal = true;
    }

    function handleMediaSelect(item) {
        mediaMapping[item.name] = item.url;
        if (mediaTarget === "markdown_media") {
            const cm = easyMDEInstance.codemirror;
            const markdownUrl = `../../assets/img/${item.name}`;
            cm.replaceSelection(`\n\n![${item.name}](${markdownUrl})\n\n`);
            cm.focus();
        } else if (mediaTarget) {
            existingData[mediaTarget] = "../../assets/img/" + item.name;
        }
        showMediaModal = false;
    }

    let easyMDEInstance = null;
    function initMarkdownEditor(node) {
        easyMDEInstance = new EasyMDE({
            element: node,
            initialValue: existingContent,
            spellChecker: false,
            status: false,
            toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "image", "|", "preview", "side-by-side", "fullscreen"],
            previewRender: (plainText) => marked ? marked.parse(plainText) : plainText,
        });
        easyMDEInstance.codemirror.on("change", () => {
            existingContent = easyMDEInstance.value();
        });
        return {
            destroy() {
                if (easyMDEInstance) {
                    easyMDEInstance.toTextArea();
                    easyMDEInstance = null;
                }
            },
        };
    }

    async function save() {
        if (isSaving) return;
        isSaving = true;
        try {
            const res = await fetch("/api/admin/articles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    collection: collectionName,
                    filename: fileName || undefined,
                    sha: fileSha || undefined,
                    fields: existingData,
                    content: existingContent,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                window.showToast?.("Article sauvegardé!", "success");
                window.location.href = "/";
            } else {
                window.showToast?.("Erreur: " + (data.error || "Échec"), "error");
            }
        } catch (err) {
            window.showToast?.("Erreur réseau: " + err.message, "error");
        } finally {
            isSaving = false;
        }
    }

    async function confirmDelete() {
        try {
            const res = await fetch(`/api/admin/articles?collection=${collectionName}&file=${fileName}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                window.showToast?.("Article supprimé", "success");
                window.location.href = "/";
            } else {
                window.showToast?.("Erreur: " + (data.error || "Échec"), "error");
            }
        } catch (err) {
            window.showToast?.("Erreur réseau", "error");
        }
    }

    function resolveMedia(val) {
        if (!val || typeof val !== "string") return val;
        if (val.startsWith("http")) return val;
        const filename = val.split("/").pop();
        return mediaMapping[filename] || val;
    }

    function getMediaPreviewSrc(val) {
        return resolveMedia(val);
    }
</script>

<svelte:head>
    <title>{pageTitle} — CMS Admin</title>
</svelte:head>

<div class="admin-editor-wrapper">
    <header class="admin-editor-header">
        <div class="admin-flex admin-gap-md">
            <a href="/" class="admin-btn admin-btn-outline admin-btn-icon" title="Retour">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </a>
            <h1 style="font-size: 1rem; font-weight: 600; margin: 0;">{pageTitle}</h1>
        </div>

        <div class="admin-flex admin-gap-md">
            {#if isEditing}
                <button 
                    type="button" 
                    class="admin-btn admin-btn-ghost admin-btn-sm" 
                    onclick={() => (showDeleteModal = true)}
                    style="color: var(--admin-danger);"
                    aria-label="Supprimer cet article"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="admin-icon"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    <span class="btn-text">Supprimer</span>
                </button>
            {/if}
            <button 
                type="button" 
                class="admin-btn admin-btn-primary" 
                onclick={save} 
                disabled={isSaving}
                aria-label="Sauvegarder les modifications"
            >
                {#if isSaving}
                    <div class="admin-spinner admin-spinner-sm"></div>
                {:else}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="admin-icon"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                {/if}
                <span class="btn-text">{isSaving ? "Enregistrement..." : "Sauvegarder"}</span>
            </button>
        </div>
    </header>

    <div class="admin-editor-layout">
        <aside class="admin-editor-sidebar" style="width: {sidebarWidth}px;">
            {#each fields as field}
                {#if field.type !== "markdown"}
                    <div class="admin-form-group" style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem;">
                        <label for="field-{field.name}">
                            {field.label || field.name}
                            {#if field.required}<span style="color: var(--admin-danger);">*</span>{/if}
                        </label>

                        {#if field.type === "string" || field.type === "text"}
                            <input type="text" id="field-{field.name}" class="admin-input" bind:value={existingData[field.name]} />
                        {:else if field.type === "slug"}
                            <div class="admin-flex admin-gap-sm">
                                <input type="text" id="field-{field.name}" class="admin-input" bind:value={existingData[field.name]} style="flex:1;" />
                                <button 
                                    type="button" 
                                    class="admin-btn admin-btn-outline admin-btn-icon" 
                                    onclick={() => generateSlug(field.generateFrom || "title", field.name)}
                                    aria-label="Générer le slug"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="admin-icon"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                                </button>
                            </div>
                        {:else if field.type === "textarea"}
                            <textarea class="admin-textarea" rows="3" bind:value={existingData[field.name]}></textarea>
                        {:else if field.type === "image" || field.type === "media" || field.type === "video"}
                            <div class="admin-flex admin-gap-sm">
                                <input type="text" id="field-{field.name}" class="admin-input" bind:value={existingData[field.name]} style="flex:1;" />
                                <button 
                                    type="button" 
                                    class="admin-btn admin-btn-outline admin-btn-icon" 
                                    onclick={() => openMediaModal(field.name, field.type)}
                                    aria-label="Sélectionner un média"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="admin-icon"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/></svg>
                                </button>
                            </div>
                        {:else if field.type === "date"}
                            <input type="date" id="field-{field.name}" class="admin-input" bind:value={existingData[field.name]} />
                        {:else if field.type === "select"}
                            {#if field.name === "tags"}
                                <select 
                                    id="field-{field.name}" 
                                    class="admin-input" 
                                    bind:value={existingData[field.name]} 
                                    multiple
                                    style="height: auto; min-height: 120px;"
                                >
                                    {#if field.options}
                                        {#each field.options as opt}
                                            <option value={typeof opt === 'string' ? opt : opt.value}>
                                                {typeof opt === 'string' ? opt : opt.label}
                                            </option>
                                        {/each}
                                    {/if}
                                </select>
                            {:else}
                                <select 
                                    id="field-{field.name}" 
                                    class="admin-input" 
                                    bind:value={existingData[field.name]} 
                                >
                                    {#if field.options}
                                        {#each field.options as opt}
                                            <option value={typeof opt === 'string' ? opt : opt.value}>
                                                {typeof opt === 'string' ? opt : opt.label}
                                            </option>
                                        {/each}
                                    {/if}
                                </select>
                            {/if}
                        {:else if field.type === "checkbox"}
                            <label class="admin-flex admin-gap-md" style="cursor:pointer; font-weight: 500; font-size: 0.875rem;">
                                <input type="checkbox" id="field-{field.name}" bind:checked={existingData[field.name]} />
                                <span>{field.placeholder || field.label}</span>
                            </label>
                        {/if}
                    </div>
                {/if}
            {/each}

            {#if fields.find((f) => f.type === "markdown")}
                <div style="margin-top: 1rem; padding-top: 1.5rem; border-top: 1px solid var(--admin-border);">
                    <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Contenu</label>
                    <div style="margin-top: 0.5rem;">
                        <textarea use:initMarkdownEditor></textarea>
                    </div>
                </div>
            {/if}
        </aside>

        <div 
            class="editor-resizer" 
            onmousedown={startResizing}
            role="separator"
            aria-valuenow={sidebarWidth}
            aria-valuemin="280"
            aria-valuemax="800"
            tabindex="0"
        ></div>

        <main class="editor-preview-container" style="flex: 1; background: white; position: relative;">
            <iframe
                bind:this={iframeRef}
                src={`/preview/${previewTemplate}/`}
                title="Aperçu"
                onload={handleIframeLoad}
                style="width:100%; height:100%; border:none;"
            ></iframe>
            {#if !iframeLoaded}
                <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:var(--admin-text-muted);">
                    Chargement de l'aperçu...
                </div>
            {/if}
        </main>
    </div>
</div>

<MediaModal
    bind:active={showMediaModal}
    collection={collectionName}
    expectedType={mediaType}
    onclose={() => (showMediaModal = false)}
    onselect={handleMediaSelect}
/>

<ConfirmationModal
    bind:active={showDeleteModal}
    title="Supprimer l'article"
    message={`Voulez-vous vraiment supprimer cet article ? Cette opération est définitive.`}
    confirmLabel="Supprimer"
    cancelLabel="Annuler"
    type="danger"
    onclose={() => (showDeleteModal = false)}
    onconfirm={confirmDelete}
/>
