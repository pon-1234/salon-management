type ErrorContext = {
  [key: string]: string | number | boolean;
};

export function logError(error: Error, options?: { context?: ErrorContext }) {
  console.error('Error occurred:', error.message);
  
  if (options?.context) {
    console.error('Error context:', options.context);
  }
  
  console.error('Stack trace:', error.stack);

  // Here you can add more advanced error logging logic,
  // such as sending the error to a server or a third-party error tracking service
}
