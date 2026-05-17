import { FetchError } from "ofetch";

interface ApiErrorData {
  statusMessage?: string;
}

/**
 * Composable to extract a user-friendly error message from an API error.
 * @returns An object with a function to get the friendly error message.
 */
export const useApiError = () => {
  const getFriendlyErrorMessage = (error: any): string => {
    // Specifically handle Nuxt's FetchError
    if (error instanceof FetchError) {
      const apiError = error.data as ApiErrorData;
      if (apiError && typeof apiError.statusMessage === "string") {
        return apiError.statusMessage;
      }
    }

    // Fallback for standard JavaScript Error objects
    if (error instanceof Error) {
      return error.message;
    }

    // Generic fallback message
    return "An unexpected error occurred. Please try again.";
  };

  return { getFriendlyErrorMessage };
};