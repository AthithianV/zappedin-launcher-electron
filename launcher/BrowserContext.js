import { chromium } from 'playwright-extra';
import path from 'path';
import fs from 'fs';
import stealth from 'puppeteer-extra-plugin-stealth';
import { Browser, BrowserContext, Cookie, Page } from 'playwright';
import { config } from 'dotenv';

import { chromePath } from './chromePath';
import moment from 'moment';

config();

// interface Proxy {
//     id?: number;
//     hostName: string;
//     port: number;
//     username: string;
//     password: string;
//     country: string;
//     timezone: string;
//     locale: string;
// }

// interface StorageState {
//     cookies: Cookie[];
//     origins: {
//         origin: string;
//         localStorage: { name: string; value: string }[];
//     }[];
// }

// Class to handle browser context and session
export default class LinkedInContext {
    browser = null;
    context= null;
    page= null;

    async init() {
        try {
            const statePath = path.resolve(process.cwd(), 'state.json');

            chromium.use(stealth());

            // Launch the browser
            this.browser = await chromium.launch({
                executablePath: chromePath,
                headless: false,
            });

            // Create a new context with proxy if provided
            const contextOptions = {
                viewport: { width: 1280, height: 700 },
                storageState: statePath,
                recordVideo: {
                    dir: 'videos',
                    size: {
                        width: 1280,
                        height: 700,
                    },
                },
            };

            this.context = await this.browser.newContext(contextOptions);
            await this.createPage();

            console.log('Browser initialized successfully');

            if (!this.page) {
                console.error('Page not initialized');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Failed to initialize browser:', error);
            return false;
        }
    }

    async createPage() {
        if (!this.context) {
            console.error('Browser context not initialized');
            return false;
        }

        this.page = await this.context.newPage();
        await this.page.setViewportSize({ width: 1200, height: 700 });

        await this.page.addInitScript(() => {
            Object.defineProperty(navigator, 'mediaDevices', {
                value: {
                    getUserMedia: () =>
                        Promise.reject(new Error('Blocked for privacy')),
                },
            });

            window.RTCPeerConnection = function (...args) {
                console.warn('WebRTC blocked');
                throw new Error('WebRTC blocked for privacy');
            };
        });

        console.log('Page created successfully');
        return true;
    }

    getPage() {
        return this.page;
    }

    async setProxy(proxy) {
        try {
            // Store current state before closing
            let currentState = null;
            if (this.context) {
                currentState =
                    (await this.context.storageState());
            }

            // Close only the context, not the browser
            if (this.context) {
                await this.context.close();
                await this.saveCurrentVideo();
                this.context = null;
                this.page = null;
            }

            // If browser is closed or not initialized, initialize it
            if (!this.browser) {
                this.browser = await chromium.launch({
                    executablePath: chromePath,
                    headless: false,
                });
            }

            // Create a new context with the new proxy
            const contextOptions = {
                viewport: { width: 1280, height: 700 },
                storageState:
                    currentState || path.resolve(process.cwd(), 'state.json'),
                recordVideo: {
                    dir: 'videos',
                    size: {
                        width: 1280,
                        height: 700,
                    },
                },
                proxy: {
                    server: `http://${proxy.hostName}:${proxy.port}`,
                    username: proxy.username,
                    password: proxy.password,
                },
                timezoneId: proxy.timezone,
                locale: proxy.locale,
            };

            this.context = await this.browser.newContext(contextOptions);

            // Create a new page
            await this.createPage();
            console.log(
                `Proxy successfully updated to ${proxy.hostName}:${proxy.port}`
            );
            return true;
        } catch (error) {
            console.error('Failed to set proxy:', error);
            return false;
        }
    }

    async saveCurrentVideo() {
        if (!this.page) return false;

        const video = this.page.video();
        if (!video) {
            console.log('No video to save');
            return false;
        }

        // Must wait for context to close before getting video path
        try {
            const videosDir = path.join(process.cwd(), 'videos');
            await fs.promises.mkdir(videosDir, { recursive: true });

            // This will wait for the video to be written
            const originalPath = await video.path();

            const newPath = path.join(
                videosDir,
                `${moment().format('DD MMM YYYY - HH-mm')}.webm` // Use safe filename
            );

            // Retry up to 5 times if file is busy
            for (let attempt = 0; attempt < 5; attempt++) {
                try {
                    await fs.promises.rename(originalPath, newPath);
                    console.log(`✅ Video saved to ${newPath}`);
                    return true;
                } catch (err) {
                    if (err.code === 'EBUSY') {
                        console.warn(
                            `File is busy, retrying... (${attempt + 1}/5)`
                        );
                        await new Promise((resolve) =>
                            setTimeout(resolve, 1000)
                        );
                    } else {
                        throw err;
                    }
                }
            }
            console.error('Failed to rename video after multiple attempts.');
            return false;
            return true;
        } catch (err) {
            console.error('Failed to rename video:', err);
            return false;
        }
    }

    async close() {
        try {
            // Save storage state (also needs context to be alive)
            await this.saveState();

            await this.context?.close();

            // Save video first (video must be accessed before context is closed)
            await this.saveCurrentVideo();

            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                this.context = null;
                this.page = null;
            }

            return true;
        } catch (error) {
            console.error('Error closing browser:', error);
            return false;
        }
    }

    async getState() {
        if (!this.context) {
            console.error('Context not initialized');
            return false;
        }
        const state = await this.context.storageState();
        return state;
    }

    async saveState() {
        if (!this.context) {
            console.error('Context not initialized');
            return false;
        }

        // Save storage state
        await this.context.storageState({ path: 'state.json' });
        return true;
    }
}