import { IStorage } from "./IStorage.ts";

// src/storage/WebStorage.ts (Web/Electron实现)
export class WebStorage implements IStorage {
    private storage: Storage;

    constructor(useLocalStorage: boolean = true) {
        this.storage = useLocalStorage ? localStorage : sessionStorage;
    }

    async getItem<T>(key: string): Promise<T | null> {
        try {
            const item = this.storage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error(`Failed to get item ${key}:`, error);
            return null;
        }
    }

    async setItem<T>(key: string, value: T): Promise<void> {
        try {
            this.storage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Failed to set item ${key}:`, error);
            throw error;
        }
    }

    async removeItem(key: string): Promise<void> {
        this.storage.removeItem(key);
    }

    async clear(): Promise<void> {
        this.storage.clear();
    }

    async getAllKeys(): Promise<string[]> {
        return Object.keys(this.storage);
    }
}