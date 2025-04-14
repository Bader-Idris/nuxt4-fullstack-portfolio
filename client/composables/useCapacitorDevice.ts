export const useCapacitorDevice = async () => {
  if (!import.meta.client) return false; // TODO: or only return ??
  const { Device } = await import("@capacitor/device");
  const info = await Device.getInfo();
  return info.platform !== "web";
};

// const isCapacitorDevice = useCapacitorDevice()
// if (await isCapacitorDevice) 

// TODO: capacitor has: isNativePlatform: () => boolean;