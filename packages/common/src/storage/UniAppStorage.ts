import { IStorage } from "./IStorage.ts";

// src/storage/UniAppStorage.ts (UniApp实现)
export class UniAppStorage implements IStorage {
    async getItem<T>(key: string): Promise<T | null> {
        return new Promise((resolve) => {
            // 注意：这里假设在UniApp环境中，uni对象存在
            // 实际代码中需要做环境判断
            if (typeof uni !== 'undefined' && uni.getStorageSync) {
                try {
                    const value = uni.getStorageSync(key);
                    resolve(value ? JSON.parse(value) : null);
                } catch (error) {
                    console.error(`UniAppStorage: Failed to get item ${key}:`, error);
                    resolve(null);
                }
            } else {
                // 非UniApp环境，回退到localStorage
                console.warn('UniAppStorage: uni not available, fallback to localStorage');
                const item = localStorage.getItem(key);
                resolve(item ? JSON.parse(item) : null);
            }
        });
    }

    async setItem<T>(key: string, value: T): Promise<void> {
        return new Promise((resolve, reject) => {
            if (typeof uni !== 'undefined' && uni.setStorageSync) {
                try {
                    uni.setStorageSync(key, JSON.stringify(value));
                    resolve();
                } catch (error) {
                    console.error(`UniAppStorage: Failed to set item ${key}:`, error);
                    reject(error);
                }
            } else {
                // 非UniApp环境，回退到localStorage
                console.warn('UniAppStorage: uni not available, fallback to localStorage');
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }
        });
    }

    async removeItem(key: string): Promise<void> {
        if (typeof uni !== 'undefined' && uni.removeStorageSync) {
            uni.removeStorageSync(key);
        } else {
            localStorage.removeItem(key);
        }
    }

    async clear(): Promise<void> {
        if (typeof uni !== 'undefined' && uni.clearStorageSync) {
            uni.clearStorageSync();
        } else {
            localStorage.clear();
        }
    }
}