import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    // Define global constants replacement
    define: {
      "process.env.REACT_APP_API_URL": JSON.stringify(env.REACT_APP_API_URL),
      // Fallback for other process.env usage if any, but specific is safer.
      "process.env": {},
    },
    server: {
      port: 3000,
      open: true,
    },
    build: {
      outDir: "build",
    },
    resolve: {
      alias: {
        src: "/src",
      },
    },
  };
});
