import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.motionos.app",
  appName: "Motion OS",
  webDir: "dist",
  android: {
    backgroundColor: "#000000",
  },
  plugins: {
    StatusBar: {
      style: "DARK",
      backgroundColor: "#000000",
    },
    Keyboard: {
      resize: "body",
    },
  },
};

export default config;
