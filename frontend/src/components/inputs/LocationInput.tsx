"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from "react";
import debounce from "../../utils/debounce";
import { fetchMapboxPlaces } from "@/lib/apis/placesAPI";
import Input from "./Input";
import { Place } from "@/types/location";
import { clearRoute } from "@/stores/MapStore";

type Feature = {
  id: string;
  place_name: string;
  center: [number, number];
  text: string;
};

type AutocompleteInputProps = {
  placeholder: string;
  onSelect: (result: Place) => void;
};

export type LocationInputRef = {
  reset: () => void;
};

const LocationInput = forwardRef<LocationInputRef, AutocompleteInputProps>(
  ({ placeholder, onSelect }, ref) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Feature[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
    const isSelectionInProgress = useRef(false);
    const resultsRef = useRef<HTMLUListElement>(null);

    // Expose reset function to parent component
    useImperativeHandle(ref, () => ({
      reset: () => {
        setQuery("");
        setResults([]);
        setHighlightedIndex(-1);
        isSelectionInProgress.current = false;
        clearRoute("user"); // Clear user route when resetting
      },
    }));

    const debouncedFetchSuggestions = useMemo(
      () =>
        debounce(async (searchQuery: string) => {
          if (!searchQuery) {
            setResults([]);
            return;
          }

          try {
            const data = await fetchMapboxPlaces(searchQuery);
            if (data?.features) {
              setResults(data.features);
            }
          } catch (error) {
            console.error("Error fetching places:", error);
            setResults([]);
          }
        }, 300),
      []
    );

    useEffect(() => {
      if (isSelectionInProgress.current) {
        isSelectionInProgress.current = false;
        return;
      }
      debouncedFetchSuggestions(query);
    }, [query, debouncedFetchSuggestions]);

    const handleSelect = (place: Feature) => {
      isSelectionInProgress.current = true;

      const selectedResult: Place = {
        id: place.id,
        color: "#f28cb1", // Default color
        location: {
          longitude: place.center[0],
          latitude: place.center[1],
        },
        address: place.place_name,
        name: place.text,
      };

      console.log("handleSelect called with:", selectedResult);
      onSelect(selectedResult);
      setQuery(place.place_name);
      setResults([]);
      setHighlightedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && highlightedIndex >= 0) {
        handleSelect(results[highlightedIndex]);
      } else if (e.key === "Escape") {
        setResults([]);
        setHighlightedIndex(-1);
      }
    };

    return (
      <div className="relative w-full">
        <Input
          name="location"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Close results after a short delay to allow onClick to fire
            setTimeout(() => setResults([]), 100);
          }}
        />

        {results.length > 0 && (
          <ul
            ref={resultsRef}
            className="absolute z-20 bg-white border border-gray-300 rounded-md shadow-lg w-full mt-1 max-h-48 overflow-y-auto"
          >
            {results.map((place, index) => (
              <li
                key={place.id}
                onClick={() => handleSelect(place)}
                className={`px-4 py-2 cursor-pointer text-sm ${
                  highlightedIndex === index
                    ? "bg-gray-200"
                    : "hover:bg-gray-100"
                }`}
              >
                {place.place_name}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);

LocationInput.displayName = "LocationInput";

export default LocationInput;
