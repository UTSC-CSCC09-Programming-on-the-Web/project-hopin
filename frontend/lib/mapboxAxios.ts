import axios from "axios";
import { Location } from "../contexts/MapContext";

const mapboxAxios = axios.create({
  baseURL: "https://api.mapbox.com/directions/v5/mapbox/driving",
  timeout: 10000,
  params: {
    geometries: "geojson",
    access_token: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
  },
});

export const fetchMapboxDirections = async (
  start: Location,
  end: Location
): Promise<any> => {
  const url = `/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?steps=true`;
  mapboxAxios.get(url).then((response) => {
    if (
      !response.data ||
      !response.data.routes ||
      response.data.routes.length === 0
    ) {
      throw new Error("No route found");
    }

    return response.data.routes[0];
  });
};
