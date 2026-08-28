import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    viewportHeight: 800, // equivalent to cy.viewport("macbook-13")
    viewportWidth: 1280, // equivalent to cy.viewport("macbook-13")
    setupNodeEvents(_on, _config) {
      // implement node event listeners here
    },
  },
});
