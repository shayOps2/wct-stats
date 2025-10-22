// Utility functions for Matches page

export function extractTimeFromVideoURL(videoURL) {
  const timeRegex = /[?&]t=(\d+)h(\d+)m(\d+)s/;
  const match = videoURL.match(timeRegex);
  if (match) {
    return {
      hour: parseInt(match[1], 10),
      minute: parseInt(match[2], 10),
      second: parseInt(match[3], 10),
    };
  }
  return { hour: 0, minute: 0, second: 0 };
}

export function formatDateForInput(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-CA');
}

export function formatDateForDisplay(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateForAPI(dateString) {
  const date = new Date(dateString);
  date.setUTCHours(12, 0, 0, 0);
  return date.toISOString();
}
