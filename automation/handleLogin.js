
/************** */
// Currenlty not using this file all the automation code is in main.js file 
// need to refactor

/************* */


import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { config } from "dotenv";
import { chromePath } from "./chromePath.js";

config();

export const performLogin = async () => {
    try {
      // Wait for login form elements to be visible
      await this.page.waitForSelector('#username', { timeout: 10000 });
      
      // Clear and fill username
      console.log("Entering username...");
      await this.page.fill('#username', mukulkumar007);
      
      // Clear and fill password
      console.log("Entering password...");
      await this.page.fill('#password', anyrandompassword);
      
      // Add a small delay to mimic human behavior
      await this.page.waitForTimeout(1000);
      
      // Click the sign in button
      console.log("Clicking sign in button...");
      await this.page.click('button[type="submit"]');
      
      // Wait for navigation or handle potential challenges
      await this.page.waitForTimeout(3000);
      
      // Check for various post-login scenarios
      const currentUrl = this.page.url();
      
      // Handle 2FA/verification if present
      if (await this.handleTwoFactorAuth()) {
        console.log("2FA handled successfully");
      }
      
      // Handle email verification if present
      if (await this.handleEmailVerification()) {
        console.log("Email verification handled");
      }
      
      // Wait for final redirect
      await this.page.waitForTimeout(2000);
      
      // Check if login was successful
      const finalUrl = this.page.url();
      const loginSuccessful = !this.isLoginPage(finalUrl) && 
                             !finalUrl.includes('/challenge') &&
                             !finalUrl.includes('/checkpoint');
      
      if (loginSuccessful) {
        console.log("Login completed successfully");
        return true;
      } else {
        console.error("Login may have failed. Current URL:", finalUrl);
        return false;
      }
      
    } catch (error) {
      console.error("Error during login process:", error);
      
      // Take a screenshot for debugging
      try {
        await this.page.screenshot({ path: 'login_error.png', fullPage: true });
        console.log("Screenshot saved as login_error.png");
      } catch (screenshotError) {
        console.error("Failed to take screenshot:", screenshotError);
      }
      
      return false;
    }
}

export const navigateAndLogin = async () => {
	try {
        await this.page.goto(`https://www.linkedin.com/in/${this.userData.username}`, { 
            waitUntil: 'networkidle' 
        });

        await this.page.waitForTimeout(2000);

        const currentUrl = this.page.url();

        if (this.isLoginPage(currentUrl)) {
        console.log("Login required. Attempting to login...");
        const loginSuccess = await this.performLogin();
        
        if (loginSuccess) {
          console.log("Login successful. Redirecting to profile...");
          // Navigate back to the intended profile page
          await this.page.goto(`https://www.linkedin.com/in/${this.userData.username}`, { 
            waitUntil: 'networkidle' 
          });
        } else {
          console.error("Login failed");
          return false;
        }
      } else {
        console.log("Already logged in or profile accessible");
      }

      return true;
    } 
    catch (error) {
      console.error("Error during navigation and login:", error);
      return false;
    }
};

export const isLoginPage = (url) => {
    // Check if current URL indicates we're on a login page
    return url.includes('/login') || 
           url.includes('/uas/login') ||
           url.includes('/checkpoint') ||
           url === 'https://www.linkedin.com/' ||
           url.includes('/authwall');
};