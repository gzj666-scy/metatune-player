
import express from 'express';
import { createServer } from 'http';
import { statSync, createReadStream } from 'fs';
import { extname } from 'path';
import cors from 'cors';

export class AudioStreamServer {
    private app = express();
    private server: ReturnType<typeof createServer> | null = null;
    private port = 1688;
    private baseUrl: string;
    // private cache = new Map<string, { buffer: Buffer; mime: string }>();

    constructor() {
        this.baseUrl = `http://localhost:${this.port}`;
        this.setupServer();
    }

    private setupServer() {
        this.app.use(cors());

        // 音频流端点
        this.app.get('/stream/:id', async (req, res) => {
            try {
                const filePath = decodeURIComponent(req.params.id);
                const range = req.headers.range;

                if (!filePath) {
                    res.status(400).send('No file path provided');
                    return;
                }

                const stats = statSync(filePath);
                const fileSize = stats.size;
                const mimeType = this.getMimeType(filePath);

                if (range) {
                    // 支持范围请求（进度控制）
                    const parts = range.replace(/bytes=/, '').split('-');
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                    const chunksize = (end - start) + 1;

                    res.writeHead(206, {
                        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunksize,
                        'Content-Type': mimeType,
                        'Cache-Control': 'no-cache',
                    });

                    const stream = createReadStream(filePath, { start, end });
                    stream.pipe(res);
                } else {
                    // 完整文件请求
                    res.writeHead(200, {
                        'Content-Length': fileSize,
                        'Content-Type': mimeType,
                        'Cache-Control': 'no-cache',
                    });

                    createReadStream(filePath).pipe(res);
                }
            } catch (error) {
                console.error('Stream error:', error);
                res.status(500).send('Internal server error');
            }
        });
    }

    private getMimeType(filePath: string): string {
        const ext = extname(filePath).toLowerCase();
        const mimeMap: Record<string, string> = {
            // 音频类
            '.mp3': 'audio/mpeg',
            '.m4a': 'audio/mp4',
            '.flac': 'audio/flac',
            '.aac': 'audio/aac',
            '.wav': 'audio/wav',
            '.ape': 'audio/x-ape',
            '.ogg': 'audio/ogg',
            '.opus': 'audio/opus',
            '.webm': 'audio/webm',
            '.wma': 'audio/x-ms-wma',
            // 图片类
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml'
        };
        return mimeMap[ext] || 'application/octet-stream';
    }

    public getStreamUrl(filePath: string): string {
        return `${this.baseUrl}/stream/${encodeURIComponent(filePath)}`;
    }

    public start(): Promise<void> {
        return new Promise((resolve) => {
            this.server = createServer(this.app);

            const startServer = (port: number) => {
                return new Promise((resolve, reject) => {
                    if (this.server) {
                        this.server.close()
                    }

                    this.server!.on('error', (err: any) => {
                        if (err.code === 'EADDRINUSE') {
                            console.log(`Port ${port} is busy, trying another port...`)
                            resolve(null)
                        } else {
                            reject(err)
                        }
                    })

                    this.server!.listen(port, () => {
                        console.log(`Audio server running at ${this.baseUrl}`);
                        resolve(port);
                    })
                })
            }

            const checkServer = () => {
                return new Promise((resolve, reject) => {
                    const fun = (port: number) => {
                        startServer(port).then(usedPort => {
                            if (usedPort) {
                                resolve(usedPort)
                            } else {
                                // 如果指定端口被占用，尝试新端口
                                fun(port + 1)
                            }
                        }).catch(reject)
                    }
                    fun(this.port)
                })
            }

            const tryStartServer = async () => {
                try {
                    await checkServer()
                } catch (err) {
                    console.error('Failed to start server:', err)
                    process.exit(1)
                }
            }

            tryStartServer()
        });
    }

    public stop() {
        if (this.server) {
            this.server.close();
        }
    }
}