import { config } from 'dotenv';
import os from 'os';

config();

const { CHROME_PATH_WIN, CHROME_PATH_MAC, CHROME_PATH_LINUX } = process.env;

const chromePathMap= {
    win32:
        CHROME_PATH_WIN ||
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    darwin:
        CHROME_PATH_MAC ||
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    linux: CHROME_PATH_LINUX || 'google-chrome',
};

const platform = os.platform();
export const chromePath = chromePathMap[platform] || 'google-chrome';