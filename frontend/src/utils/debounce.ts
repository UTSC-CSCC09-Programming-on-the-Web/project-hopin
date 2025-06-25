/**
 * Creates a debounced function that delays invoking the provided callback
 * until after the specified wait time has elapsed since the last time
 * the debounced function was invoked.
 *
 * Useful for implementing behavior that should only happen after a repeated
 * action has completed (e.g., typing, scrolling, window resizing).
 *
 * @param callback - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns A debounced version of the original function
 *
 * @example
 * // Create a debounced version of a search function
 * const debouncedSearch = debounce((query) => {
 *   fetchSearchResults(query);
 * }, 300);
 *
 * // Call it in an input handler
 * searchInput.addEventListener('input', (e) => {
 *   debouncedSearch(e.target.value);
 * });
 */
const debounce = (callback: Function, wait: number) => {
  let timeoutId: number | null = null;
  return (...args: any[]) => {
    window.clearTimeout(timeoutId!);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, wait);
  };
};

export default debounce;
