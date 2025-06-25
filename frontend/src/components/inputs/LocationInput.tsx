"use client";

import { useState, useEffect } from "react";
import debounce from "../../utils/debounce";
import { fetchMapboxPlaces } from "../../../lib/placesAPI";
import Input from "./Input";

type Feature = {
  id: string;
  place_name: string;
  center: [number, number];
};
type AutocompleteInputProps = {
  defaultValue?: string;
  placeholder: string;
  onSelect: (coords: [number, number]) => void;
};

export default function AutocompleteInput({
  defaultValue,
  placeholder,
  onSelect,
}: AutocompleteInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Feature[]>([]);

  useEffect(() => {
    if (defaultValue) {
      setQuery(defaultValue);
    }
  }, [defaultValue]);

  const fetchSuggestions = debounce(async (query: string) => {
    if (!query) {
      setResults([]);
      return;
    }

    fetchMapboxPlaces(query).then((data) => {
      if (data && data.features) {
        setResults(data.features);
      }
    });
  }, 300);

  useEffect(() => {
    fetchSuggestions(query);
  }, [query]);

  return (
    <div className="relative">
      <Input
        name="location"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {results.length > 0 && (
        <ul className="absolute z-20 bg-white border rounded w-full mt-1 max-h-40 overflow-y-auto">
          {results.map((place) => (
            <li
              key={place.id}
              className="p-2 hover:bg-gray-200 cursor-pointer text-base"
              onClick={() => {
                onSelect(place.center);
                setQuery(place.place_name);
                setResults([]);
              }}
            >
              {place.place_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
