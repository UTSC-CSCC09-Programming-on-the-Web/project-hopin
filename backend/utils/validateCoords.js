export const validateCoordinates = (coords) => {
  if (
    !coords ||
    typeof coords !== "object" ||
    !("latitude" in coords) ||
    !("longitude" in coords)
  ) {
    return {
      valid: false,
      error:
        "Coordinates must be an object with 'latitude' and 'longitude' properties",
    };
  }
  const { latitude, longitude } = coords;
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return {
      valid: false,
      error: "Coordinates 'latitude' and 'longitude' must be numbers",
    };
  }
  if (
    isNaN(latitude) ||
    isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return {
      valid: false,
      error:
        "Coordinates 'latitude' must be between -90 and 90, and 'longitude' must be between -180 and 180",
    };
  }

  return { valid: true };
};
