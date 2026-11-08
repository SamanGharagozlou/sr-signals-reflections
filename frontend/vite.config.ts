
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Use the Vercel deployment target when building on Vercel.
  nitro: process.env.VERCEL ? { preset: "vercel" } : true,

  tanstackStart: {
    // Preserve our existing server entry.
    server: { entry: "server" },
  },

  vite: {
    server: {
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8765",
          changeOrigin: true,
        },
      },
    },
    optimizeDeps: {
      include: [
        "sonner",
        "lucide-react",
        "@radix-ui/react-alert-dialog",
        "@radix-ui/react-slot",
        "class-variance-authority",
        "clsx",
        "tailwind-merge",
      ],
    },
  },
});
