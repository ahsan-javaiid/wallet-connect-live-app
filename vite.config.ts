import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    sourcemap: true, // Source map generation must be turned on
  },
  plugins: [
    tsconfigPaths(),
    react(),
    // react({
    //   include: /\.(jsx|tsx)$/,
    //   babel: {
    //     plugins: ["styled-components"],
    //     babelrc: false,
    //     configFile: false,
    //   },
    // }),
    // Put the Sentry vite plugin after all other plugins
    sentryVitePlugin({
      org: "ledger",
      project: "wallet-connect-live-app",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // env: process.env.NODE_ENV,
    }),
  ],
  // resolve: {
  //   "@ledgerhq/react-ui": path.join(
  //     path.dirname(require.resolve("@ledgerhq/react-ui/package.json")),
  //     "lib"
  //   ),
  // },
});
