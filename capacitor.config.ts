import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.getoutof.trajectry",
  appName: "Trajectry",
  webDir: "dist",
  backgroundColor: "#07080f",
  ios: {
    contentInset: "never",
    backgroundColor: "#07080f",
  },
  android: {
    backgroundColor: "#07080f",
    allowMixedContent: false,
  },
};

export default config;
