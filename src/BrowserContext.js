import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { config } from "dotenv";

import { chromePath } from "./chromePath.js";

config();

// Class to handle browser context and session
export default class LinkedInContext {
  browser = null;
  context = null;
  page = null;
  userData = null;

  async init(userData) {
    try {
      // storing username
      this.userData = userData;

      chromium.use(stealth());

      // Launch the browser
      this.browser = await chromium.launch({
        executablePath: chromePath,
        headless: false,
      });

      const { host_name, password, username, port } = userData.proxy;

      const storageState = this.userData.state
        ? JSON.parse(this.userData.state)
        : {
            cookies: [],
            origins: [],
          };

      // Create a new context with proxy if provided
      const contextOptions = {
        viewport: { width: 1280, height: 700 },
        storageState,
        proxy: {
          server: `http://${host_name}:${port}`,
          username: username,
          password: password,
        },
      };

      this.context = await this.browser.newContext(contextOptions);
      await this.createPage();

      console.log("Browser initialized successfully");

      if (!this.page) {
        console.error("Page not initialized");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to initialize browser:", error);
      return false;
    }
  }

  async createPage() {
    if (!this.context) {
      console.error("Browser context not initialized");
      return false;
    }

    this.page = await this.context.newPage();
    await this.page.setViewportSize({ width: 1200, height: 700 });

    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          getUserMedia: () => Promise.reject(new Error("Blocked for privacy")),
        },
      });

      window.RTCPeerConnection = function (...args) {
        console.warn("WebRTC blocked");
        throw new Error("WebRTC blocked for privacy");
      };
    });

    // Navigate to LinkedIn and handle login if needed
    await this.navigateAndLogin();

    console.log("Page created successfully");
    return true;
  }

  async navigateAndLogin() {
    try {
      // First, go to the profile page
      await this.page.goto(
        `https://www.linkedin.com/in/${this.userData.username}`,
        {
          waitUntil: "networkidle",
        }
      );

      // Wait a bit for the page to load completely
      await this.page.waitForTimeout(2000);

      // Check if we're redirected to login page
      const currentUrl = this.page.url();

      if (this.isLoginPage(currentUrl)) {
        console.log("Login required. Attempting to login...");
        const loginSuccess = await this.performLogin();

        if (loginSuccess) {
          console.log("Login successful. Redirecting to profile...");
          // Navigate back to the intended profile page
          await this.page.goto(
            `https://www.linkedin.com/in/${this.userData.username}`,
            {
              waitUntil: "networkidle",
            }
          );
        } else {
          console.error("Login failed");
          return false;
        }
      } else {
        console.log("Already logged in or profile accessible");
      }

      return true;
    } catch (error) {
      console.error("Error during navigation and login:", error);
      return false;
    }
  }

  isLoginPage(url) {
    // Check if current URL indicates we're on a login page
    return (
      url.includes("/login") ||
      url.includes("/uas/login") ||
      url.includes("/checkpoint") ||
      url === "https://www.linkedin.com/" ||
      url.includes("/authwall")
    );
  }

  async performLogin() {
    try {
      // Wait for login form elements to be visible
      await this.page.waitForSelector("#email-or-phone", { timeout: 10000 });

      this.page.click("button:has-text('Sign in')");

      await this.page.waitForSelector("#session_key", { timeout: 10000 });

      // Clear and fill username
      const { email } = this.userData.email_account;
      console.log("Entering username...");
      await this.page.fill("#session_key", email);

      // Clear and fill password
      console.log("Entering password...");
      await this.page.fill("#session_password", this.userData.password);

      // Add a small delay to mimic human behavior
      await this.page.waitForTimeout(1000);

      // Click the sign in button
      console.log("Clicking sign in button...");
      await this.page.getByRole("button", { name: "Sign in" }).click();

      // Wait for navigation or handle potential challenges
      await this.page.waitForTimeout(3000);

      // Check for various post-login scenarios
      const currentUrl = this.page.url();

      // Handle 2FA/verification if present
      // if (await this.handleTwoFactorAuth()) {
      //   console.log("2FA handled successfully");
      // }

      // Handle email verification if present
      // if (await this.handleEmailVerification()) {
      //   console.log("Email verification handled");
      // }

      // Wait for final redirect
      await this.page.waitForTimeout(2000);

      // Check if login was successful
      const finalUrl = this.page.url();
      const loginSuccessful =
        !this.isLoginPage(finalUrl) &&
        !finalUrl.includes("/challenge") &&
        !finalUrl.includes("/checkpoint");

      if (loginSuccessful) {
        console.log("Login completed successfully");
        return true;
      } else {
        console.error("Login may have failed. Current URL:", finalUrl);
        return false;
      }
    } catch (error) {
      console.error("Error during login process:", error);
      return false;
    }
  }

  getPage() {
    return this.page;
  }

  async close() {
    try {
      // Save storage state (also needs context to be alive)
      await this.saveState();

      await this.context?.close();

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.context = null;
        this.page = null;
      }

      return true;
    } catch (error) {
      console.error("Error closing browser:", error);
      return false;
    }
  }

  async getState() {
    if (!this.context) {
      console.error("Context not initialized");
      return false;
    }
    const state = await this.context.storageState();
    return state;
  }

  async saveState() {
    if (!this.context) {
      console.error("Context not initialized");
      return false;
    }

    // Save storage state
    await this.context.storageState({ path: "state.json" });
    return true;
  }
}
