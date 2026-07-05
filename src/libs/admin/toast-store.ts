import { writable } from 'svelte/store';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

export const toastStore = writable<Toast[]>([]);

export function showToast(message: string, type: ToastType = 'info') {
    const id = Math.random().toString(36).substring(2, 9);
    
    toastStore.update(toasts => [...toasts, { id, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        removeToast(id);
    }, 4000);
}

export function removeToast(id: string) {
    toastStore.update(toasts => toasts.filter(t => t.id !== id));
}
