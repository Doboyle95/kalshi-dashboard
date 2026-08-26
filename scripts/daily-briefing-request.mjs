export const MAX_INSIGHTS_QUESTION_CHARS = 32_000;

export function apiErrorMessage(body) {
  if (body?.error) return String(body.error);

  const detail = body?.detail;
  if (typeof detail === "string" && detail.trim()) return detail.trim();
  if (Array.isArray(detail) && detail.length) {
    return detail.map((item) => {
      const location = Array.isArray(item?.loc) ? item.loc.join(".") : "";
      const message = String(item?.msg || item?.type || "validation error");
      return location ? `${location}: ${message}` : message;
    }).join("; ");
  }

  return "unknown error";
}

export function assertInsightsQuestionLength(question) {
  if (question.length > MAX_INSIGHTS_QUESTION_CHARS) {
    throw new Error(
      `/insights question is ${question.length.toLocaleString("en-US")} characters; ` +
      `the API contract allows ${MAX_INSIGHTS_QUESTION_CHARS.toLocaleString("en-US")}`
    );
  }
}
