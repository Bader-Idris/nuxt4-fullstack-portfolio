export const useCapacitorDeviceAndBatteryInfo = async () => {
  if (!import.meta.client) return false;

  const { Device } = await import("@capacitor/device");
  const deviceInfo = await Device.getInfo();
  const batteryInfo = await Device.getBatteryInfo();

  // Create a single object to hold the relevant information
  return {
    name: deviceInfo.name,
    model: deviceInfo.model,
    platform: deviceInfo.platform,
    operatingSystem: deviceInfo.operatingSystem,
    osVersion: deviceInfo.osVersion,
    iOSVersion: deviceInfo.iOSVersion,
    androidSDKVersion: deviceInfo.androidSDKVersion,
    manufacturer: deviceInfo.manufacturer,
    isVirtual: deviceInfo.isVirtual,
    memUsed: deviceInfo.memUsed,
    webViewVersion: deviceInfo.webViewVersion,
    batteryLevel: batteryInfo.batteryLevel,
    isCharging: batteryInfo.isCharging,
  };
};

// deviceDetailsAndBatteryStatus = await useCapacitorDeviceAndBatteryInfo();