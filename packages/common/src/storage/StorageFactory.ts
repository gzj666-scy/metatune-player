import { IStorage } from "./IStorage.ts";
import { UniAppStorage } from "./UniAppStorage.js";
import { WebStorage } from "./WebStorage.js";

// src/storage/StorageFactory.ts (工厂模式，根据环境提供正确的实现)
export class StorageFactory {
    private static instance: IStorage;

    static getStorage(): IStorage {
        if (!this.instance) {
            // 环境检测
            if (typeof uni !== 'undefined') {
                // UniApp 环境
                this.instance = new UniAppStorage();
            } else {
                // Web/Electron 环境
                this.instance = new WebStorage();
            }
        }
        return this.instance;
    }

    // 用于测试，可以手动设置存储实例
    static setStorage(storage: IStorage) {
        this.instance = storage;
    }
}