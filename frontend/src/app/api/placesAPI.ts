export const fetchMapboxPlaces = (query: string): Promise<any> => {
  if (!query) return Promise.resolve([]);

  return fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query
    )}.json?autocomplete=true&limit=5&access_token=${
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    }`
  ).then((res) => {
    if (!res.ok) {
      throw new Error("Failed to fetch places");
    }
    return res.json();
  });
};
